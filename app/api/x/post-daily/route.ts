import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import {
  postNextCreatorReplyToX,
  postNextQueuedSkillToX,
  type XCreatorReplyPostResult,
} from '@/lib/x/growth'

export const maxDuration = 60

async function handlePost(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // The editorial post and creator reply use separate queues and dedupe
  // guards. Run both independently so a temporary issue with either never
  // blocks the other side of the daily growth loop.
  const creatorReply = await postNextCreatorReplyToX().catch((error): XCreatorReplyPostResult => ({
    status: 'skipped' as const,
    reason: error instanceof Error ? error.message : 'Creator reply posting failed',
  }))
  const result = await postNextQueuedSkillToX({ autoBuildQueue: true, buildLimit: 3 })
  const posted = result.status === 'posted' || creatorReply.status === 'posted'

  // Keep production cron logs actionable without exposing OAuth tokens or post text.
  console.info('[x-post-daily]', {
    outcome: result.status,
    reason: result.status === 'skipped' ? result.reason : undefined,
    skillSlug: result.skill?.slug || null,
    queueItemId: result.queueItemId || null,
    postId: result.status === 'posted' ? result.post?.id || null : null,
    creatorReply: {
      outcome: creatorReply.status,
      reason: creatorReply.status === 'skipped' ? creatorReply.reason : undefined,
      draftId: creatorReply.draftId || null,
      postId: creatorReply.status === 'posted' ? creatorReply.post?.id || null : null,
    },
  })

  return NextResponse.json({ success: posted, posted, editorial: result, creatorReply })
}

export async function GET(request: NextRequest) {
  return handlePost(request)
}

export async function POST(request: NextRequest) {
  return handlePost(request)
}
