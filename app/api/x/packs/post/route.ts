import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { postSkillPackToX } from '@/lib/x/pack-post'

export const maxDuration = 60

async function handlePost(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json(
      { error: 'Missing required parameter: slug', usage: 'POST /api/x/packs/post?slug=ai-video-creator-agent-pack' },
      { status: 400 }
    )
  }

  const result = await postSkillPackToX(slug)
  const posted = result.status === 'posted'

  console.info('[x-pack-post]', {
    outcome: result.status,
    reason: result.reason,
    packSlug: result.pack?.slug || slug,
    postId: result.post?.id || null,
  })

  return NextResponse.json({ success: posted, posted, ...result })
}

export async function POST(request: NextRequest) {
  return handlePost(request)
}
