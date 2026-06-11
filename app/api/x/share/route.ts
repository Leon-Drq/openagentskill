import { NextRequest, NextResponse } from 'next/server'
import { getSkillBySlug } from '@/lib/db/skills'
import { buildManualXMainText, buildManualXReplyText, buildXIntentUrl } from '@/lib/x/poster'

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('skill_slug') || request.nextUrl.searchParams.get('slug')

  if (!slug) {
    return NextResponse.json(
      {
        error: 'Missing required parameter: skill_slug',
        usage: 'GET /api/x/share?skill_slug=crawl4ai',
      },
      { status: 400 }
    )
  }

  const skill = await getSkillBySlug(slug)
  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  const mainText = buildManualXMainText(skill)
  const replyText = buildManualXReplyText(skill)

  return NextResponse.json({
    success: true,
    skill: {
      slug: skill.slug,
      name: skill.name,
      category: skill.category,
      stars: skill.github_stars,
      url: `https://www.openagentskill.com/skills/${skill.slug}?ref=x`,
    },
    mainText,
    mainIntentUrl: buildXIntentUrl(mainText),
    replyText,
    replyIntentUrl: buildXIntentUrl(replyText),
    meta: {
      requires_manual_publish: true,
      x_api_credits_used: false,
      link_strategy: 'main_post_with_optional_reply',
    },
  })
}
