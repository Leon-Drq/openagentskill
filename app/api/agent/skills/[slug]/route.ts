import { NextRequest, NextResponse } from 'next/server'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getSkillBySlug } from '@/lib/db/skills'
import { getStacksForSkill } from '@/lib/collections'
import { getSkillInstallTargets } from '@/lib/install-targets'
import { getPlatformHints, getSkillQualityProfile } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'
import { getUseCasesForSkill } from '@/lib/use-cases'

/**
 * GET /api/agent/skills/{slug}
 * Full skill details by slug. Database-backed. Agent-friendly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const format = request.nextUrl.searchParams.get('format') || 'json'

  try {
    const skill = await getSkillBySlug(slug)

    if (!skill) {
      return NextResponse.json(
        { error: `Skill not found: ${slug}` },
        { status: 404 }
      )
    }

    const trustProfile = getSkillTrustProfile(skill)
    const audit = buildSkillAudit(skill)
    const installTargets = getSkillInstallTargets(skill)

    if (format === 'text') {
      const text = `${skill.name}
${'='.repeat(skill.name.length)}

${skill.tagline || skill.description}

Description:
${skill.long_description || skill.description}

Technical Details:
- Version: ${skill.version}
- License: ${skill.license}
- Platforms: ${(skill.frameworks || []).join(', ')}
- Tags: ${(skill.tags || []).join(', ')}

Statistics:
- Quality Score: ${Number(skill.quality_score || 0)}
- Trust Score: ${trustProfile.score} (${trustProfile.label})
- Audit Score: ${audit.audit_score} (${auditRiskLabel(audit.risk_level)})
- GitHub Stars: ${skill.github_stars}
- Downloads: ${skill.downloads}
- Rating: ${skill.rating}/5 (${skill.review_count} reviews)

Author: ${skill.author_name}${skill.verified ? ' (Verified)' : ''}

Install:
${skill.install_command || `npx skills add ${skill.github_repo}`}

Agent install targets:
${installTargets.map((target) => `- ${target.title}: ${target.value}`).join('\n')}

Repository: ${skill.repository}

---
Open Agent Skill — ${skill.verified ? 'Verified' : 'Unverified'} skill.`

      return new NextResponse(text, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Agent-Friendly': 'true',
        },
      })
    }

    return NextResponse.json({
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      long_description: skill.long_description,
      tagline: skill.tagline,
      category: skill.category,
      tags: skill.tags,
      author: skill.author_name,
      verified: skill.verified,
      stats: {
        stars: skill.github_stars,
        forks: skill.github_forks,
        downloads: skill.downloads,
        rating: skill.rating,
        review_count: skill.review_count,
        quality_score: Number(skill.quality_score || 0),
      },
      quality: getSkillQualityProfile(skill),
      trust: trustProfile,
      audit: {
        audit_score: audit.audit_score,
        risk_level: audit.risk_level,
        risk_label: auditRiskLabel(audit.risk_level),
        quality_score: audit.quality_score,
        trust_score: audit.trust_score,
        maintenance_score: audit.maintenance_score,
        security_score: audit.security_score,
        install_score: audit.install_score,
        warnings: audit.warnings,
      },
      quality_signals: skill.quality_signals || {},
      platforms: [...new Set([...(skill.frameworks || []), ...getPlatformHints(skill)])],
      use_cases: getUseCasesForSkill(skill, 4).map((useCase) => ({
        slug: useCase.slug,
        title: useCase.shortTitle,
        url: `https://www.openagentskill.com/use-cases/${useCase.slug}`,
      })),
      stacks: getStacksForSkill(skill, 3).map((stack) => ({
        slug: stack.slug,
        title: stack.shortTitle,
        url: `https://www.openagentskill.com/collections/${stack.slug}`,
      })),
      install: skill.install_command || `npx skills add ${skill.github_repo}`,
      install_targets: installTargets,
      repository: skill.repository,
      github_repo: skill.github_repo,
      version: skill.version,
      license: skill.license,
      urls: {
        web: `https://openagentskill.com/skills/${skill.slug}`,
        repository: skill.repository,
        api: `/api/agent/skills/${skill.slug}`,
        install_api: `/api/skills/${skill.slug}/install`,
      },
      meta: {
        created_at: skill.created_at,
        updated_at: skill.updated_at,
        agent_friendly: true,
      },
    })
  } catch (error) {
    console.error('Agent skill detail API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch skill details' },
      { status: 500 }
    )
  }
}
