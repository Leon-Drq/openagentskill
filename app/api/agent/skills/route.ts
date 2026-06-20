import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import { withTimeout } from '@/lib/async'
import { getAllSkills } from '@/lib/db/skills'
import { getSkillInstallTargets } from '@/lib/install-targets'
import { getSkillQualityProfile, getPlatformHints } from '@/lib/quality'
import { dedupeRankedSkills, rankSkillsForQuery } from '@/lib/registry'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'
import { getSkillSupplyProfile } from '@/lib/supply'
import { getSkillTrustProfile } from '@/lib/trust'

/**
 * Agent-friendly API endpoint for searching skills.
 * Reads from database. Supports JSON and plain text.
 * 
 * GET /api/agent/skills?q=web+scraping&limit=5
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category')
  const platform = searchParams.get('platform')
  const trust = searchParams.get('trust')
  const safety = searchParams.get('safety')
  const track = searchParams.get('track')
  const format = searchParams.get('format') || 'json'
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)
  const maxRisk = searchParams.get('max_risk') || 'medium'

  try {
    const candidatePool = await getAgentSkillCandidatePool()
    let records = query
      ? dedupeRankedSkills(rankSkillsForQuery(candidatePool, query)).map((item) => item.skill)
      : candidatePool

    if (category) {
      records = records.filter((r) => r.category.toLowerCase() === category.toLowerCase())
    }
    if (platform) {
      records = records.filter((r) =>
        r.frameworks.some((f) => f.toLowerCase().includes(platform.toLowerCase()))
      )
    }
    if (trust) {
      records = records.filter((r) => getSkillTrustProfile(r).tier === trust)
    }
    if (track) {
      records = records.filter((r) => getSkillSupplyProfile(r).track.slug === track)
    }
    if (safety && safety !== 'all') {
      records = records.filter((r) => {
        const audit = buildSkillAudit(r)
        const safetyProfile = getAgentSafetyProfile(r, audit, {
          max_risk: maxRisk,
          needs_install_command: true,
        })
        return safetyProfile.safety_tier.tier === safety
      })
    }

    records = records.slice(0, limit)

    if (format === 'text') {
      const text = records
        .map((r, i) => {
          const trustProfile = getSkillTrustProfile(r)
          const audit = buildSkillAudit(r)
          const supply = getSkillSupplyProfile(r)
          const safetyProfile = getAgentSafetyProfile(r, audit, {
            max_risk: maxRisk,
            needs_install_command: true,
          })
          return `${i + 1}. ${r.name} (${r.slug})\n   ${r.description}\n   Supply: ${supply.track.shortLabel} | Scenario: ${supply.scenario.label} | Agents: ${supply.applicableAgents.slice(0, 3).join(', ')}\n   Safety: ${safetyProfile.safety_tier.label} | Policy: ${safetyProfile.safety_tier.auto_install_policy} | Score: ${safetyProfile.score}/100\n   Quality: ${Number(r.quality_score || 0)} | Trust: ${trustProfile.score} ${trustProfile.label} | Audit: ${audit.audit_score} ${auditRiskLabel(audit.risk_level)}\n   Maintenance: ${supply.maintenance.label} | Risk: ${supply.risk.label}\n   Stars: ${r.github_stars} | Downloads: ${r.downloads}\n   Install: ${r.install_command || `npx skills add ${r.github_repo}`}\n   URL: https://www.openagentskill.com/skills/${r.slug}\n   ---`
        })
        .join('\n')

      return new NextResponse(
        `Open Agent Skill — Search Results\nQuery: "${query}"\nFound: ${records.length} skills\nTrust filter: ${trust || 'any'}\nSafety filter: ${safety || 'any'}\n---\n${text}`,
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Agent-Friendly': 'true',
          },
        }
      )
    }

    return NextResponse.json({
      query,
      filters: { category, platform, trust, safety, track, max_risk: maxRisk },
      total: records.length,
      skills: records.map((r) => {
        const audit = buildSkillAudit(r)
        const safetyProfile = getAgentSafetyProfile(r, audit, {
          max_risk: maxRisk,
          needs_install_command: true,
        })
        const supplyProfile = getSkillSupplyProfile(r)
        return {
          slug: r.slug,
          name: r.name,
          description: r.description,
          category: r.category,
          tags: r.tags,
          author: r.author_name,
          verified: r.verified,
          stats: {
            stars: r.github_stars,
            downloads: r.downloads,
            rating: r.rating,
            forks: r.github_forks,
            quality_score: Number(r.quality_score || 0),
          },
          quality: getSkillQualityProfile(r),
          trust: getSkillTrustProfile(r),
          audit: {
            audit_score: audit.audit_score,
            risk_level: audit.risk_level,
            risk_label: auditRiskLabel(audit.risk_level),
            warnings: audit.warnings.slice(0, 4),
          },
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
          supply_profile: supplyProfile,
          quality_signals: r.quality_signals || {},
          platforms: [...new Set([...(r.frameworks || []), ...getPlatformHints(r)])],
          install: r.install_command || `npx skills add ${r.github_repo}`,
          install_targets: getSkillInstallTargets(r),
          repository: r.repository,
          github_repo: r.github_repo,
          version: r.version,
          license: r.license,
          urls: {
            detail: `https://www.openagentskill.com/skills/${r.slug}`,
            api: `https://www.openagentskill.com/api/agent/skills/${r.slug}`,
            install_api: `https://www.openagentskill.com/api/skills/${r.slug}/install`,
            audit: `https://www.openagentskill.com/skills/${r.slug}/audit`,
            repository: r.repository,
          },
        }
      }),
      meta: {
        timestamp: new Date().toISOString(),
        api_version: '1.0',
        agent_friendly: true,
      },
    })
  } catch (error) {
    console.error('Agent skills API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch skills',
        fallback: true,
        hint: 'Use /api/agent/resolve?task=... for the most reliable agent handoff.',
      },
      { status: 503 }
    )
  }
}

const AGENT_SKILLS_QUERY_TIMEOUT_MS = 1000
const AGENT_SKILLS_CANDIDATE_LIMIT = 500

const getCachedAgentSkillCandidatePool = unstable_cache(
  async () => getAllSkills('quality', undefined, AGENT_SKILLS_CANDIDATE_LIMIT),
  ['agent-skills-candidate-pool-v3'],
  { revalidate: 300 }
)

async function getAgentSkillCandidatePool() {
  return withTimeout(
    getCachedAgentSkillCandidatePool(),
    AGENT_SKILLS_QUERY_TIMEOUT_MS,
    'agent skills candidate query'
  ).catch((error) => {
    console.warn('Agent skills candidate fallback:', error)
    return CURATED_SKILL_SNAPSHOT
  })
}
