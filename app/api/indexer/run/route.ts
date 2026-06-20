import { NextRequest, NextResponse } from 'next/server'
import { searchSkillRepos, type CandidateRepo } from '@/lib/indexer/github-search'
import { processBatch, processRepo } from '@/lib/indexer/processor'
import {
  bulkImportHighStarSkills,
  HIGH_STAR_SKILL_COVERAGE_TARGET,
  resolveHighStarCoverageTarget,
} from '@/lib/indexer/high-star-import'
import { collectIndexNowUrlsFromIndexerResults, submitIndexNowUrls } from '@/lib/indexnow'
import { isAutomationAuthorized } from '@/lib/security/route-auth'

// Allow up to 5 minutes (Vercel Pro max)
export const maxDuration = 300

const DEFAULT_TARGET_NEW_PER_RUN = 250
const DEFAULT_TOKEN_SEARCH_REQUESTS = 30
const DEFAULT_DOMAIN_SEARCH_REQUESTS = 80
const MAX_TOKEN_SEARCH_REQUESTS = 120

function parsePositiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseBooleanParam(value: string | null, fallback: boolean) {
  if (value === null) return fallback
  return value === 'true' || value === '1'
}

function parseDomainsParam(value: string | null) {
  return (value || '')
    .split(',')
    .map((domain) => domain.trim())
    .filter(Boolean)
}

function parseProfileKey(value: unknown) {
  const normalized = String(value || '').trim()
  return normalized || undefined
}

function isAuthorized(request: NextRequest): boolean {
  return isAutomationAuthorized(request, ['INDEXER_SECRET', 'CRON_SECRET', 'INDEXER_TRIGGER_SECRET'])
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const mode = String(body.mode || 'bulk')
    const page = Math.max(1, Number(body.page) || 1)
    const limit = Math.min(Number(body.limit) || 20, 30)

    // Support direct URL injection: POST { "repoUrl": "https://github.com/owner/repo" }
    if (body.repoUrl) {
      const match = String(body.repoUrl).match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) {
        return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 })
      }
      const candidate: CandidateRepo = {
        owner: match[1], repo: match[2].replace(/\.git$/, ''),
        fullName: `${match[1]}/${match[2]}`,
        description: '', stars: 0, language: null,
        updatedAt: new Date().toISOString(), htmlUrl: body.repoUrl,
      }
      const result = await processRepo(candidate)
      const indexing = result.slug && result.status === 'indexed'
        ? await submitIndexNowUrls(collectIndexNowUrlsFromIndexerResults([result])).catch((error) => ({
            skipped: false,
            success: false,
            status: null,
            submitted: [],
            message: error instanceof Error ? error.message : 'IndexNow submission failed.',
          }))
        : null
      return NextResponse.json({ success: true, summary: { found: 1, indexed: result.status === 'indexed' ? 1 : 0, rejected: result.status === 'rejected' ? 1 : 0, skipped: result.status === 'skipped' ? 1 : 0, errors: result.status === 'error' ? 1 : 0 }, results: [result], indexing })
    }

    if (mode !== 'reviewed') {
      const targetNew = Math.min(Math.max(Number(body.targetNew) || DEFAULT_TARGET_NEW_PER_RUN, 1), 1000)
      const targetTotal = resolveHighStarCoverageTarget(Number(body.targetTotal) || HIGH_STAR_SKILL_COVERAGE_TARGET)
      const minStars = Math.max(Number(body.minStars) || 500, 100)
      const maxStaleDays = Math.max(Number(body.maxStaleDays) || 1460, 30)
      const strictQuality = body.strictQuality === undefined ? true : Boolean(body.strictQuality)
      const includeCollections = body.includeCollections === true
      const profileKey = parseProfileKey(body.profileKey || body.profile)
      const domains = Array.isArray(body.domains)
        ? body.domains.map((domain: unknown) => String(domain)).filter(Boolean)
        : body.domain
          ? [String(body.domain)]
          : []
      const defaultSearchRequests = domains.length > 0 ? DEFAULT_DOMAIN_SEARCH_REQUESTS : DEFAULT_TOKEN_SEARCH_REQUESTS
      const maxSearchRequests = Math.min(
        Math.max(Number(body.maxSearchRequests) || (process.env.GITHUB_TOKEN ? defaultSearchRequests : 10), 1),
        process.env.GITHUB_TOKEN ? MAX_TOKEN_SEARCH_REQUESTS : 10
      )
      const pageSeed =
        body.pageSeed === undefined ? undefined : Math.max(0, Number(body.pageSeed) || 0)

      console.log(
        `[indexer] Skill-only high-star import — targetNew=${targetNew}, targetTotal=${targetTotal}, minStars=${minStars}, maxSearchRequests=${maxSearchRequests}, domains=${domains.join(',') || 'all'}`
      )
      const result = await bulkImportHighStarSkills({
        profileKey,
        targetNew,
        targetTotal,
        minStars,
        maxSearchRequests,
        pageSeed,
        domains,
        maxStaleDays,
        strictQuality,
        includeCollections,
        duplicateRecoverySearchRequests: Math.max(Number(body.duplicateRecoverySearchRequests) || 0, 0),
      })
      console.log('[indexer] Bulk import complete:', result.summary)
      const indexingUrls = collectIndexNowUrlsFromIndexerResults(result.results)
      const indexing = await submitIndexNowUrls(indexingUrls).catch((error) => ({
        skipped: false,
        success: false,
        status: null,
        submitted: indexingUrls,
        message: error instanceof Error ? error.message : 'IndexNow submission failed.',
      }))
      console.log('[indexer] IndexNow submission complete:', {
        success: indexing.success,
        submitted: indexing.submitted.length,
        skipped: indexing.skipped,
      })
      return NextResponse.json({ success: true, mode: 'bulk', ...result, indexing })
    }

    console.log(`[indexer] Starting — page=${page}, limit=${limit}`)

    // 1. Search GitHub
    const candidates = await searchSkillRepos(page, limit)
    console.log(`[indexer] Found ${candidates.length} candidates from GitHub`)

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, summary: { found: 0, indexed: 0, rejected: 0, skipped: 0, errors: 0 }, results: [] })
    }

    // 2. Process each repo (duplicate check is inside processRepo)
    const results = await processBatch(candidates, 2)

    const summary = {
      found: candidates.length,
      indexed: results.filter(r => r.status === 'indexed').length,
      rejected: results.filter(r => r.status === 'rejected').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
    }

    console.log('[indexer] Run complete:', summary)
    const indexingUrls = collectIndexNowUrlsFromIndexerResults(results)
    const indexing = await submitIndexNowUrls(indexingUrls).catch((error) => ({
      skipped: false,
      success: false,
      status: null,
      submitted: indexingUrls,
      message: error instanceof Error ? error.message : 'IndexNow submission failed.',
    }))
    return NextResponse.json({ success: true, summary, results, indexing })

  } catch (error: any) {
    console.error('[indexer] Fatal error:', error)
    return NextResponse.json({ error: 'Indexer failed', details: error.message }, { status: 500 })
  }
}

