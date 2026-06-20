import { NextRequest, NextResponse } from 'next/server'
import { buildInstallHandoff } from '@/lib/registry'
import { getSkillBySlugOrFallback, getSkillSuggestionsForSlug } from '@/lib/skill-fallbacks'

export const revalidate = 300

const INSTALL_CACHE_HEADERS = {
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

    const payload = buildInstallHandoff(skill)

    if (format === 'text') {
      return new NextResponse(
        `OpenAgentSkill Install Handoff
Skill: ${payload.skill.name}
Repository: ${payload.skill.repository}

Recommended command:
${payload.recommended_command}

Agent prompt:
${payload.agent_prompt}

Safety checklist:
${payload.safety_checklist.map((item) => `- ${item}`).join('\n')}

Verification steps:
${payload.verification_steps.map((item) => `- ${item}`).join('\n')}

Do not auto-install when:
${payload.do_not_auto_install_when.map((item) => `- ${item}`).join('\n')}

Detail page:
${payload.urls.web}`,
        {
          headers: {
            ...INSTALL_CACHE_HEADERS,
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Agent-Friendly': 'true',
          },
        }
      )
    }

    return NextResponse.json(payload, { headers: INSTALL_CACHE_HEADERS })
  } catch (error) {
    console.error('Public skill install API error:', error)
    return NextResponse.json({ error: 'Failed to build install handoff' }, { status: 500 })
  }
}
