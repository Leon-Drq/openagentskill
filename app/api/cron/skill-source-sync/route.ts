import { NextRequest, NextResponse } from 'next/server'
import { HIGH_SIGNAL_SKILL_SOURCES } from '@/lib/indexer/discovery-seeds'
import { syncRepositorySkills } from '@/lib/indexer/repository-skill-sync'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { createPublicClient } from '@/lib/supabase/public'

export const runtime = 'nodejs'
export const maxDuration = 300

interface SourceRequest {
  sourceUrl: string
  discoverySource: string
}

function normalizeRepositoryUrl(githubRepo: string) {
  return `https://github.com/${githubRepo.trim().replace(/^\/+|\/+$/g, '')}`
}

function uniqueSources(sources: SourceRequest[]) {
  const seen = new Set<string>()
  return sources.filter((source) => {
    const key = source.sourceUrl.trim().replace(/\/$/, '').toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function staleIndexedRepositories(limit: number): Promise<SourceRequest[]> {
  const { data, error } = await createPublicClient({ requestTimeoutMs: 12_000 })
    .from('skills')
    .select('github_repo,last_synced_at')
    .eq('ai_review_approved', true)
    .not('github_repo', 'is', null)
    .order('last_synced_at', { ascending: true, nullsFirst: true })
    .limit(Math.max(limit * 4, 20))

  if (error) {
    console.warn('[skill-source-sync] stale repository lookup failed:', error.message)
    return []
  }

  const seen = new Set<string>()
  return (data || [])
    .map((row: { github_repo?: string | null }) => row.github_repo?.trim())
    .filter((repo): repo is string => Boolean(repo) && /^[^/]+\/[^/]+$/.test(repo as string))
    .filter((repo) => {
      const key = repo.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
    .map((repo) => ({
      sourceUrl: normalizeRepositoryUrl(repo),
      discoverySource: 'incremental-repository-rescan',
    }))
}

async function handleRun(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['CRON_SECRET', 'INDEXER_SECRET', 'INDEXER_TRIGGER_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || body.limit || 8)
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 8, 1), 12)
  const requestedSources = Array.isArray(body.sources)
    ? body.sources
        .map((value: unknown) => String(value || '').trim())
        .filter(Boolean)
        .map((sourceUrl: string) => ({ sourceUrl, discoverySource: 'manual-source-sync' }))
    : []
  const staleSources = await staleIndexedRepositories(Math.max(0, limit - HIGH_SIGNAL_SKILL_SOURCES.length))
  const sources = uniqueSources([
    ...requestedSources,
    ...HIGH_SIGNAL_SKILL_SOURCES.map(({ sourceUrl, discoverySource }) => ({ sourceUrl, discoverySource })),
    ...staleSources,
  ]).slice(0, limit)

  const results = []
  for (const source of sources) {
    try {
      results.push(await syncRepositorySkills({
        reference: source.sourceUrl,
        discoverySource: source.discoverySource,
        maxSkills: source.discoverySource === 'incremental-repository-rescan' ? 6 : 4,
      }))
    } catch (error) {
      results.push({
        repository: source.sourceUrl,
        reference: source.sourceUrl,
        discovered: 0,
        processed: 0,
        created: 0,
        updated: 0,
        rejected: 0,
        errors: 1,
        truncated: false,
        entries: [],
        error: error instanceof Error ? error.message : 'Unknown skill source sync error.',
      })
    }
  }

  const summary = results.reduce((total, result) => ({
    sources: total.sources + 1,
    discovered: total.discovered + Number(result.discovered || 0),
    processed: total.processed + Number(result.processed || 0),
    created: total.created + Number(result.created || 0),
    updated: total.updated + Number(result.updated || 0),
    rejected: total.rejected + Number(result.rejected || 0),
    errors: total.errors + Number(result.errors || 0),
  }), { sources: 0, discovered: 0, processed: 0, created: 0, updated: 0, rejected: 0, errors: 0 })

  return NextResponse.json({
    success: summary.errors === 0,
    mode: 'recursive-skill-source-sync',
    summary,
    results,
  }, { status: summary.errors > 0 && summary.created === 0 && summary.updated === 0 ? 500 : 200 })
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}
