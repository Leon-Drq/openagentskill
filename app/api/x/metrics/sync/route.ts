import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { syncXPostMetrics } from '@/lib/x/growth'

export const maxDuration = 60

async function handleSync(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await syncXPostMetrics()
  console.info('[x-metrics-sync]', {
    status: result.status,
    requested: result.requested,
    recorded: result.recorded,
    missing: result.missing,
  })
  return NextResponse.json({ success: result.status === 'synced', ...result })
}

export async function GET(request: NextRequest) {
  return handleSync(request)
}

export async function POST(request: NextRequest) {
  return handleSync(request)
}
