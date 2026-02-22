import { NextRequest, NextResponse } from 'next/server'
import { getAllSkills, type SkillRecord } from '@/lib/db/skills'

/**
 * Agent Recommend API — Describe a task, get the best skills.
 * 
 * GET /api/agent/recommend?task=scrape+websites+and+generate+reports&limit=3
 * 
 * This endpoint uses keyword matching + scoring to recommend skills.
 * No external AI call needed — fast, deterministic, free.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const task = searchParams.get('task') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '3', 10), 10)

  if (!task) {
    return NextResponse.json(
      {
        error: 'Missing required parameter: task',
        usage: 'GET /api/agent/recommend?task=your+task+description&limit=3',
        example: 'GET /api/agent/recommend?task=scrape+websites+and+extract+data',
      },
      { status: 400 }
    )
  }

  try {
    const allSkills = await getAllSkills()

    // Score each skill based on relevance to the task
    const scored = allSkills.map((skill) => ({
      skill,
      score: calculateRelevanceScore(skill, task),
    }))

    // Sort by score descending, take top N
    scored.sort((a, b) => b.score - a.score)
    const recommendations = scored.slice(0, limit).filter((s) => s.score > 0)

    // Find composition suggestions — skills that enhance each other
    const topSlugs = recommendations.map((r) => r.skill.slug)
    const compositionSuggestion =
      recommendations.length >= 2
        ? {
            name: `${recommendations[0]?.skill.slug}-pipeline`,
            description: `Suggested composition of ${topSlugs.join(' + ')} for: ${task}`,
            skills: topSlugs,
          }
        : null

    return NextResponse.json({
      task,
      recommendations: recommendations.map((r) => ({
        skill: r.skill.name,
        slug: r.skill.slug,
        description: r.skill.description,
        confidence: Math.min(r.score / 100, 1.0).toFixed(2),
        install: r.skill.install_command || `npx skills add ${r.skill.github_repo}`,
        repository: r.skill.repository,
        stats: {
          stars: r.skill.github_stars,
          downloads: r.skill.downloads,
          rating: r.skill.rating,
        },
        reasoning: generateReasoning(r.skill, r.score),
      })),
      suggested_composition: compositionSuggestion,
      meta: {
        timestamp: new Date().toISOString(),
        api_version: '1.0',
        total_skills_searched: allSkills.length,
        agent_friendly: true,
      },
    })
  } catch (error) {
    console.error('Agent recommend API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

/**
 * Calculate relevance score based on keyword matching across
 * name, description, tags, and category.
 */
function calculateRelevanceScore(skill: SkillRecord, task: string): number {
  const taskWords = task
    .toLowerCase()
    .split(/[\s+,.\-_]+/)
    .filter((w) => w.length > 2)

  let score = 0
  const nameDesc = `${skill.name} ${skill.description} ${skill.long_description || ''}`.toLowerCase()
  const tags = (skill.tags || []).map((t) => t.toLowerCase())
  const category = skill.category.toLowerCase()

  for (const word of taskWords) {
    // Name match (highest weight)
    if (skill.name.toLowerCase().includes(word)) score += 30
    // Tag match (high weight)
    if (tags.some((t) => t.includes(word))) score += 25
    // Category match
    if (category.includes(word)) score += 20
    // Description match
    if (nameDesc.includes(word)) score += 10
  }

  // Boost by popularity signals
  if (skill.github_stars > 10000) score += 15
  else if (skill.github_stars > 1000) score += 10
  else if (skill.github_stars > 100) score += 5

  if (skill.downloads > 10000) score += 10
  else if (skill.downloads > 1000) score += 5

  if (skill.rating >= 4.8) score += 10
  else if (skill.rating >= 4.5) score += 5

  if (skill.verified) score += 5

  return score
}

function generateReasoning(skill: SkillRecord, score: number): string {
  const parts: string[] = []

  if (skill.github_stars > 10000) {
    parts.push(`${(skill.github_stars / 1000).toFixed(0)}K GitHub stars`)
  }
  if (skill.downloads > 10000) {
    parts.push(`${(skill.downloads / 1000).toFixed(0)}K+ downloads`)
  }
  if (skill.rating >= 4.5) {
    parts.push(`${skill.rating}/5 rating`)
  }
  if (skill.verified) {
    parts.push('verified author')
  }

  const quality = score > 80 ? 'Strong match' : score > 50 ? 'Good match' : 'Partial match'
  return `${quality}. ${parts.join(', ')}. ${skill.description}`
}
