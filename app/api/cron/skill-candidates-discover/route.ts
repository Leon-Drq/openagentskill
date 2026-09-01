import { NextRequest, NextResponse } from 'next/server'
import { enqueueRepositoryCandidates } from '@/lib/indexer/candidate-intake'
import { searchHotSkillRepos } from '@/lib/indexer/hot-skill-discovery'
import { AUTOMATIC_DISCOVERY_MIN_STARS } from '@/lib/indexer/intake-policy'
import { isAutomationAuthorized } from '@/lib/security/route-auth'

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
  const discovery = await searchHotSkillRepos({
    limit,
    maxQueries,
    perPage,
    minStars,
    lookbackDays,
    queryOffset: hourlyWindow * maxQueries,
  })
  const intake = await enqueueRepositoryCandidates(discovery.candidates, 'github-candidate-discovery')

  return NextResponse.json({
    success: true,
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
  })
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}
