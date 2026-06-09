import { NextRequest, NextResponse } from 'next/server'
import { getAllSkills, getSkillEventStatsMap, type SkillEventStats, type SkillRecord } from '@/lib/db/skills'
import { SKILL_STACKS, type SkillStackDefinition } from '@/lib/collections'
import { getSkillQualityProfile } from '@/lib/quality'
import { getSkillDecisionProfile } from '@/lib/decision'
import { getUseCasesForSkill, scoreSkillForUseCase, USE_CASES } from '@/lib/use-cases'

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
    const [allSkills, eventStatsMap] = await Promise.all([
      getAllSkills(),
      getSkillEventStatsMap().catch((): Record<string, SkillEventStats> => ({})),
    ])
    const stackMatches = SKILL_STACKS
      .map((stack) => ({
        stack,
        score: calculateStackRelevance(stack, task),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)

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
            name: `${recommendations[0]?.skill.slug}-agent-stack`,
            description: `Start with ${recommendations[0]?.skill.name}, then add ${recommendations
              .slice(1)
              .map((item) => item.skill.name)
              .join(' + ')} only if the workflow needs extra coverage.`,
            skills: topSlugs,
            steps: [
              `Prototype the task with ${recommendations[0]?.skill.name} as the primary skill.`,
              'Add the second skill only if the first one leaves a capability gap.',
              'Keep the third skill as a fallback during evaluation instead of installing everything at once.',
            ],
          }
        : null

    return NextResponse.json({
      task,
      recommendations: recommendations.map((r, index) => {
        const decision = getSkillDecisionProfile(r.skill, eventStatsMap[r.skill.slug] || null)
        const useCases = getUseCasesForSkill(r.skill, 2)
        return {
          rank: index + 1,
          skill: r.skill.name,
          slug: r.skill.slug,
          description: r.skill.description,
          confidence: Math.min(r.score / 100, 1.0).toFixed(2),
          match_label: getMatchLabel(r.score),
          install: r.skill.install_command || `npx skills add ${r.skill.github_repo}`,
          repository: r.skill.repository,
          stats: {
            stars: r.skill.github_stars,
            downloads: r.skill.downloads,
            rating: r.skill.rating,
            quality_score: Number(r.skill.quality_score || 0),
          },
          quality: getSkillQualityProfile(r.skill),
          decision: {
            readiness_score: decision.readinessScore,
            readiness_label: decision.readinessLabel,
            headline: decision.decisionHeadline,
            role: decision.agentRole,
            adoption_stage: decision.adoptionStage,
            primary_fit: decision.primaryFit,
            best_for: decision.bestFor,
            risks: decision.riskNotes,
            proof_points: decision.proofPoints,
            next_steps: decision.implementationPlan,
          },
          use_cases: useCases.map((useCase) => ({
            slug: useCase.slug,
            title: useCase.shortTitle,
            url: `https://www.openagentskill.com/use-cases/${useCase.slug}`,
          })),
          reasoning: generateReasoning(r.skill, r.score),
        }
      }),
      suggested_composition: compositionSuggestion,
      suggested_stacks: stackMatches.map(({ stack }) => ({
        slug: stack.slug,
        name: stack.title,
        url: `https://www.openagentskill.com/collections/${stack.slug}`,
        use_case: stack.useCaseSlug,
      })),
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
  const normalizedTask = task.toLowerCase()
  const fullSkillText = `${nameDesc} ${tags.join(' ')} ${category}`

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

  const matchedUseCases = USE_CASES
    .map((useCase) => {
      let useCaseScore = 0
      if (normalizedTask.includes(useCase.shortTitle.toLowerCase())) useCaseScore += 24
      if (normalizedTask.includes(useCase.slug.replace(/-/g, ' '))) useCaseScore += 18
      for (const keyword of useCase.keywords) {
        const normalizedKeyword = keyword.toLowerCase()
        if (normalizedTask.includes(normalizedKeyword)) {
          useCaseScore += normalizedKeyword.includes(' ') ? 14 : 8
        }
      }
      return { useCase, useCaseScore }
    })
    .filter((item) => item.useCaseScore > 0)
    .sort((a, b) => b.useCaseScore - a.useCaseScore)
    .slice(0, 2)

  for (const { useCase, useCaseScore } of matchedUseCases) {
    const skillUseCaseScore = scoreSkillForUseCase(skill, useCase)
    score += Math.min(60, skillUseCaseScore * Math.min(4, Math.max(1, useCaseScore / 12)))
  }

  const isGenericWebTask = /\b(websites?|web pages?|html|crawl|crawler|scrape|scraper|web scraping)\b/.test(normalizedTask)
  const isGenericWebSkill = /\b(web-crawling|crawler|crawl|scraper|scrape|browser|playwright|puppeteer|html|markdown)\b/.test(fullSkillText)
  const isLLMWebSkill = /\b(llm-friendly|llm friendly|web crawler|web scraper|turn.*markdown|markdown)\b/.test(fullSkillText)
  const isPlatformSpecificExtractor = /\b(streaming|youtube|google play|google maps|app store|twitter|reddit|spotify|instagram|tiktok)\b/.test(fullSkillText)

  if (isGenericWebTask && isGenericWebSkill) score += 35
  if (isGenericWebTask && isLLMWebSkill) score += 30
  if (isGenericWebTask && isGenericWebSkill && skill.github_stars > 10_000) score += 25
  if (isGenericWebTask && isPlatformSpecificExtractor) score -= 45

  // Boost by popularity signals
  if (skill.github_stars > 10000) score += 15
  else if (skill.github_stars > 1000) score += 10
  else if (skill.github_stars > 100) score += 5

  if (skill.downloads > 10000) score += 10
  else if (skill.downloads > 1000) score += 5

  if (skill.rating >= 4.8) score += 10
  else if (skill.rating >= 4.5) score += 5

  if (skill.verified) score += 5

  score += Math.min(20, Number(skill.quality_score || 0) / 5)

  return score
}

function getMatchLabel(score: number): string {
  if (score >= 90) return 'Strong task match'
  if (score >= 65) return 'Good task match'
  if (score >= 35) return 'Useful shortlist'
  return 'Partial match'
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
  if (skill.quality_score > 0) {
    parts.push(`${Math.round(skill.quality_score)} quality score`)
  }

  const evidence = parts.length > 0 ? parts.join(', ') : 'limited public signals'
  return `${getMatchLabel(score)}. Evidence: ${evidence}. ${skill.description}`
}

function calculateStackRelevance(stack: SkillStackDefinition, task: string): number {
  const taskWords = task
    .toLowerCase()
    .split(/[\s+,.\-_]+/)
    .filter((word) => word.length > 2)
  const text = [
    stack.title,
    stack.description,
    stack.persona,
    stack.useCaseSlug,
    ...stack.keywords,
    ...stack.outcomes,
    ...stack.idealFor,
  ].join(' ').toLowerCase()

  return taskWords.reduce((score, word) => score + (text.includes(word) ? 10 : 0), 0)
}
