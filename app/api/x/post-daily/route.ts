import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { postDailySkillToX } from '@/lib/x/poster'

async function handlePost(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await postDailySkillToX()
  return NextResponse.json({ success: result.status === 'posted', ...result })
}

export async function GET(request: NextRequest) {
  return handlePost(request)
}

export async function POST(request: NextRequest) {
  return handlePost(request)
}
