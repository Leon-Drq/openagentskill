import { NextRequest, NextResponse } from 'next/server'
import { buildCreatorEmailDraft } from '@/lib/growth/creator-outreach'
import { getSkillBySlugOrFallback } from '@/lib/skill-fallbacks'

export async function GET(request: NextRequest) {
  const skillSlug = request.nextUrl.searchParams.get('skill_slug')?.trim()
  if (!skillSlug) {
    return NextResponse.json({ success: false, error: 'Missing skill_slug' }, { status: 400 })
  }

  const skill = await getSkillBySlugOrFallback(skillSlug)
  if (!skill) {
    return NextResponse.json({ success: false, error: 'Skill not found' }, { status: 404 })
  }

  const draft = buildCreatorEmailDraft(skill)
  return NextResponse.json({
    success: true,
    skill: { slug: skill.slug, name: skill.name, repository: skill.repository },
    ...draft,
    meta: {
      automatic_sending: false,
      contact_collection: false,
      purpose: 'Private, opt-in creator follow-up after a public skill listing is live.',
    },
  })
}
