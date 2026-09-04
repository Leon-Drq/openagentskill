import { NextRequest, NextResponse } from 'next/server'
import { enqueueRepositoryCandidates } from '@/lib/indexer/candidate-intake'
import { searchHotSkillRepos } from '@/lib/indexer/hot-skill-discovery'
import { AUTOMATIC_DISCOVERY_MIN_STARS } from '@/lib/indexer/intake-policy'
import { recordIndexerRun } from '@/lib/indexer/run-log'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { refreshRegistryCoverageStats } from '@/lib/registry-coverage'

export const runtime = 'nodejs'
export const maxDuration = 300

function boundedInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.floor(parsed), min), max) : fallback
}

async function handleRun(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['CRON_SECRET', 'INDEXER_SECRET', 'INDEXER_TRIGGER_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (process.env.CANDIDATE_PIPELINE_DISABLED === 'true') {
    return NextResponse.json({ success: true, skipped: true, reason: 'Candidate pipeline is disabled by configuration.' })
  }

  const startedAt = new Date().toISOString()
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
  const limit = boundedInt(body.limit ?? process.env.CANDIDATE_DISCOVERY_LIMIT, 2_000, 1, 2_000)
  const maxQueries = boundedInt(body.maxQueries ?? process.env.CANDIDATE_DISCOVERY_MAX_QUERIES, 22, 1, 22)
  const perPage = boundedInt(body.perPage ?? process.env.CANDIDATE_DISCOVERY_PER_PAGE, 100, 5, 100)
  const minStars = boundedInt(
    body.minStars ?? process.env.CANDIDATE_DISCOVERY_MIN_STARS,
    AUTOMATIC_DISCOVERY_MIN_STARS,
    AUTOMATIC_DISCOVERY_MIN_STARS,
    100_000
  )
  const lookbackDays = boundedInt(body.lookbackDays ?? process.env.CANDIDATE_DISCOVERY_LOOKBACK_DAYS, 90, 1, 90)
  const hourlyWindow = Math.floor(Date.now() / 3_600_000)
  try {
    const discovery = await searchHotSkillRepos({
      limit,
      maxQueries,
      perPage,
      minStars,
      lookbackDays,
      queryOffset: hourlyWindow * maxQueries,
    })
    const intake = await enqueueRepositoryCandidates(discovery.candidates, 'github-candidate-discovery')
    const coverage = await refreshRegistryCoverageStats()

    await recordIndexerRun({
      mode: 'candidate-discovery',
      status: discovery.rateLimited ? 'rate-limited' : 'completed',
      started_at: startedAt,
      target_new: limit,
      min_stars: minStars,
      max_search_requests: maxQueries,
      search_requests: discovery.searchedQueries,
      candidates_found: discovery.candidates.length,
      skipped_existing: intake.duplicates,
      imported: intake.inserted,
      errors: discovery.rateLimited ? 1 : 0,
      metadata: {
        stage: 'discovery',
        below_star_floor: intake.belowStarFloor,
        lookback_days: lookbackDays,
        per_page: perPage,
        rate_limited: discovery.rateLimited,
        retry_after_ms: discovery.retryAfterMs,
        coverage_refreshed: coverage.refreshed,
      },
    })

    return NextResponse.json({
      success: !discovery.rateLimited,
      mode: 'candidate-discovery',
      discovery: {
        searched_queries: discovery.searchedQueries,
        candidates: discovery.candidates.length,
        min_stars: discovery.minStars,
        since: discovery.since,
        rate_limited: discovery.rateLimited,
        retry_after_ms: discovery.retryAfterMs,
      },
      intake,
      coverage,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Candidate discovery failed'
    await recordIndexerRun({
      mode: 'candidate-discovery',
      status: 'failed',
      started_at: startedAt,
      target_new: limit,
      min_stars: minStars,
      max_search_requests: maxQueries,
      errors: 1,
      metadata: { stage: 'discovery', error: message.slice(0, 1000) },
    })
    console.error('[candidate-discovery]', error)
    return NextResponse.json({ success: false, mode: 'candidate-discovery', error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}
