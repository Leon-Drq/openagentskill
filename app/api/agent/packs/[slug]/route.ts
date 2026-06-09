import { NextRequest, NextResponse } from 'next/server'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getAllSkills } from '@/lib/db/skills'
import { getSkillInstallTargets } from '@/lib/install-targets'
import { getSkillQualityProfile } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'
import { getSkillPackBySlug, selectSkillsForPack } from '@/lib/skill-packs'

function clampLimit(value: string | null, fallback: number, max: number) {
  const parsed = Number(value || fallback)
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : fallback, 1), max)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const format = request.nextUrl.searchParams.get('format') || 'json'
  const limit = clampLimit(request.nextUrl.searchParams.get('limit'), 10, 20)
  const pack = getSkillPackBySlug(slug)

  if (!pack) {
    return NextResponse.json({ error: `Skill pack not found: ${slug}` }, { status: 404 })
  }

  try {
    const skills = await getAllSkills('quality')
    const picks = selectSkillsForPack(skills, pack, limit)
    const payload = {
      pack: {
        slug: pack.slug,
        title: pack.title,
        short_title: pack.shortTitle,
        description: pack.description,
        persona: pack.persona,
        outcomes: pack.outcomes,
        workflow_steps: pack.workflowSteps,
        best_for: pack.bestFor,
        avoid_when: pack.avoidWhen,
        url: `https://www.openagentskill.com/skill-packs/${pack.slug}`,
      },
      skills: picks.map((skill, index) => {
        const audit = buildSkillAudit(skill)
        return {
          rank: index + 1,
          slug: skill.slug,
          name: skill.name,
          description: skill.description,
          category: skill.category,
          quality: getSkillQualityProfile(skill),
          trust: getSkillTrustProfile(skill),
          audit: {
            audit_score: audit.audit_score,
            risk_level: audit.risk_level,
            risk_label: auditRiskLabel(audit.risk_level),
            warnings: audit.warnings.slice(0, 4),
          },
          stats: {
            stars: skill.github_stars,
            downloads: skill.downloads,
            quality_score: Number(skill.quality_score || 0),
          },
          install: skill.install_command || `npx skills add ${skill.github_repo}`,
          install_targets: getSkillInstallTargets(skill),
          urls: {
            web: `https://www.openagentskill.com/skills/${skill.slug}`,
            api: `https://www.openagentskill.com/api/agent/skills/${skill.slug}`,
            audit: `https://www.openagentskill.com/skills/${skill.slug}/audit`,
            repository: skill.repository,
          },
        }
      }),
      meta: {
        timestamp: new Date().toISOString(),
        api_version: '1.0',
        agent_friendly: true,
      },
    }

    if (format === 'text') {
      const text = payload.skills.map((skill) => (
        `${skill.rank}. ${skill.name} (${skill.slug})\n` +
        `   ${skill.description}\n` +
        `   Quality: ${skill.quality.score}/100 | Trust: ${skill.trust.score}/100 | Audit: ${skill.audit.audit_score}/100 ${skill.audit.risk_label}\n` +
        `   Install: ${skill.install}\n` +
        `   URL: ${skill.urls.web}`
      )).join('\n---\n')

      return new NextResponse(
        `OpenAgentSkill Pack\n${payload.pack.title}\n${payload.pack.description}\n---\n${text}`,
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Agent-Friendly': 'true',
          },
        }
      )
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Agent pack API error:', error)
    return NextResponse.json({ error: 'Failed to fetch skill pack' }, { status: 500 })
  }
}
