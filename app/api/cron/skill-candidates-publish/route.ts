import { NextRequest, NextResponse } from 'next/server'
import { buildIndexNowUrlsForSkill, submitIndexNowUrls } from '@/lib/indexnow'
import { runCandidatePublicationBatch } from '@/lib/indexer/candidate-intake'
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
  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'GITHUB_TOKEN is required for candidate publication; no unauthenticated GitHub requests were sent.',
    })
  }
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
  const fastTrackLimit = boundedInt(body.fastTrackLimit ?? process.env.CANDIDATE_FAST_TRACK_LIMIT, 20, 1, 50)
  const aiReviewLimit = boundedInt(body.aiReviewLimit ?? process.env.CANDIDATE_AI_REVIEW_LIMIT, 21, 0, 25)
  const result = await runCandidatePublicationBatch({ fastTrackLimit, aiReviewLimit })
  const indexing = await submitIndexNowUrls(result.slugs.flatMap(buildIndexNowUrlsForSkill))

  return NextResponse.json({
    success: !result.rateLimited && result.errors === 0,
    mode: 'candidate-publication',
    result,
    indexing,
  })
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}
