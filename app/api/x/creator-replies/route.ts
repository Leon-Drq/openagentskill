import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { getCreatorOutreachStatus, postNextCreatorReplyToX } from '@/lib/x/growth'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['CRON_SECRET', 'INDEXER_SECRET', 'INDEXER_TRIGGER_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = await getCreatorOutreachStatus()
  return NextResponse.json({ success: true, ...status })
}

export async function POST(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['CRON_SECRET', 'INDEXER_SECRET', 'INDEXER_TRIGGER_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await postNextCreatorReplyToX()
  return NextResponse.json({ success: result.status === 'posted', ...result })
}
