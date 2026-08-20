import { NextRequest, NextResponse } from 'next/server'
import { buildInstallHandoff } from '@/lib/registry'
import { getSkillBySlugOrFallbackStrict, getSkillSuggestionsForSlug } from '@/lib/skill-fallbacks'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const INSTALL_CACHE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const format = request.nextUrl.searchParams.get('format') || 'json'

  try {
    const skill = await getSkillBySlugOrFallbackStrict(slug)
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

Verified install receipt:
Endpoint: ${payload.install_receipt.method} ${payload.install_receipt.endpoint}
Count rule: ${payload.install_receipt.count_rule}
Example: ${JSON.stringify(payload.install_receipt.example)}

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
    return NextResponse.json(
      { error: 'Skill registry is temporarily unavailable. Retry this request.' },
      { status: 503, headers: { ...INSTALL_CACHE_HEADERS, 'Retry-After': '15', 'X-Registry-Data-State': 'degraded' } }
    )
  }
}
