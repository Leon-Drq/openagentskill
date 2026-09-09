import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { runSubmissionQueue } from '@/lib/skills/submission-worker'

export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['CRON_SECRET', 'INDEXER_SECRET'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await runSubmissionQueue(), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    console.error('[submission-queue] Queue unavailable; durable records retained')
    return NextResponse.json({ error: 'Submission queue unavailable.' }, { status: 503 })
  }
}
