import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { PUBLIC_SKILL_FILTER } from '@/lib/skills/publication'
import { MEDIA_FEED_SELECT, MEDIA_FEED_PAGE_SIZE, mediaFeedCursor } from '@/lib/skills/media-feed'

// The daily collector reads every published identity, including newly published
// submissions and owner listings. Keyset pagination avoids the search API's cap.
export async function GET(request: NextRequest) {
  let cursor: string | null
  try { cursor = mediaFeedCursor(request.nextUrl.searchParams.get('after')) }
  catch { return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 }) }
  let query = createPublicClient().from('skills').select(MEDIA_FEED_SELECT)
    .or(PUBLIC_SKILL_FILTER).order('slug').limit(MEDIA_FEED_PAGE_SIZE)
  if (cursor) query = query.gt('slug', cursor)
  const { data, error } = await query
  // Never turn an outage into an empty feed: the collector must retain its queue.
  if (error || !data) return NextResponse.json({ error: 'Registry unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } })
  return NextResponse.json({
    records: data.map(({ primary_category, ...row }) => ({ ...row, category: primary_category })),
    next: data.length === MEDIA_FEED_PAGE_SIZE ? data.at(-1)!.slug : null,
  }, { headers: { 'Cache-Control': 'public, s-maxage=300', 'X-Robots-Tag': 'noindex' } })
}
