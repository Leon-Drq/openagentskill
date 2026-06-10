import { NextRequest, NextResponse } from 'next/server'
import { getSkillBySlug } from '@/lib/db/skills'
import { buildInstallHandoff } from '@/lib/registry'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const format = request.nextUrl.searchParams.get('format') || 'json'

  try {
    const skill = await getSkillBySlug(slug)
    if (!skill) {
      return NextResponse.json({ error: `Skill not found: ${slug}` }, { status: 404 })
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

Detail page:
${payload.urls.web}`,
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
    console.error('Public skill install API error:', error)
    return NextResponse.json({ error: 'Failed to build install handoff' }, { status: 500 })
  }
}