// GET is called by Vercel Cron
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const params = request.nextUrl.searchParams
  const domains = parseDomainsParam(params.get('domains') || params.get('domain'))
  const profileKey = parseProfileKey(params.get('profileKey') || params.get('profile'))
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        mode: 'bulk',
        targetNew: Math.max(
          parsePositiveNumber(params.get('targetNew'), parsePositiveNumber(process.env.INDEXER_RUN_TARGET, DEFAULT_TARGET_NEW_PER_RUN)),
          DEFAULT_TARGET_NEW_PER_RUN
        ),
        targetTotal: resolveHighStarCoverageTarget(
          parsePositiveNumber(params.get('targetTotal'), parsePositiveNumber(process.env.INDEXER_TARGET_TOTAL, HIGH_STAR_SKILL_COVERAGE_TARGET))
        ),
        minStars: parsePositiveNumber(params.get('minStars'), parsePositiveNumber(process.env.INDEXER_MIN_STARS, 500)),
        maxSearchRequests: parsePositiveNumber(
          params.get('maxSearchRequests'),
          parsePositiveNumber(process.env.INDEXER_MAX_SEARCH_REQUESTS, process.env.GITHUB_TOKEN ? DEFAULT_TOKEN_SEARCH_REQUESTS : 10)
        ),
        duplicateRecoverySearchRequests: parsePositiveNumber(params.get('duplicateRecoverySearchRequests'), 0),
        maxStaleDays: parsePositiveNumber(params.get('maxStaleDays'), parsePositiveNumber(process.env.INDEXER_MAX_STALE_DAYS, 1460)),
        strictQuality: parseBooleanParam(params.get('strictQuality'), process.env.INDEXER_STRICT_QUALITY === 'false' ? false : true),
        includeCollections: parseBooleanParam(params.get('includeCollections'), process.env.INDEXER_INCLUDE_COLLECTIONS === 'true'),
        ...(profileKey ? { profileKey } : {}),
        ...(domains.length > 0 ? { domains } : {}),
        ...(params.get('pageSeed') ? { pageSeed: parsePositiveNumber(params.get('pageSeed'), 0) } : {}),
      }),
    })
  )
}
