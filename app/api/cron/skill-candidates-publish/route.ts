import { NextRequest, NextResponse } from 'next/server'
import { buildIndexNowUrlsForSkill, submitIndexNowUrls } from '@/lib/indexnow'
import { runCandidatePublicationBatch } from '@/lib/indexer/candidate-intake'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { recordIndexerRun } from '@/lib/indexer/run-log'
import {
  PUBLICATION_AI_REVIEW_PER_RUN,
  PUBLICATION_DAILY_TARGET,
  PUBLICATION_FAST_TRACK_PER_RUN,
} from '@/lib/indexer/intake-policy'

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
  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'GITHUB_TOKEN is required for candidate publication; no unauthenticated GitHub requests were sent.',
    })
  }
  const startedAt = new Date().toISOString()
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
  const fastTrackLimit = boundedInt(
    body.fastTrackLimit ?? process.env.CANDIDATE_FAST_TRACK_LIMIT,
    PUBLICATION_FAST_TRACK_PER_RUN,
    1,
    50
  )
  const aiReviewLimit = boundedInt(
    body.aiReviewLimit ?? process.env.CANDIDATE_AI_REVIEW_LIMIT,
    PUBLICATION_AI_REVIEW_PER_RUN,
    0,
    25
  )
  const dailyTarget = boundedInt(
    body.dailyTarget ?? process.env.CANDIDATE_PUBLICATION_DAILY_TARGET,
    PUBLICATION_DAILY_TARGET,
    1,
    10_000
  )
  try {
    const result = await runCandidatePublicationBatch({ fastTrackLimit, aiReviewLimit, dailyTarget })
    const indexing = await submitIndexNowUrls(result.slugs.flatMap(buildIndexNowUrlsForSkill))

    await recordIndexerRun({
      mode: 'candidate-publication',
      status: result.rateLimited
        ? 'rate-limited'
        : result.errors > 0
          ? 'completed-with-errors'
          : result.retries > 0
            ? 'completed-with-retries'
            : 'completed',
      started_at: startedAt,
      target_new: dailyTarget,
      candidates_found: result.claimed,
      imported: result.published,
      updated: result.processed,
      errors: result.errors,
      metadata: {
        stage: 'publication',
        fast_track_claimed: result.fastTrackClaimed,
        ai_review_claimed: result.aiReviewClaimed,
        retry_claimed: result.retryClaimed,
        rejected: result.rejected,
        retries: result.retries,
        rate_limited: result.rateLimited,
        time_budget_reached: result.timeBudgetReached,
        published_last_24_hours: result.publishedLast24Hours,
        remaining_daily_target: result.remainingDailyTarget,
        target_reached: result.targetReached,
        indexnow: indexing,
      },
    })

    return NextResponse.json({
      success: !result.rateLimited && result.errors === 0,
      mode: 'candidate-publication',
      result,
      indexing,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Candidate publication failed'
    await recordIndexerRun({
      mode: 'candidate-publication',
      status: 'failed',
      started_at: startedAt,
      target_new: dailyTarget,
      errors: 1,
      metadata: { stage: 'publication', error: message.slice(0, 1000) },
    })
    console.error('[candidate-publication]', error)
    return NextResponse.json({ success: false, mode: 'candidate-publication', error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}
