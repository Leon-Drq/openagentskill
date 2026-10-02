import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { postNextQueuedSkillToX } from '@/lib/x/growth'

export const maxDuration = 120

async function handlePost(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    // Queue generation runs before this cron in growth/run. Publishing never
    // waits for author outreach, AI selection, or queue construction.
    const result = await postNextQueuedSkillToX({ autoBuildQueue: false })
    const posted = result.status === 'posted'
    console.info('[x-post-daily]', {
      outcome: result.status,
      reason: result.status === 'skipped' ? result.reason : undefined,
      skillSlug: result.skill?.slug || null,
      queueItemId: result.queueItemId || null,
      postId: posted ? result.post?.id || null : null,
    })
    return NextResponse.json({ success: true, posted, editorial: result })
  } catch {
    console.error('[x-post-daily]', { outcome: 'error', stage: 'editorial' })
    return NextResponse.json({ success: false, posted: false, error: 'X editorial publishing failed; inspect the queue before retrying.' }, { status: 503 })
  }
}

export async function GET(request: NextRequest) { return handlePost(request) }
export async function POST(request: NextRequest) { return handlePost(request) }
