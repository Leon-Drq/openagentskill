import { NextRequest, NextResponse } from 'next/server'
import { toRegistrySkill } from '@/lib/registry'
import { getSkillBySlugOrFallback, getSkillSuggestionsForSlug } from '@/lib/skill-fallbacks'

export const revalidate = 300

const MANIFEST_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const format = request.nextUrl.searchParams.get('format') || 'json'

  try {
    const skill = await getSkillBySlugOrFallback(slug)

    if (!skill) {
      return NextResponse.json({
        error: `Skill not found: ${slug}`,
        suggestions: getSkillSuggestionsForSlug(slug).map((candidate) => candidate.slug),
      }, { status: 404 })
    }

    const manifest = toRegistrySkill(skill)

    if (format === 'text') {
      return new NextResponse(
        `OpenAgentSkill Registry Manifest
Skill: ${manifest.name}
Slug: ${manifest.slug}
Category: ${manifest.category}
Description: ${manifest.description}

Agent fit:
- Decision: ${manifest.decision.readiness_score}/100 ${manifest.decision.readiness_label}
- Primary fit: ${manifest.decision.primary_fit}
- Role: ${manifest.decision.role}

Supply profile:
- Track: ${manifest.supply_profile.track.label}
- Scenario: ${manifest.supply_profile.scenario.label}
- Applicable agents: ${manifest.supply_profile.applicableAgents.join(', ')}
- Maintenance: ${manifest.supply_profile.maintenance.label}
- Risk: ${manifest.supply_profile.risk.label}

Trust:
- Trust score: ${manifest.trust.score}/100 ${manifest.trust.label}
- Audit: ${manifest.audit.audit_score}/100 ${manifest.audit.risk_label}

Attribution:
- Status: ${manifest.attribution.statusLabel}
- Source: ${manifest.attribution.sourceLabel}
- Creator: ${manifest.attribution.creatorName}
- Claim URL: ${manifest.attribution.claimUrl}

Install:
${manifest.install}

URLs:
- Web: ${manifest.urls.web}
- API: ${manifest.urls.api}
- Install API: ${manifest.urls.install_api}
- Repository: ${manifest.urls.repository || 'Unknown'}`,
        {
          headers: {
            ...MANIFEST_CACHE_HEADERS,
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Agent-Friendly': 'true',
          },
        }
      )
    }

    return NextResponse.json(
      {
        ...manifest,
        meta: {
          endpoint: '/api/registry/manifest/{slug}',
          canonical_agent_endpoint: `/api/agent/skills/${skill.slug}`,
          agent_friendly: true,
          api_version: '1.0',
          generated_at: new Date().toISOString(),
        },
      },
      { headers: MANIFEST_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('Registry manifest API error:', error)
    return NextResponse.json({ error: 'Failed to build registry manifest' }, { status: 500 })
  }
}
