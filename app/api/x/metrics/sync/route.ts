import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { syncXPostMetrics } from '@/lib/x/growth'

function parsePositive(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function handleSync(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = parsePositive(request.nextUrl.searchParams.get('limit'), 50)
  const result = await syncXPostMetrics({ limit })
  return NextResponse.json({ success: result.status === 'synced', ...result })
}

export async function GET(request: NextRequest) {
  return handleSync(request)
}

export async function POST(request: NextRequest) {
  return handleSync(request)
}
