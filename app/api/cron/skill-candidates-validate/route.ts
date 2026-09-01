import { NextRequest, NextResponse } from 'next/server'
import { runCandidateValidationBatch } from '@/lib/indexer/candidate-intake'
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
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
  const requested = Number(body.limit ?? request.nextUrl.searchParams.get('limit') ?? process.env.CANDIDATE_VALIDATION_LIMIT ?? 120)
  const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.floor(requested), 1), 250) : 120
  const result = await runCandidateValidationBatch(limit)

  return NextResponse.json({
    success: !result.rateLimited,
    mode: 'candidate-light-validation',
    result,
  })
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}
