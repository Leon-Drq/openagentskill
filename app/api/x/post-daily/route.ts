import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { postNextQueuedSkillToX } from '@/lib/x/growth'

export const maxDuration = 60

async function handlePost(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await postNextQueuedSkillToX({ autoBuildQueue: true, buildLimit: 4 })
  const posted = result.status === 'posted'

  // Keep production cron logs actionable without exposing OAuth tokens or post text.
  console.info('[x-post-daily]', {
    outcome: result.status,
    reason: result.status === 'skipped' ? result.reason : undefined,
    skillSlug: result.skill?.slug || null,
    queueItemId: result.queueItemId || null,
    postId: result.status === 'posted' ? result.post?.id || null : null,
  })

  return NextResponse.json({ success: posted, posted, ...result })
}

export async function GET(request: NextRequest) {
  return handlePost(request)
}

export async function POST(request: NextRequest) {
  return handlePost(request)
}
