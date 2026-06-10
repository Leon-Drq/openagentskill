import { NextRequest, NextResponse } from 'next/server'
import { getAllSkills } from '@/lib/db/skills'
import { dedupeRankedSkills, getRecommendationReasons, rankSkillsForQuery, toRegistrySkill } from '@/lib/registry'

function clampLimit(value: string | null) {
  const parsed = Number(value || 10)
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : 10, 1), 50)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || searchParams.get('task') || ''
  const category = searchParams.get('category')
  const platform = searchParams.get('platform')
  const minStars = Number(searchParams.get('min_stars') || searchParams.get('minStars') || 0)
  const format = searchParams.get('format') || 'json'
  const limit = clampLimit(searchParams.get('limit'))

  try {
    const skills = await getAllSkills('quality')
    const ranked = dedupeRankedSkills(rankSkillsForQuery(skills, query))
      .filter(({ skill }) => {
        if (category && skill.category.toLowerCase() !== category.toLowerCase()) return false
        if (Number.isFinite(minStars) && minStars > 0 && Number(skill.github_stars || 0) < minStars) return false
        if (platform) {
          const platformText = [
            ...(skill.frameworks || []),
            ...(skill.tags || []),
            skill.description,
            skill.long_description || '',
          ].join(' ').toLowerCase()
          if (!platformText.includes(platform.toLowerCase())) return false
        }
        return true
      })
      .slice(0, limit)

    if (format === 'text') {
      const text = ranked.map(({ skill, score }, index) => {
        const item = toRegistrySkill(skill)
        return `${index + 1}. ${item.name} (${item.slug})
   Match score: ${score}
   ${item.description}
   Trust: ${item.trust.score}/100 ${item.trust.label} | Audit: ${item.audit.audit_score}/100 ${item.audit.risk_label}
   Install: ${item.install}
   URL: ${item.urls.web}
   Install API: ${item.urls.install_api}`
      }).join('\n---\n')

      return new NextResponse(
        `OpenAgentSkill Registry Search
Query: ${query || 'top skills'}
Found: ${ranked.length}
---
${text}`,
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
      filters: {
        category,
        platform,
        min_stars: Number.isFinite(minStars) ? minStars : 0,
      },
      total: ranked.length,
      skills: ranked.map(({ skill, score }, index) => ({
        rank: index + 1,
        match_score: score,
        ...toRegistrySkill(skill),
        recommendation_reasons: getRecommendationReasons(skill, query, score),
      })),
      meta: {
        endpoint: '/api/skills/search',
        canonical_agent_endpoint: '/api/agent/recommend',
        agent_friendly: true,
        api_version: '1.0',
        generated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Public skill search API error:', error)
    return NextResponse.json({ error: 'Failed to search skills' }, { status: 500 })
  }
}
