import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import { getAllSkills, type SkillEventStats, type SkillRecord } from '@/lib/db/skills'
import { SKILL_STACKS, type SkillStackDefinition } from '@/lib/collections'
import { getSkillInstallTargets } from '@/lib/install-targets'
import { getSkillQualityProfile } from '@/lib/quality'
import { dedupeRankedSkills, getRecommendationReasons, normalizeMatchScore } from '@/lib/registry'
import { getSkillDecisionProfile } from '@/lib/decision'
import { getSkillSupplyProfile } from '@/lib/supply'
import { getSkillTrustProfile } from '@/lib/trust'
import { getUseCasesForSkill, scoreSkillForUseCase, USE_CASES } from '@/lib/use-cases'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'

const AGENT_RECOMMEND_CANDIDATE_LIMIT = 240
const AGENT_RECOMMEND_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
  'X-Agent-Friendly': 'true',
}

// This public endpoint can receive many unique task prompts from agents. Keep
// the shared candidate set small and durable so one request does not scan the
// entire registry or contend with the ingestion worker.
const getAgentRecommendCandidatePool = unstable_cache(
  async () => {
    try {
      return await getAllSkills('quality', undefined, AGENT_RECOMMEND_CANDIDATE_LIMIT)
    } catch (error) {
      // Recommendations remain useful from the maintained shortlist while
      // Supabase recovers, instead of repeatedly failing cache revalidation.
      console.warn('Agent recommend cache fallback:', error)
      return CURATED_SKILL_SNAPSHOT
    }
  },
  ['agent-recommend-candidate-pool-v2'],
  { revalidate: 300 }
)

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
  const parsedLimit = parseInt(searchParams.get('limit') || '3', 10)
  const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 3, 1), 10)
  const format = searchParams.get('format') || 'json'

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
    const allSkills = await getAgentRecommendCandidatePool()
    // Aggregate event-stat views are intentionally omitted from this public
    // hot path. Selected results still get deterministic trust and audit data,
    // while detailed live resolve endpoints can enrich with outcome signals.
    const eventStatsMap: Record<string, SkillEventStats> = {}
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

    const candidates = dedupeRankedSkills(scored)
      .filter((item) => item.score > 0)
      .map((item) => {
        const eventStats = eventStatsMap[item.skill.slug] || null
        const audit = buildSkillAudit(item.skill, eventStats)
        const safety = getAgentSafetyProfile(item.skill, audit, {
          max_risk: 'medium',
          needs_install_command: true,
        })
        const gateBoost =
          safety.safety_tier.tier === 'verified'
            ? 22
            : safety.safety_tier.tier === 'reviewed'
              ? 12
              : safety.safety_tier.tier === 'experimental'
                ? -10
                : -100

        return {
          ...item,
          eventStats,
          audit,
          safety,
          safety_adjusted_score: item.score + gateBoost,
        }
      })
      .sort((a, b) => b.safety_adjusted_score - a.safety_adjusted_score)

    const recommendations = candidates.filter((item) => !item.safety.blocked).slice(0, limit)
    const topRecommendationScore = Math.max(
      ...recommendations.map((item) => item.score),
      candidates[0]?.score || 0
    )
    const blockedCandidates = candidates
      .filter((item) => item.safety.blocked)
      .slice(0, 5)
      .map((item) => ({
        slug: item.skill.slug,
        name: item.skill.name,
        match_score: normalizeMatchScore(item.score, topRecommendationScore),
        raw_match_score: item.score,
        safety_gate: item.safety.safety_tier,
        url: `https://www.openagentskill.com/skills/${item.skill.slug}/audit`,
      }))

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

    const payload = {
      task,
      recommendations: recommendations.map((r, index) => {
        const eventStats = r.eventStats
        const decision = getSkillDecisionProfile(r.skill, eventStats)
        const useCases = getUseCasesForSkill(r.skill, 2)
        const trust = getSkillTrustProfile(r.skill, false, eventStats)
        const audit = r.audit
        const safety = r.safety
        const supplyProfile = getSkillSupplyProfile(r.skill, eventStats)
        const matchScore = normalizeMatchScore(r.score, topRecommendationScore)
        return {
          rank: index + 1,
          skill: r.skill.name,
          slug: r.skill.slug,
          description: r.skill.description,
          confidence: (matchScore / 100).toFixed(2),
          match_score: matchScore,
          raw_match_score: r.score,
          match_label: getMatchLabel(matchScore),
          safety_adjusted_score: r.safety_adjusted_score,
          install: r.skill.install_command || `npx skills add ${r.skill.github_repo}`,
          repository: r.skill.repository,
          stats: {
            stars: r.skill.github_stars,
            downloads: r.skill.downloads,
            rating: r.skill.rating,
            quality_score: Number(r.skill.quality_score || 0),
          },
          quality: getSkillQualityProfile(r.skill),
          trust,
          safety,
          safety_gate: {
            tier: safety.safety_tier.tier,
            label: safety.safety_tier.label,
            badge: safety.safety_tier.badge,
            auto_install_policy: safety.safety_tier.auto_install_policy,
            auto_install_allowed: safety.auto_install_allowed,
            human_review_required: safety.human_review_required,
            blocked: safety.blocked,
            recommended_action: safety.safety_tier.recommended_action,
            reasons: safety.safety_tier.reasons,
          },
          supply_profile: supplyProfile,
          audit: {
            audit_score: audit.audit_score,
            risk_level: audit.risk_level,
            risk_label: auditRiskLabel(audit.risk_level),
            warnings: audit.warnings.slice(0, 4),
          },
          install_targets: getSkillInstallTargets(r.skill),
          urls: {
            web: `https://www.openagentskill.com/skills/${r.skill.slug}`,
            api: `https://www.openagentskill.com/api/agent/skills/${r.skill.slug}`,
            install_api: `https://www.openagentskill.com/api/skills/${r.skill.slug}/install`,
            audit: `https://www.openagentskill.com/skills/${r.skill.slug}/audit`,
            repository: r.skill.repository,
          },
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
          recommendation_reasons: getRecommendationReasons(r.skill, task, matchScore),
          reasoning: generateReasoning(r.skill, matchScore),
        }
      }),
      blocked_candidates: blockedCandidates,
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
        blocked_candidates: blockedCandidates.length,
        safety_policy: 'Blocked candidates are excluded from recommendations. Verified and reviewed candidates receive ranking priority.',
        public_search_endpoint: 'https://www.openagentskill.com/api/skills/search',
        agent_friendly: true,
      },
    }

    if (format === 'text') {
      const text = payload.recommendations.map((item) => (
        `${item.rank}. ${item.skill} (${item.slug})\n` +
        `   Match: ${item.match_label} | Confidence: ${item.confidence}\n` +
        `   Safety: ${item.safety_gate.label} | Policy: ${item.safety_gate.auto_install_policy} | Score: ${item.safety.score}/100\n` +
        `   Supply: ${item.supply_profile.track.shortLabel} | Scenario: ${item.supply_profile.scenario.label} | Maintenance: ${item.supply_profile.maintenance.label}\n` +
        `   Trust: ${item.trust.score}/100 ${item.trust.label} | Audit: ${item.audit.audit_score}/100 ${item.audit.risk_label}\n` +
        `   Install: ${item.install}\n` +
        `   URL: ${item.urls.web}\n` +
        `   Reasoning: ${item.reasoning}`
      )).join('\n---\n')

      return new NextResponse(
        `OpenAgentSkill Recommendation API\nTask: ${payload.task}\nFound: ${payload.recommendations.length}\n---\n${text}`,
        {
          headers: {
            ...AGENT_RECOMMEND_CACHE_HEADERS,
            'Content-Type': 'text/plain; charset=utf-8',
          },
        }
      )
    }

    return NextResponse.json(payload, { headers: AGENT_RECOMMEND_CACHE_HEADERS })
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
  const isFinanceTask = /\b(finance|financial|quant|trading|portfolio|markets?|stocks?|equity|crypto|filings?|edgar|sec filings?|investor|earnings|10-k|10-q|alpha|factor|backtest|risk model)\b/.test(normalizedTask)
  const isFinanceSkill = /\b(finance|financial|quant|trading|portfolio|market-data|markets?|stocks?|equity|crypto|filings?|edgar|sec filing|investor|earnings|10-k|10-q|alpha|factor|backtest|risk model)\b/.test(fullSkillText)
  const isSecurityOnlySkill = /\b(security|vulnerability|scanner|nuclei|pentest|cve|sast|exploit|secret scanning)\b/.test(fullSkillText) && !isFinanceSkill
  const isSportsTask = /\b(sports?|football|soccer|world cup|fifa|matches?|players?|teams?|statsbomb|expected goals|xg|soccernet|scouting|prediction|transfermarkt)\b/.test(normalizedTask)
  const isSportsSkill = /\b(sports?|football|soccer|world cup|fifa|matches?|players?|teams?|statsbomb|expected goals|xg|soccernet|scouting|prediction|transfermarkt)\b/.test(fullSkillText)

  if (isGenericWebTask && isGenericWebSkill) score += 35
  if (isGenericWebTask && isLLMWebSkill) score += 30
  if (isGenericWebTask && isGenericWebSkill && skill.github_stars > 10_000) score += 25
  if (isGenericWebTask && isPlatformSpecificExtractor) score -= 45
  if (isFinanceTask && category === 'finance-quant') score += 85
  if (isFinanceTask && isFinanceSkill) score += 58
  if (isFinanceTask && isSecurityOnlySkill) score -= 90
  if (isSportsTask && category === 'sports-analytics') score += 85
  if (isSportsTask && isSportsSkill) score += 58

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
