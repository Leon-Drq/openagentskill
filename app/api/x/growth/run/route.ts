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
  return NextResponse.json({ success: !hasError, ...result }, { status: hasError ? 207 : 200 })
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}
