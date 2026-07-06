import { NextRequest, NextResponse } from 'next/server'
import { getSkillBySlugOrFallback } from '@/lib/skill-fallbacks'
import { buildCommunityIndexedReplyText, buildXIntentUrl } from '@/lib/x/poster'

function parseTweetId(request: NextRequest) {
  const explicitId = request.nextUrl.searchParams.get('tweet_id')
  if (explicitId && /^\d{5,30}$/.test(explicitId)) return explicitId

  const tweetUrl = request.nextUrl.searchParams.get('tweet_url')
  const match = tweetUrl?.match(/\/status\/(\d{5,30})/)
  return match?.[1] || null
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('skill_slug') || request.nextUrl.searchParams.get('slug')
  const format = request.nextUrl.searchParams.get('format') || 'redirect'

  if (!slug) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required parameter: skill_slug',
        usage:
          'GET /api/x/reply-draft?skill_slug=crawl4ai&tweet_url=https://x.com/user/status/123&format=json',
      },
      { status: 400 }
    )
  }

  const skill = await getSkillBySlugOrFallback(slug)
  if (!skill) {
    return NextResponse.json({ success: false, error: 'Skill not found' }, { status: 404 })
  }

  const tweetId = parseTweetId(request)
  const creatorName = request.nextUrl.searchParams.get('creator') || skill.author_name
  const sourceUrl = request.nextUrl.searchParams.get('source_url') || skill.repository
  const text = buildCommunityIndexedReplyText(skill, { creatorName, sourceUrl })
  const intentUrl = buildXIntentUrl(text, tweetId || undefined)

  if (format === 'json') {
    return NextResponse.json({
      success: true,
      skill: {
        slug: skill.slug,
        name: skill.name,
        author: skill.author_name,
        source_url: sourceUrl,
        listing_url: `https://www.openagentskill.com/skills/${skill.slug}?ref=x&utm_source=x_reply`,
      },
      text,
      intentUrl,
      meta: {
        requires_manual_publish: true,
        x_api_credits_used: false,
        in_reply_to: tweetId,
        flow: 'community_indexed_claimable_reply',
      },
    })
  }

  return NextResponse.redirect(intentUrl, 307)
}
