import type { SkillOutcomeStats } from '@/lib/db/skills'

export type AgentProvenTier = 'proven' | 'promising' | 'early' | 'unproven' | 'review'

export interface AgentProvenProfile {
  version: 'agent-proven-v1'
  score: number
  tier: AgentProvenTier
  label: string
  summary: string
  metrics: {
    totalOutcomes: number
    successfulOutcomes: number
    failedOutcomes: number
    installAttempts: number
    installSuccessRate: number | null
    successRate: number | null
    recentSuccessRate: number | null
    recentFailureRate: number | null
    riskBlocked: number
    setupRequired: number
    notRelevant: number
    avgOutputQuality: number | null
    avgTimeToUsefulMs: number | null
    productionOutcomes: number
    humanReviewRequired: number
    uniqueAgents: number
    lastOutcomeAt: string | null
  }
  signals: string[]
  penalties: string[]
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function numberOrZero(value: unknown) {
  return numberOrNull(value) ?? 0
}

function compactPercent(value: number | null) {
  return value === null ? 'unknown' : `${Math.round(value)}%`
}

export function getAgentProvenProfile(stats: SkillOutcomeStats | null | undefined): AgentProvenProfile {
  const totalOutcomes = numberOrZero(stats?.total_outcomes)
  const successfulOutcomes = numberOrZero(stats?.successful_outcomes)
  const failedOutcomes = numberOrZero(stats?.failed_outcomes)
  const installAttempts = numberOrZero(stats?.install_attempts)
  const riskBlocked = numberOrZero(stats?.risk_blocked_outcomes)
  const setupRequired = numberOrZero(stats?.setup_required_outcomes)
  const notRelevant = numberOrZero(stats?.not_relevant_outcomes)
  const successRate = numberOrNull(stats?.success_rate)
  const recentSuccessRate = numberOrNull(stats?.recent_success_rate)
  const recentFailureRate = numberOrNull(stats?.recent_failure_rate)
  const installSuccessRate = numberOrNull(stats?.install_success_rate)
  const avgOutputQuality = numberOrNull(stats?.avg_output_quality)
  const avgTimeToUsefulMs = numberOrNull(stats?.avg_time_to_useful_ms)
  const productionOutcomes = numberOrZero(stats?.production_outcomes)
  const humanReviewRequired = numberOrZero(stats?.human_review_required_outcomes)
  const lowQualityOutcomes = numberOrZero(stats?.low_quality_outcomes)
  const uniqueAgents = numberOrZero(stats?.unique_agents)
  const storedScore = numberOrNull(stats?.agent_proven_score)

  const signals: string[] = []
  const penalties: string[] = []

  if (totalOutcomes <= 0) {
    return {
      version: 'agent-proven-v1',
      score: 0,
      tier: 'unproven',
      label: 'Needs first agent run',
      summary: 'No agent outcome reports yet. Use Resolve, run one narrow sandbox task, then report the result.',
      metrics: {
        totalOutcomes: 0,
        successfulOutcomes: 0,
        failedOutcomes: 0,
        installAttempts: 0,
        installSuccessRate: null,
        successRate: null,
        recentSuccessRate: null,
        recentFailureRate: null,
        riskBlocked: 0,
        setupRequired: 0,
        notRelevant: 0,
        avgOutputQuality: null,
        avgTimeToUsefulMs: null,
        productionOutcomes: 0,
        humanReviewRequired: 0,
        uniqueAgents: 0,
        lastOutcomeAt: null,
      },
      signals,
      penalties: ['No real agent outcome evidence yet'],
    }
  }

  const priorSuccessRate = 68
  const priorWeight = 5
  const bayesianSuccessRate =
    ((successfulOutcomes + (priorSuccessRate / 100) * priorWeight) /
      Math.max(1, totalOutcomes + priorWeight)) * 100
  const effectiveSuccessRate = recentSuccessRate !== null && numberOrZero(stats?.recent_outcomes_30d) >= 3
    ? recentSuccessRate * 0.62 + bayesianSuccessRate * 0.38
    : bayesianSuccessRate

  let score =
    22 +
    Math.min(18, Math.log10(totalOutcomes + 1) * 11) +
    Math.min(12, Math.log10(installAttempts + 1) * 8) +
    (effectiveSuccessRate - 55) * 0.52

  if (installSuccessRate !== null) score += (installSuccessRate - 60) * 0.12
  if (avgOutputQuality !== null) score += (avgOutputQuality - 3) * 5
  score += Math.min(7, productionOutcomes * 1.5)
  score += Math.min(6, uniqueAgents * 1.5)

  score -= Math.min(22, riskBlocked * 4)
  score -= Math.min(16, setupRequired * 2.4)
  score -= Math.min(16, notRelevant * 3)
  score -= Math.min(12, failedOutcomes * 1.8)
  score -= Math.min(10, lowQualityOutcomes * 2.5)
  score -= Math.min(8, humanReviewRequired * 1.5)
  if (recentFailureRate !== null && recentFailureRate >= 45) score -= 8

  const finalScore = storedScore !== null && totalOutcomes > 0
    ? clampScore(storedScore)
    : clampScore(totalOutcomes < 3 ? Math.min(score, 78) : score)

  if (successRate !== null) signals.push(`${compactPercent(successRate)} all-time success`)
  if (recentSuccessRate !== null) signals.push(`${compactPercent(recentSuccessRate)} recent success`)
  if (installAttempts > 0) signals.push(`${installAttempts.toLocaleString()} install attempt${installAttempts === 1 ? '' : 's'}`)
  if (avgOutputQuality !== null) signals.push(`${avgOutputQuality.toFixed(1)}/5 average output quality`)
  if (productionOutcomes > 0) signals.push(`${productionOutcomes.toLocaleString()} production outcome${productionOutcomes === 1 ? '' : 's'}`)
  if (uniqueAgents > 0) signals.push(`${uniqueAgents.toLocaleString()} agent surface${uniqueAgents === 1 ? '' : 's'}`)

  if (riskBlocked > 0) penalties.push(`${riskBlocked.toLocaleString()} risk block${riskBlocked === 1 ? '' : 's'}`)
  if (setupRequired > 0) penalties.push(`${setupRequired.toLocaleString()} setup-required report${setupRequired === 1 ? '' : 's'}`)
  if (notRelevant > 0) penalties.push(`${notRelevant.toLocaleString()} not-relevant report${notRelevant === 1 ? '' : 's'}`)
  if (failedOutcomes > 0) penalties.push(`${failedOutcomes.toLocaleString()} failed run${failedOutcomes === 1 ? '' : 's'}`)
  if (humanReviewRequired > 0) penalties.push(`${humanReviewRequired.toLocaleString()} human-review flag${humanReviewRequired === 1 ? '' : 's'}`)

  let tier: AgentProvenTier = 'early'
  let label = 'Early agent signal'
  if (finalScore >= 82 && totalOutcomes >= 5 && riskBlocked === 0) {
    tier = 'proven'
    label = 'Agent proven'
  } else if (finalScore >= 68) {
    tier = 'promising'
    label = 'Promising agent evidence'
  } else if (finalScore < 48 && totalOutcomes >= 3) {
    tier = 'review'
    label = 'Needs agent review'
  }

  const summary = `${label}: ${totalOutcomes.toLocaleString()} outcome${totalOutcomes === 1 ? '' : 's'}, ${compactPercent(successRate)} success, Agent Proven Score ${finalScore}/100.`

  return {
    version: 'agent-proven-v1',
    score: finalScore,
    tier,
    label,
    summary,
    metrics: {
      totalOutcomes,
      successfulOutcomes,
      failedOutcomes,
      installAttempts,
      installSuccessRate,
      successRate,
      recentSuccessRate,
      recentFailureRate,
      riskBlocked,
      setupRequired,
      notRelevant,
      avgOutputQuality,
      avgTimeToUsefulMs,
      productionOutcomes,
      humanReviewRequired,
      uniqueAgents,
      lastOutcomeAt: stats?.last_outcome_at || null,
    },
    signals: signals.slice(0, 6),
    penalties: penalties.slice(0, 6),
  }
}

export function getAgentProvenRankingBoost(stats: SkillOutcomeStats | null | undefined) {
  const profile = getAgentProvenProfile(stats)
  if (profile.metrics.totalOutcomes <= 0) return 0

  const confidence = Math.min(1, Math.log10(profile.metrics.totalOutcomes + 1) / 1.1)
  const centeredScore = (profile.score - 50) * 0.38
  const evidenceBoost = Math.min(16, Math.log10(profile.metrics.totalOutcomes + 1) * 9)
  const installBoost = Math.min(10, Math.log10(profile.metrics.installAttempts + 1) * 6)
  const productionBoost = Math.min(6, profile.metrics.productionOutcomes * 1.4)
  const riskPenalty =
    Math.min(18, profile.metrics.riskBlocked * 4 + profile.metrics.setupRequired * 2 + profile.metrics.notRelevant * 3)

  return Math.round((centeredScore * confidence + evidenceBoost + installBoost + productionBoost - riskPenalty) * 10) / 10
}
