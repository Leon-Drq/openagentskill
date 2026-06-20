import { NextRequest, NextResponse } from 'next/server'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import { buildAgentReadableSkillMetadata } from '@/lib/agent-readable'
import { withTimeout } from '@/lib/async'
import { getApprovedClaimBySkillSlug } from '@/lib/db/skills'
import { getStacksForSkill } from '@/lib/collections'
import { getSkillInstallTargets } from '@/lib/install-targets'
import { getPlatformHints, getSkillQualityProfile } from '@/lib/quality'
import { getSkillAttribution } from '@/lib/skill-attribution'
import { getSkillBySlugOrFallback, getSkillSuggestionsForSlug, isCuratedSkillFallback, normalizeSkillSlug } from '@/lib/skill-fallbacks'
import { getSkillSupplyProfile } from '@/lib/supply'
import { getSkillTrustProfile } from '@/lib/trust'
import { getUseCasesForSkill } from '@/lib/use-cases'

export const revalidate = 300

const AGENT_SKILL_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
}
const AGENT_SKILL_SUPPORT_TIMEOUT_MS = 1200

/**
 * GET /api/agent/skills/{slug}
 * Full skill details by slug. Database-backed. Agent-friendly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const normalizedSlug = normalizeSkillSlug(slug)
  const format = request.nextUrl.searchParams.get('format') || 'json'

  try {
    const skill = await getSkillBySlugOrFallback(slug)

    if (!skill) {
      return NextResponse.json(
        {
          error: `Skill not found: ${slug}`,
          normalized_slug: normalizedSlug,
          suggestions: getSkillSuggestionsForSlug(slug).map((candidate) => ({
            slug: candidate.slug,
            name: candidate.name,
            url: `https://www.openagentskill.com/skills/${candidate.slug}`,
          })),
        },
        { status: 404 }
      )
    }

    const approvedClaim = isCuratedSkillFallback(skill)
      ? null
      : await withTimeout(
          getApprovedClaimBySkillSlug(skill.slug),
          AGENT_SKILL_SUPPORT_TIMEOUT_MS,
          'agent skill claim query'
        ).catch(() => null)
    const trustProfile = getSkillTrustProfile(skill, Boolean(approvedClaim))
    const audit = buildSkillAudit(skill)
    const safetyProfile = getAgentSafetyProfile(skill, audit, {
      max_risk: request.nextUrl.searchParams.get('max_risk') || 'medium',
      needs_install_command: true,
    })
    const installTargets = getSkillInstallTargets(skill)
    const attribution = getSkillAttribution(skill, approvedClaim)
    const supplyProfile = getSkillSupplyProfile(skill)
    const agentReadableMetadata = buildAgentReadableSkillMetadata(skill, {
      approvedClaim: Boolean(approvedClaim),
    })

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

Supply Profile:
- Track: ${supplyProfile.track.label}
- Scenario: ${supplyProfile.scenario.label}
- Applicable agents: ${supplyProfile.applicableAgents.join(', ')}
- Maintenance: ${supplyProfile.maintenance.label}
- Risk: ${supplyProfile.risk.label}

Statistics:
- Quality Score: ${Number(skill.quality_score || 0)}
- Trust Score: ${trustProfile.score} (${trustProfile.label})
- Audit Score: ${audit.audit_score} (${auditRiskLabel(audit.risk_level)})
- Safety Gate: ${safetyProfile.safety_tier.label} (${safetyProfile.safety_tier.auto_install_policy})
- Agent Safety Score: ${safetyProfile.score}/100
- GitHub Stars: ${skill.github_stars}
- Downloads: ${skill.downloads}
- Rating: ${skill.rating}/5 (${skill.review_count} reviews)

Author: ${skill.author_name}${skill.verified ? ' (Verified)' : ''}

Attribution:
- Status: ${attribution.statusLabel}
- Source: ${attribution.sourceLabel}
- Creator: ${attribution.creatorName}
- Claim URL: ${attribution.claimUrl}
- Note: ${attribution.trustNote}

Install:
${skill.install_command || `npx skills add ${skill.github_repo}`}

Agent install targets:
${installTargets.map((target) => `- ${target.title}: ${target.value}`).join('\n')}

Agent-readable metadata:
- Suited tasks: ${agentReadableMetadata.suited_tasks.slice(0, 4).join('; ')}
- Suited agents: ${agentReadableMetadata.suited_agents.slice(0, 5).join(', ')}
- Install policy: ${agentReadableMetadata.safety_gate.auto_install_policy}
- Do not use when: ${agentReadableMetadata.do_not_use_when.slice(0, 3).join('; ')}

Repository: ${skill.repository}

---
Open Agent Skill — ${skill.verified ? 'Verified' : 'Unverified'} skill.`

      return new NextResponse(text, {
        headers: {
          ...AGENT_SKILL_CACHE_HEADERS,
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Agent-Friendly': 'true',
        },
      })
    }

    return NextResponse.json(
      {
        slug: skill.slug,
        name: skill.name,
        description: skill.description,
        long_description: skill.long_description,
        tagline: skill.tagline,
        category: skill.category,
        tags: skill.tags,
        author: skill.author_name,
        verified: skill.verified,
        attribution,
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
        safety: safetyProfile,
        safety_gate: {
          tier: safetyProfile.safety_tier.tier,
          label: safetyProfile.safety_tier.label,
          badge: safetyProfile.safety_tier.badge,
          auto_install_policy: safetyProfile.safety_tier.auto_install_policy,
          auto_install_allowed: safetyProfile.auto_install_allowed,
          blocked: safetyProfile.blocked,
          human_review_required: safetyProfile.human_review_required,
          recommended_action: safetyProfile.safety_tier.recommended_action,
          reasons: safetyProfile.safety_tier.reasons,
        },
        agent_readable_metadata: agentReadableMetadata,
        machine_metadata: agentReadableMetadata,
        supply_profile: supplyProfile,
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
          web: `https://www.openagentskill.com/skills/${skill.slug}`,
          repository: skill.repository,
          api: `/api/agent/skills/${skill.slug}`,
          install_api: `/api/skills/${skill.slug}/install`,
        },
        meta: {
          created_at: skill.created_at,
          updated_at: skill.updated_at,
          agent_friendly: true,
        },
      },
      { headers: AGENT_SKILL_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('Agent skill detail API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch skill details' },
      { status: 500 }
    )
  }
}
