import { NextResponse } from 'next/server'
import { buildSkillAudit, normalizeAuditRecord, toAuditRecord } from '@/lib/audits'
import { withTimeout } from '@/lib/async'
import { getSkillAuditBySlug, getSkillBySlug, getSkillEventStats } from '@/lib/db/skills'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { getSkillBySlugOrFallback, isCuratedSkillFallback } from '@/lib/skill-fallbacks'
import { createAdminClient } from '@/lib/supabase/admin'
import type { NextRequest } from 'next/server'

export const revalidate = 300

const AUDIT_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
}
const AUDIT_API_SUPPORT_TIMEOUT_MS = 1200

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const skill = await getSkillBySlugOrFallback(slug).catch(() => null)
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

  const [storedAudit, eventStats] = isCuratedSkillFallback(skill)
    ? [null, null]
    : await Promise.all([
        withTimeout(getSkillAuditBySlug(skill.slug), AUDIT_API_SUPPORT_TIMEOUT_MS, 'audit api stored audit query').catch(() => null),
        withTimeout(getSkillEventStats(skill.slug), AUDIT_API_SUPPORT_TIMEOUT_MS, 'audit api event stats query').catch(() => null),
      ])

  const audit = storedAudit ? normalizeAuditRecord(storedAudit) : buildSkillAudit(skill, eventStats)

  return NextResponse.json(
    {
      skill: {
        slug: skill.slug,
        name: skill.name,
        description: skill.description,
        github_repo: skill.github_repo,
      },
      audit,
      source: storedAudit ? 'stored' : 'computed',
    },
    { headers: AUDIT_CACHE_HEADERS }
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const skill = await getSkillBySlug(slug).catch(() => null)
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

  const eventStats = await getSkillEventStats(skill.slug).catch(() => null)
  const audit = buildSkillAudit(skill, eventStats)

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('skill_audits')
      .upsert(toAuditRecord(audit), { onConflict: 'skill_slug' })

    if (error) {
      return NextResponse.json({ error: 'Failed to save audit', details: error.message }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Audit persistence is unavailable', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, audit })
}
