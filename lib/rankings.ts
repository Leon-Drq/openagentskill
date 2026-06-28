import type { SkillAgentStats, SkillOutcomeStats, SkillRecord } from '@/lib/db/skills'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import { dedupeRankedSkills } from '@/lib/registry'
import { USE_CASES, getUseCaseBySlug, scoreSkillForUseCase } from '@/lib/use-cases'

export type RankingKind =
  | 'highest-quality'
  | 'most-starred'
  | 'recently-updated'
  | 'new-this-week'
  | 'agent-usage'
  | 'use-case'

export interface RankingDefinition {
  slug: string
  title: string
  shortTitle: string
  eyebrow: string
  description: string
  kind: RankingKind
  useCaseSlug?: string
}

export interface RankedSkill {
  skill: SkillRecord
  rank: number
  score: number
  reason: string
  badge: string
}

export const CORE_RANKINGS: RankingDefinition[] = [
  {
    slug: 'agent-proven',
    title: 'Agent-proven AI agent skills',
    shortTitle: 'Agent proven',
    eyebrow: 'Outcome evidence',
    description:
      'Skills ranked by real agent outcome reports, install attempts, success rate, risk blocks, setup friction, and Trust Score.',
    kind: 'agent-usage',
  },
  {
    slug: 'highest-quality-agent-skills',
    title: 'Highest quality AI agent skills',
    shortTitle: 'Highest quality',
    eyebrow: 'Recommended',
    description:
      'Skills with the strongest blend of adoption, freshness, metadata quality, and agent usage signals.',
    kind: 'highest-quality',
  },
  {
    slug: 'most-starred-agent-skills',
    title: 'Most starred AI agent skills',
    shortTitle: 'Most starred',
    eyebrow: 'GitHub adoption',
    description:
      'The highest-starred skill candidates in OpenAgentSkill, filtered to avoid MCP protocol-server projects.',
    kind: 'most-starred',
  },
  {
    slug: 'recently-updated-agent-skills',
    title: 'Recently updated AI agent skills',
    shortTitle: 'Recently updated',
    eyebrow: 'Freshness',
    description:
      'High-signal skills that have recent GitHub activity and are worth checking for actively maintained workflows.',
    kind: 'recently-updated',
  },
  {
    slug: 'new-agent-skills-this-week',
    title: 'New AI agent skills this week',
    shortTitle: 'New this week',
    eyebrow: 'Launch batch',
    description:
      'Freshly indexed skills from the latest OpenAgentSkill import runs, useful for spotting new additions early.',
    kind: 'new-this-week',
  },
  {
    slug: 'proven-agent-usage',
    title: 'AI agent skills with proven usage',
    shortTitle: 'Proven usage',
    eyebrow: 'Agent telemetry',
    description:
      'Skills with reported agent calls and success signals, ranked by real usage when feedback data is available.',
    kind: 'agent-usage',
  },
]

export function getRankingDefinitions(): RankingDefinition[] {
  const useCaseRankings = USE_CASES.map((useCase) => ({
    slug: `best-${useCase.slug}-skills`,
    title: `Best ${useCase.shortTitle.toLowerCase()} skills for AI agents`,
    shortTitle: useCase.shortTitle,
    eyebrow: useCase.eyebrow,
    description: useCase.description,
    kind: 'use-case' as const,
    useCaseSlug: useCase.slug,
  }))

  return [...CORE_RANKINGS, ...useCaseRankings]
}

export function getRankingDefinition(slug: string) {
  return getRankingDefinitions().find((ranking) => ranking.slug === slug)
}

function dateValue(value: string | null | undefined) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function daysSince(value: string | null | undefined) {
  const timestamp = dateValue(value)
  if (!timestamp) return Number.POSITIVE_INFINITY
  return Math.max(0, (Date.now() - timestamp) / 86_400_000)
}

function freshnessScore(value: string | null | undefined) {
  const days = daysSince(value)
  if (!Number.isFinite(days)) return 0
  return Math.max(0, 100 - Math.min(100, days * 2))
}

function compactStars(skill: SkillRecord) {
  return `${formatCompactNumber(skill.github_stars || 0)} stars`
}

function reasonForUseCase(skill: SkillRecord, score: number) {
  const quality = getSkillQualityProfile(skill)
  return `${quality.label} quality, ${compactStars(skill)}, and a ${Math.round(score)} use-case fit score.`
}

function rankByUseCase(
  skills: SkillRecord[],
  definition: RankingDefinition,
  limit: number
): RankedSkill[] {
  const useCase = definition.useCaseSlug ? getUseCaseBySlug(definition.useCaseSlug) : null
  if (!useCase) return []

  const scored = skills
    .map((skill) => ({ skill, score: scoreSkillForUseCase(skill, useCase) }))
    .filter((item) => item.score >= 6)
    .sort((a, b) => b.score - a.score || b.skill.github_stars - a.skill.github_stars)

  return dedupeRankedSkills(scored)
    .slice(0, limit)
    .map((item, index) => ({
      skill: item.skill,
      rank: index + 1,
      score: item.score,
      badge: `${Math.round(item.score)} fit`,
      reason: reasonForUseCase(item.skill, item.score),
    }))
}

