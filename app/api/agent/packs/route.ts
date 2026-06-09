import { NextRequest, NextResponse } from 'next/server'
import { getAllSkills } from '@/lib/db/skills'
import { getSkillInstallTargets } from '@/lib/install-targets'
import { getSkillQualityProfile } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'
import { selectSkillsForPack, SKILL_PACKS } from '@/lib/skill-packs'

function clampLimit(value: string | null, fallback: number, max: number) {
  const parsed = Number(value || fallback)
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : fallback, 1), max)
}

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') || 'json'
  const limit = clampLimit(request.nextUrl.searchParams.get('limit'), 5, 10)

  try {
    const skills = await getAllSkills('quality')
    const packs = SKILL_PACKS.map((pack) => {
      const picks = selectSkillsForPack(skills, pack, limit)
      return {
        slug: pack.slug,
        title: pack.title,
        short_title: pack.shortTitle,
        description: pack.description,
        persona: pack.persona,
        outcomes: pack.outcomes,
        workflow_steps: pack.workflowSteps,
        url: `https://www.openagentskill.com/skill-packs/${pack.slug}`,
        api_url: `https://www.openagentskill.com/api/agent/packs/${pack.slug}`,
        skills: picks.map((skill) => ({
          slug: skill.slug,
          name: skill.name,
          description: skill.description,
          quality: getSkillQualityProfile(skill),
          trust: getSkillTrustProfile(skill),
          install: skill.install_command || `npx skills add ${skill.github_repo}`,
          install_targets: getSkillInstallTargets(skill),
          url: `https://www.openagentskill.com/skills/${skill.slug}`,
        })),
      }
    })

    if (format === 'text') {
      const text = packs.map((pack) => (
        `${pack.title} (${pack.slug})\n` +
        `${pack.description}\n` +
        `URL: ${pack.url}\n` +
        `Top skills:\n${pack.skills.map((skill, index) => `  ${index + 1}. ${skill.name} - ${skill.install}`).join('\n')}`
      )).join('\n---\n')

      return new NextResponse(`OpenAgentSkill Packs\n---\n${text}`, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Agent-Friendly': 'true',
        },
      })
    }

    return NextResponse.json({
      packs,
      meta: {
        timestamp: new Date().toISOString(),
        api_version: '1.0',
        agent_friendly: true,
      },
    })
  } catch (error) {
    console.error('Agent packs API error:', error)
    return NextResponse.json({ error: 'Failed to fetch skill packs' }, { status: 500 })
  }
}
