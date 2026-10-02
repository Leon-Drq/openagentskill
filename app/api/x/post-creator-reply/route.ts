import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { postNextCreatorReplyToX } from '@/lib/x/growth'

export const maxDuration = 120

async function handlePost(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await postNextCreatorReplyToX()
    console.info('[x-creator-reply]', { outcome: result.status, draftId: result.draftId || null, postId: result.post?.id || null })
    return NextResponse.json({ success: true, posted: result.status === 'posted', creatorReply: result })
  } catch {
    console.error('[x-creator-reply]', { outcome: 'error', stage: 'creator-reply' })
    return NextResponse.json({ success: false, error: 'X creator reply failed; inspect the draft before retrying.' }, { status: 503 })
  }
}

export async function GET(request: NextRequest) { return handlePost(request) }
export async function POST(request: NextRequest) { return handlePost(request) }