export function rankSkillsForDefinition(
  skills: SkillRecord[],
  definition: RankingDefinition,
  statsMap: Record<string, SkillAgentStats | SkillOutcomeStats> = {},
  limit = 24
): RankedSkill[] {
  if (definition.kind === 'use-case') {
    return rankByUseCase(skills, definition, limit)
  }

  const now = Date.now()
  const weekAgo = now - 7 * 86_400_000

  const scored = skills
    .map((skill) => {
      const quality = getSkillQualityProfile(skill, statsMap[skill.slug] || null)
      const stats = statsMap[skill.slug]
      const totalUsage = stats
        ? 'total_outcomes' in stats
          ? stats.total_outcomes
          : stats.total_calls
        : 0
      const failures = stats && 'failed_outcomes' in stats ? Number(stats.failed_outcomes || 0) : 0
      const notRelevant = stats && 'not_relevant_outcomes' in stats ? Number(stats.not_relevant_outcomes || 0) : 0
      const riskBlocked = stats && 'risk_blocked_outcomes' in stats ? Number(stats.risk_blocked_outcomes || 0) : 0
      const setupRequired = stats && 'setup_required_outcomes' in stats ? Number(stats.setup_required_outcomes || 0) : 0
      const uniqueAgents = stats && 'unique_agents' in stats ? stats.unique_agents : 0
      const installAttempts = stats && 'install_attempts' in stats ? stats.install_attempts : 0
      const lastPushedScore = freshnessScore(skill.github_last_pushed_at || skill.updated_at)
      const createdAt = dateValue(skill.created_at)
      const isNewThisWeek = createdAt >= weekAgo
      const successRate =
        stats?.success_rate === null || stats?.success_rate === undefined
          ? null
          : Number(stats.success_rate)
      const usageScore =
        totalUsage > 0
          ? Math.min(30, Math.log10(totalUsage + 1) * 18) +
            Math.max(0, successRate || 0) * 0.45 +
            Math.min(12, Math.log10(installAttempts + 1) * 8) +
            uniqueAgents * 4 +
            quality.score * 0.25 +
            Math.min(8, Math.log10(Math.max(1, skill.github_stars || 1)) * 2) -
            Math.min(30, riskBlocked * 5 + setupRequired * 3 + failures * 2.5 + notRelevant * 4)
          : quality.score * 0.12 + Math.min(8, Math.log10(Math.max(1, skill.github_stars || 1)) * 2)

      switch (definition.kind) {
        case 'most-starred':
          return {
            skill,
            score: Number(skill.github_stars || 0),
            badge: compactStars(skill),
            reason: `${compactStars(skill)} and ${quality.label.toLowerCase()} quality signals.`,
          }
        case 'recently-updated':
          return {
            skill,
            score: lastPushedScore + quality.score / 5 + Math.log10(Math.max(1, skill.github_stars || 1)),
            badge: `${Math.round(lastPushedScore)} fresh`,
            reason: `Recently pushed, ${quality.label.toLowerCase()} quality, and ${compactStars(skill)}.`,
          }
        case 'new-this-week':
          return {
            skill,
            score: (isNewThisWeek ? 100 : 0) + dateValue(skill.created_at) / 1_000_000_000 + quality.score / 10,
            badge: isNewThisWeek ? 'New this week' : 'Recently indexed',
            reason: `Indexed recently with ${quality.label.toLowerCase()} quality and ${compactStars(skill)}.`,
          }
        case 'agent-usage':
          return {
            skill,
            score: usageScore + quality.score / 10,
            badge: totalUsage ? `${formatCompactNumber(totalUsage)} outcomes` : 'Needs first outcome',
            reason: totalUsage
              ? `${formatCompactNumber(totalUsage)} agent outcomes, ${successRate ?? 'unknown'}% success, ${formatCompactNumber(installAttempts)} install attempts, ${riskBlocked} risk blocks, and ${quality.label.toLowerCase()} quality.`
              : `No public outcome reports yet. ${quality.label} quality and ${compactStars(skill)} make it ready for a first sandbox run.`,
          }
        case 'highest-quality':
        default:
          return {
            skill,
            score: quality.score + Math.log10(Math.max(1, skill.github_stars || 1)),
            badge: `${quality.label} · ${quality.score}`,
            reason: `${quality.summary} ${compactStars(skill)}.`,
          }
      }
    })
    .sort((a, b) => {
      if (definition.kind === 'new-this-week') {
        return b.score - a.score || dateValue(b.skill.created_at) - dateValue(a.skill.created_at)
      }
      return b.score - a.score || b.skill.github_stars - a.skill.github_stars
    })

  return dedupeRankedSkills(scored)
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }))
}

export function getRankingCompareHref(rankedSkills: RankedSkill[]) {
  const slugs = rankedSkills.slice(0, 4).map((item) => item.skill.slug).join(',')
  return `/compare?skills=${encodeURIComponent(slugs)}`
}
