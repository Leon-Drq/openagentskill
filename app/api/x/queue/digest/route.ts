import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { enqueueXDigestPostQueue } from '@/lib/x/growth'

function parsePositive(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function handleDigest(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
  const minStars = parsePositive(request.nextUrl.searchParams.get('min_stars'), Number(body.minStars) || 5000)
  const campaign = request.nextUrl.searchParams.get('campaign') || body.campaign || undefined
  const result = await enqueueXDigestPostQueue({ minStars, campaign })

  return NextResponse.json({ success: result.status === 'ready', ...result })
}

export async function GET(request: NextRequest) {
  return handleDigest(request)
}

export async function POST(request: NextRequest) {
  return handleDigest(request)
}
