import type { SkillEventStats, SkillRecord } from '@/lib/db/skills'
import { getFreshnessDays, getPlatformHints, getSkillQualityProfile } from '@/lib/quality'
import { getUseCasesForSkill } from '@/lib/use-cases'

export interface SkillDecisionProfile {
  readinessScore: number
  readinessLabel: 'Production-ready' | 'Strong shortlist' | 'Prototype first' | 'Needs manual review'
  primaryFit: string
  bestFor: string[]
  notIdealFor: string[]
  riskNotes: string[]
  recommendation: string
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function getReadinessLabel(score: number): SkillDecisionProfile['readinessLabel'] {
  if (score >= 84) return 'Production-ready'
  if (score >= 72) return 'Strong shortlist'
  if (score >= 58) return 'Prototype first'
  return 'Needs manual review'
}

export function getSkillDecisionProfile(
  skill: SkillRecord,
  eventStats?: SkillEventStats | null
): SkillDecisionProfile {
  const quality = getSkillQualityProfile(skill)
  const freshnessDays = getFreshnessDays(skill.github_last_pushed_at || skill.updated_at)
  const useCases = getUseCasesForSkill(skill, 3)
  const platformHints = getPlatformHints(skill)
  const hasAdoption = Number(skill.github_stars || 0) >= 500
  const hasRecentPush = freshnessDays !== null && freshnessDays <= 180
  const hasEngagement = Boolean(eventStats && eventStats.total_events > 0)
  const hasInstall = Boolean(skill.install_command || skill.github_repo)

  let readinessScore = quality.score
  readinessScore += hasAdoption ? 4 : -8
  readinessScore += hasRecentPush ? 4 : -5
  readinessScore += hasEngagement ? Math.min(6, Math.log10(Math.max(1, eventStats?.total_events || 0)) * 3) : 0
  readinessScore += hasInstall ? 3 : -10
  readinessScore = clampScore(readinessScore)

  const bestFor = [
    useCases[0] ? `${useCases[0].shortTitle} workflows` : `${skill.category} workflows`,
    platformHints[0] ? `${platformHints[0]} teams` : 'general agent builders',
    hasAdoption ? 'teams that value GitHub adoption signals' : 'builders willing to evaluate younger projects',
  ]

  const notIdealFor = [
    freshnessDays !== null && freshnessDays > 365
      ? 'teams that require actively maintained dependencies'
      : 'teams that need a vendor-supported SLA',
    quality.warnings.length > 0
      ? 'production agents without a repository review'
      : 'high-compliance environments without internal security review',
  ]

  const riskNotes = [
    ...quality.warnings.slice(0, 3),
    !hasEngagement ? 'No OpenAgentSkill engagement data yet' : null,
    freshnessDays === null ? 'Missing GitHub freshness metadata' : null,
  ].filter((note): note is string => Boolean(note))

  const readinessLabel = getReadinessLabel(readinessScore)

  return {
    readinessScore,
    readinessLabel,
    primaryFit: useCases[0]?.shortTitle || skill.category,
    bestFor,
    notIdealFor,
    riskNotes: riskNotes.length > 0 ? riskNotes : ['No major risk signals from current metadata'],
    recommendation:
      readinessScore >= 84
        ? 'Use this as a leading candidate, then validate the README and install path in your own agent stack.'
        : readinessScore >= 72
          ? 'Shortlist this skill and compare it with close alternatives before production adoption.'
          : readinessScore >= 58
            ? 'Prototype with this skill first; keep a fallback candidate ready.'
            : 'Do a manual repository review before adding this to an agent workflow.',
  }
}

export function getCompareDecisionSummary(
  skills: SkillRecord[],
  eventStatsMap: Record<string, SkillEventStats> = {}
) {
  const ranked = skills
    .map((skill) => ({
      skill,
      decision: getSkillDecisionProfile(skill, eventStatsMap[skill.slug] || null),
    }))
    .sort((a, b) => b.decision.readinessScore - a.decision.readinessScore || b.skill.github_stars - a.skill.github_stars)

  const winner = ranked[0]
  const fastestPrototype = [...ranked].sort((a, b) => {
    const aInstall = a.skill.install_command || a.skill.github_repo ? 1 : 0
    const bInstall = b.skill.install_command || b.skill.github_repo ? 1 : 0
    return bInstall - aInstall || b.skill.github_stars - a.skill.github_stars
  })[0]
  const freshest = [...ranked].sort((a, b) => {
    const aDays = getFreshnessDays(a.skill.github_last_pushed_at || a.skill.updated_at) ?? Number.POSITIVE_INFINITY
    const bDays = getFreshnessDays(b.skill.github_last_pushed_at || b.skill.updated_at) ?? Number.POSITIVE_INFINITY
    return aDays - bDays
  })[0]

  return {
    ranked,
    winner,
    fastestPrototype,
    freshest,
    summary: winner
      ? `${winner.skill.name} is the strongest overall pick here because it has a ${winner.decision.readinessScore}/100 readiness score and fits ${winner.decision.primaryFit}.`
      : 'Add at least two skills to get a decision summary.',
  }
}
