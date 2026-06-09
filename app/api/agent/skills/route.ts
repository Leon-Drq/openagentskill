import { NextRequest, NextResponse } from 'next/server'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getAllSkills, searchSkills } from '@/lib/db/skills'
import { getSkillInstallTargets } from '@/lib/install-targets'
import { getSkillQualityProfile, getPlatformHints } from '@/lib/quality'
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
  const format = searchParams.get('format') || 'json'
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)

  try {
    let records = query ? await searchSkills(query) : await getAllSkills()

    if (category) {
      records = records.filter((r) => r.category === category)
    }
    if (platform) {
      records = records.filter((r) =>
        r.frameworks.some((f) => f.toLowerCase().includes(platform.toLowerCase()))
      )
    }
    if (trust) {
      records = records.filter((r) => getSkillTrustProfile(r).tier === trust)
    }

    records = records.slice(0, limit)

    if (format === 'text') {
      const text = records
        .map((r, i) => {
          const trustProfile = getSkillTrustProfile(r)
          const audit = buildSkillAudit(r)
          return `${i + 1}. ${r.name} (${r.slug})\n   ${r.description}\n   Quality: ${Number(r.quality_score || 0)} | Trust: ${trustProfile.score} ${trustProfile.label} | Audit: ${audit.audit_score} ${auditRiskLabel(audit.risk_level)}\n   Stars: ${r.github_stars} | Downloads: ${r.downloads}\n   Install: ${r.install_command || `npx skills add ${r.github_repo}`}\n   URL: https://www.openagentskill.com/skills/${r.slug}\n   ---`
        })
        .join('\n')

      return new NextResponse(
        `Open Agent Skill — Search Results\nQuery: "${query}"\nFound: ${records.length} skills\nTrust filter: ${trust || 'any'}\n---\n${text}`,
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
      filters: { category, platform, trust },
      total: records.length,
      skills: records.map((r) => {
        const audit = buildSkillAudit(r)
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
      { error: 'Failed to fetch skills' },
      { status: 500 }
    )
  }
}
