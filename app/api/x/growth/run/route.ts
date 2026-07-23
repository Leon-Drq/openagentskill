import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { runXGrowthOS } from '@/lib/x/growth'

export const maxDuration = 120

async function handleRun(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runXGrowthOS()
  const hasError = result.metrics.status === 'error' || result.replies.status === 'error'

  console.info('[x-growth-run]', {
    queue: {
      status: result.queue.status,
      queued: result.queue.queued,
      skipped: result.queue.skipped,
      considered: result.queue.considered,
    },
    digest: {
      status: result.digest.status,
      queued: result.digest.queued,
      skipped: result.digest.skipped,
      considered: result.digest.considered,
    },
    metrics: result.metrics.status,
    replies: result.replies.status,
  })

  return NextResponse.json({ success: !hasError, ...result }, { status: hasError ? 207 : 200 })
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}
