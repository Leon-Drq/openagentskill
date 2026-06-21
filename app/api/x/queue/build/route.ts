import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { enqueueXSkillPostQueue } from '@/lib/x/growth'

function parsePositive(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function handleBuild(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
  const limit = parsePositive(request.nextUrl.searchParams.get('limit'), Number(body.limit) || 10)
  const minStars = parsePositive(request.nextUrl.searchParams.get('min_stars'), Number(body.minStars) || 500)
  const campaign = request.nextUrl.searchParams.get('campaign') || body.campaign || 'daily_skill'

  const result = await enqueueXSkillPostQueue({ limit, minStars, campaign })
  return NextResponse.json({ success: result.status === 'ready', ...result })
}

export async function GET(request: NextRequest) {
  return handleBuild(request)
}

export async function POST(request: NextRequest) {
  return handleBuild(request)
}
