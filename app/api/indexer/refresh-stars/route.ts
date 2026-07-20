import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { isAutomationAuthorized } from '@/lib/security/route-auth'

export const maxDuration = 120

// A full registry refresh now contains tens of thousands of repositories. The
// old implementation attempted to fetch and write every one in a single cron
// invocation, which guaranteed a timeout and saturated the database with
// unnecessary quality-score recalculations. Rotate a small, deterministic
// slice instead so each daily run has a fixed, predictable budget.
const DEFAULT_BATCH_SIZE = 60
const MAX_BATCH_SIZE = 120
const DEFAULT_REGISTRY_CYCLE_SIZE = 20_000
const GITHUB_REQUEST_TIMEOUT_MS = 8_000

type RefreshSkillRecord = {
  slug: string
  github_repo: string
  github_stars: number | null
  github_forks: number | null
  github_language: string | null
  github_last_pushed_at: string | null
}

type GitHubRepoMetadata = {
  stargazers_count?: number
  forks_count?: number | null
  language?: string | null
  pushed_at?: string | null
}

function isAuthorized(request: NextRequest): boolean {
  return isAutomationAuthorized(request)
}

/**
 * Fetches a rotating slice of live GitHub metadata. A bounded sweep keeps the
 * public registry responsive while still refreshing the complete catalog over
 * time. Metadata is written only when GitHub actually reports a change.
 */
function positiveInteger(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.floor(parsed), maximum)
}

function dailyRotationOffset(batchSize: number, cycleSize: number) {
  const utcDay = Math.floor(Date.now() / 86_400_000)
  return (utcDay * batchSize) % Math.max(cycleSize, batchSize)
}

function sameTimestamp(left: string | null | undefined, right: string | null | undefined) {
  if (!left && !right) return true
  const leftTime = Date.parse(left || '')
  const rightTime = Date.parse(right || '')
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime === rightTime
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function metadataChanged(
  skill: {
    github_stars: number | null
    github_forks: number | null
    github_language: string | null
    github_last_pushed_at: string | null
  },
  next: { stars: number; forks: number | null; language: string | null; pushedAt: string | null }
) {
  return (
    Number(skill.github_stars || 0) !== next.stars ||
    Number(skill.github_forks || 0) !== Number(next.forks || 0) ||
    (skill.github_language || null) !== (next.language || null) ||
    !sameTimestamp(skill.github_last_pushed_at, next.pushedAt)
  )
}

async function getRefreshBatch() {
  const batchSize = positiveInteger(process.env.GITHUB_REFRESH_BATCH_SIZE, DEFAULT_BATCH_SIZE, MAX_BATCH_SIZE)
  const cycleSize = positiveInteger(process.env.GITHUB_REFRESH_CYCLE_SIZE, DEFAULT_REGISTRY_CYCLE_SIZE, 100_000)
  const offset = dailyRotationOffset(batchSize, cycleSize)
  const supabase = createPublicClient({ requestTimeoutMs: 10_000 })

  const queryBatch = async (from: number) => {
    const { data, error } = await supabase
      .from('skills')
      .select('slug, github_repo, github_stars, github_forks, github_language, github_last_pushed_at')
      .eq('ai_review_approved', true)
      .not('github_repo', 'is', null)
      .order('slug', { ascending: true })
      .range(from, from + batchSize - 1)

    if (error) throw new Error(`Failed to fetch skill refresh batch: ${error.message}`)
    return (data || []) as RefreshSkillRecord[]
  }

  const records = await queryBatch(offset)
  // A registry may contain fewer records than the configured cycle window.
  // Wrap once rather than returning an empty refresh for the day.
  return {
    skills: records.length ? records : await queryBatch(0),
    offset,
    batchSize,
  }
}

async function refreshAllStars(): Promise<{ updated: number; unchanged: number; errors: number; scanned: number; offset: number }> {
  const serverSecret = process.env.INDEXER_SECRET
  if (!serverSecret) {
    throw new Error('Missing INDEXER_SECRET for controlled star refresh writes.')
  }

  const supabase = createPublicClient({ requestTimeoutMs: 10_000 })
  const { skills, offset } = await getRefreshBatch()
  if (!skills.length) return { updated: 0, unchanged: 0, errors: 0, scanned: 0, offset }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  }

  let updated = 0, unchanged = 0, errors = 0

  // A small concurrency keeps the daily GitHub refresh comfortably within its
  // cron budget while avoiding secondary-rate-limit bursts.
  for (let i = 0; i < skills.length; i += 5) {
    const batch = skills.slice(i, i + 5)

    await Promise.all(batch.map(async (skill) => {
      try {
        // github_repo can be "owner/repo" or full URL
        const repoPath = skill.github_repo
          .replace('https://github.com/', '')
          .replace(/\.git$/, '')
          .split('/')
          .slice(0, 2)
          .join('/')

        const res = await fetch(`https://api.github.com/repos/${repoPath}`, {
          headers,
          signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
        })
        if (!res.ok) {
          console.log(`[refresh-stars] GitHub fetch failed for ${repoPath}: ${res.status}`)
          errors++
          return
        }

        const data = await res.json() as GitHubRepoMetadata
        const newStars: number = data.stargazers_count ?? 0
        const newForks: number | null = data.forks_count ?? null
        const language: string | null = data.language ?? null
        const pushedAt: string | null = data.pushed_at ?? null

        if (!metadataChanged(skill, { stars: newStars, forks: newForks, language, pushedAt })) {
          unchanged++
          return
        }

        const { error: updateError } = await supabase.rpc('update_skill_github_metadata', {
          p_server_secret: serverSecret,
          p_slug: skill.slug,
          p_github_stars: newStars,
          p_github_forks: newForks,
          p_github_language: language,
          p_github_last_pushed_at: pushedAt,
        })

        if (updateError) throw new Error(updateError.message)

        console.log(`[refresh-stars] ${skill.slug}: ${skill.github_stars} -> ${newStars}`)
        updated++
      } catch (error: unknown) {
        console.error(`[refresh-stars] Error for ${skill.slug}:`, errorMessage(error))
        errors++
      }
    }))

    // Keep a little spacing without turning a 60-repository maintenance task
    // into a multi-minute job.
    if (i + 5 < skills.length) {
      await new Promise((r) => setTimeout(r, 150))
    }
  }

  return { updated, unchanged, errors, scanned: skills.length, offset }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return POST(request)
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[refresh-stars] Starting bounded GitHub metadata refresh...')
    const summary = await refreshAllStars()
    console.log('[refresh-stars] Complete:', summary)
    return NextResponse.json({ success: true, summary })
  } catch (error: unknown) {
    console.error('[refresh-stars] Fatal error:', error)
    return NextResponse.json({ error: 'Refresh failed', details: errorMessage(error) }, { status: 500 })
  }
}
