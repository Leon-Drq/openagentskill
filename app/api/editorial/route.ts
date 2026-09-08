import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { prepareEditorialWeek, submitEditorialDraft, publishEditorialDraft } from '@/lib/blog/editorial'

export async function GET(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['INDEXER_SECRET', 'CRON_SECRET'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await prepareEditorialWeek())
}
export async function POST(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['INDEXER_SECRET'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    if (typeof body.id !== 'string') return NextResponse.json({ error: 'Draft id required' }, { status: 400 })
    if (body.action === 'publish') return NextResponse.json(await publishEditorialDraft(body.id))
    return NextResponse.json(await submitEditorialDraft(body.id, body.draft))
  } catch {
    return NextResponse.json({ error: 'Editorial validation or publication failed; nothing auto-approved' }, { status: 422 })
  }
}
