import { NextRequest, NextResponse } from 'next/server'
import { createManualXReplyIntentDraft } from '@/lib/x/poster'

function parseOffset(value: string | null) {
  if (!value) return 0
  const offset = Number.parseInt(value, 10)
  return Number.isFinite(offset) ? offset : 0
}

function parseTweetId(request: NextRequest) {
  const explicitId = request.nextUrl.searchParams.get('tweet_id')
  if (explicitId && /^\d{5,30}$/.test(explicitId)) return explicitId

  const tweetUrl = request.nextUrl.searchParams.get('tweet_url')
  const match = tweetUrl?.match(/\/status\/(\d{5,30})/)
  return match?.[1] || null
}

export async function GET(request: NextRequest) {
  const tweetId = parseTweetId(request)
  if (!tweetId) {
    return NextResponse.json(
      { success: false, error: 'Missing tweet_id or tweet_url' },
      { status: 400 }
    )
  }

  const format = request.nextUrl.searchParams.get('format')
  const offset = parseOffset(request.nextUrl.searchParams.get('offset'))
  const draft = await createManualXReplyIntentDraft(tweetId, offset)

  if (draft.status !== 'ready' || !draft.replyIntentUrl) {
    return NextResponse.json({ success: false, ...draft }, { status: 404 })
  }

  if (format === 'json') {
    return NextResponse.json({
      success: true,
      ...draft,
      meta: {
        requires_manual_publish: true,
        x_api_credits_used: false,
        in_reply_to: tweetId,
      },
    })
  }

  return NextResponse.redirect(draft.replyIntentUrl, 307)
}
