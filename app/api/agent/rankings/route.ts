import { NextRequest, NextResponse } from 'next/server'
import { getAllSkills, getSkillStats } from '@/lib/db/skills'
import { getRankingDefinition, getRankingDefinitions, rankSkillsForDefinition } from '@/lib/rankings'

function clampLimit(value: string | null) {
  const parsed = Number(value || 10)
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : 10, 1), 30)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const slug = searchParams.get('slug') || 'highest-quality-agent-skills'
    const format = searchParams.get('format') || 'json'
    const limit = clampLimit(searchParams.get('limit'))
    const definition = getRankingDefinition(slug)

    if (!definition) {
      return NextResponse.json({
        error: 'Ranking not found',
        rankings: getRankingDefinitions().map((ranking) => ({
          slug: ranking.slug,
          title: ranking.title,
          url: `https://www.openagentskill.com/rankings/${ranking.slug}`,
        })),
      }, { status: 404 })
    }

    const [skills, statsMap] = await Promise.all([getAllSkills('quality'), getSkillStats()])
    const ranked = rankSkillsForDefinition(skills, definition, statsMap, limit)

    if (format === 'text') {
      const text = ranked.map((item) => (
        `${item.rank}. ${item.skill.name} (${item.skill.slug})\n` +
        `   ${item.reason}\n` +
        `   Stars: ${item.skill.github_stars} | Quality: ${Math.round(Number(item.skill.quality_score || 0))}\n` +
        `   Install: ${item.skill.install_command || `npx skills add ${item.skill.github_repo}`}\n` +
        `   URL: https://www.openagentskill.com/skills/${item.skill.slug}`
      )).join('\n---\n')

      return new NextResponse(
        `OpenAgentSkill Ranking\n${definition.title}\n${definition.description}\n---\n${text}`,
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        }
      )
    }

    return NextResponse.json({
      ranking: {
        slug: definition.slug,
        title: definition.title,
        description: definition.description,
        url: `https://www.openagentskill.com/rankings/${definition.slug}`,
      },
      skills: ranked.map((item) => ({
        rank: item.rank,
        score: Math.round(item.score * 100) / 100,
        badge: item.badge,
        reason: item.reason,
        slug: item.skill.slug,
        name: item.skill.name,
        description: item.skill.description,
        category: item.skill.category,
        stars: item.skill.github_stars,
        quality_score: Number(item.skill.quality_score || 0),
        install: item.skill.install_command || `npx skills add ${item.skill.github_repo}`,
        repository: item.skill.repository,
        url: `https://www.openagentskill.com/skills/${item.skill.slug}`,
      })),
      available_rankings: getRankingDefinitions().map((ranking) => ({
        slug: ranking.slug,
        title: ranking.title,
      })),
    })
  } catch (error) {
    console.error('Agent rankings API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rankings' },
      { status: 500 }
    )
  }
}
