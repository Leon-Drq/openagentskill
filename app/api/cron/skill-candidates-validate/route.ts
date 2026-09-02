import { NextRequest, NextResponse } from 'next/server'
import { runCandidateValidationBatch } from '@/lib/indexer/candidate-intake'
import { recordIndexerRun } from '@/lib/indexer/run-log'
import { isAutomationAuthorized } from '@/lib/security/route-auth'

export const runtime = 'nodejs'
export const maxDuration = 300

async function handleRun(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['CRON_SECRET', 'INDEXER_SECRET', 'INDEXER_TRIGGER_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (process.env.CANDIDATE_PIPELINE_DISABLED === 'true') {
    return NextResponse.json({ success: true, skipped: true, reason: 'Candidate pipeline is disabled by configuration.' })
  }
  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'GITHUB_TOKEN is required for high-volume validation; no unauthenticated GitHub requests were sent.',
    })
  }
  const startedAt = new Date().toISOString()
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
  const requested = Number(body.limit ?? request.nextUrl.searchParams.get('limit') ?? process.env.CANDIDATE_VALIDATION_LIMIT ?? 120)
  const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.floor(requested), 1), 250) : 120
  try {
    const result = await runCandidateValidationBatch(limit)
    await recordIndexerRun({
      mode: 'candidate-validation',
      status: result.rateLimited ? 'rate-limited' : result.errors > 0 ? 'completed-with-errors' : 'completed',
      started_at: startedAt,
      target_new: limit,
      candidates_found: result.claimed,
      imported: result.fastTrack + result.reviewRequired,
      updated: result.processed,
      errors: result.errors,
      metadata: {
        stage: 'validation',
        expanded: result.expanded,
        fast_track: result.fastTrack,
        review_required: result.reviewRequired,
        duplicates: result.duplicates,
        rejected: result.rejected,
        rate_limited: result.rateLimited,
        time_budget_reached: result.timeBudgetReached,
      },
    })

    return NextResponse.json({
      success: !result.rateLimited && result.errors === 0,
      mode: 'candidate-light-validation',
      result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Candidate validation failed'
    await recordIndexerRun({
      mode: 'candidate-validation',
      status: 'failed',
      started_at: startedAt,
      target_new: limit,
      errors: 1,
      metadata: { stage: 'validation', error: message.slice(0, 1000) },
    })
    console.error('[candidate-validation]', error)
    return NextResponse.json({ success: false, mode: 'candidate-light-validation', error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}
