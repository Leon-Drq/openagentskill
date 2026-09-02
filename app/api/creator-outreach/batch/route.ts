import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildCreatorEmailDraft } from '@/lib/growth/creator-outreach'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import type { SkillRecord } from '@/lib/db/skills'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['CRON_SECRET', 'INDEXER_SECRET', 'INDEXER_TRIGGER_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || 25)
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 25, 1), 100)
  const { data, error } = await createAdminClient({ requestTimeoutMs: 12_000 })
    .from('skills')
    .select('*')
    .eq('ai_review_approved', true)
    .eq('publisher_verified', false)
    .gte('quality_score', 60)
    .order('github_last_pushed_at', { ascending: false, nullsFirst: false })
    .order('github_stars', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: 'Could not build the creator outreach cohort.' }, { status: 503 })
  }

  const cohort = ((data || []) as SkillRecord[]).map((skill) => ({
    skill: {
      slug: skill.slug,
      name: skill.name,
      repository: skill.repository,
      creator: skill.author_name,
      stars: Number(skill.github_stars || 0),
      quality_score: Number(skill.quality_score || 0),
      last_pushed_at: skill.github_last_pushed_at,
    },
    draft: buildCreatorEmailDraft(skill, skill.author_name),
  }))

  return NextResponse.json({
    success: true,
    automatic_sending: false,
    review_required: true,
    cohort_size: cohort.length,
    cohort,
  })
}
