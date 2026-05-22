import { NextRequest, NextResponse } from 'next/server'
import { createManualXIntentDraft } from '@/lib/x/poster'

function parseOffset(value: string | null) {
  if (!value) return 0
  const offset = Number.parseInt(value, 10)
  return Number.isFinite(offset) ? offset : 0
}

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format')
  const offset = parseOffset(request.nextUrl.searchParams.get('offset'))
  const draft = await createManualXIntentDraft(offset)

  if (draft.status !== 'ready' || !draft.intentUrl) {
    return NextResponse.json({ success: false, ...draft }, { status: 404 })
  }

  if (format === 'json') {
    return NextResponse.json({
      success: true,
      ...draft,
      meta: {
        requires_manual_publish: true,
        x_api_credits_used: false,
        link_strategy: 'reply',
      },
    })
  }

  return NextResponse.redirect(draft.intentUrl, 307)
}
