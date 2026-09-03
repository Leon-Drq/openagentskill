import type { SkillAgentStats, SkillOutcomeStats, SkillRecord } from '@/lib/db/skills'
import { getAgentProvenProfile } from '@/lib/agent-proven'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import { dedupeRankedSkills } from '@/lib/registry'
import { evaluateSkillLikeness } from '@/lib/skill-likeness'
import { USE_CASES, getUseCaseBySlug, scoreSkillForUseCase } from '@/lib/use-cases'

export type RankingKind =
  | 'highest-quality'
  | 'most-starred'
  | 'recently-updated'
  | 'new-this-week'
  | 'agent-usage'
  | 'success-rate'
  | 'safe-auto-install'
  | 'agent-platform'
  | 'use-case'

export interface RankingDefinition {
  slug: string
  title: string
  shortTitle: string
  eyebrow: string
  description: string
  kind: RankingKind
  useCaseSlug?: string
  agentPlatform?: string
  entityScope?: 'project' | 'skill'
}

export interface RankedSkill {
  skill: SkillRecord
  rank: number
  score: number
  reason: string
  badge: string
  dimensions: RankingDimensions
}

export interface RankingDimensions {
  popularity: number
  quality: number
  freshness: number
  agentEvidence: number
  evidenceConfidence: number
  installReadiness: number
  fit: number | null
}

const MOJIBAKE_SEQUENCE = /(?:[\u00c2-\u00df][\u0080-\u00bf]|[\u00e0-\u00ef][\u0080-\u00bf]{2}|[\u00f0-\u00f4][\u0080-\u00bf]{3})+/g

export function normalizeRankingText(value: string | null | undefined) {
  const text = String(value || '')
  const repaired = text.replace(MOJIBAKE_SEQUENCE, (segment) =>
    Buffer.from(segment, 'latin1').toString('utf8')
  )

  return repaired
    .replaceAll('Â·', '|')
    .replaceAll('â', '-')
    .replaceAll('â', '-')
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
      'GitHub projects ordered by public star count. Each repository appears once, so one popular multi-skill repo cannot occupy the whole list.',
    kind: 'most-starred',
    entityScope: 'project',
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
  {
    slug: 'best-by-success-rate',
    title: 'Best AI agent skills by success rate',
    shortTitle: 'Success rate',
    eyebrow: 'Outcome quality',
    description:
      'Skills ranked by reported success rate, recent success, output quality, install success, and Trust Score.',
    kind: 'success-rate',
  },
  {
    slug: 'safest-auto-install-skills',
    title: 'Safest AI agent skills for auto install',
    shortTitle: 'Safe install',
    eyebrow: 'Install safety',
    description:
      'Skills with strong Trust Score, safe install paths, low risk blocks, clear licenses, and low setup friction.',
    kind: 'safe-auto-install',
  },
  {
    slug: 'best-codex-skills',
    title: 'Best Codex skills for AI agents',
    shortTitle: 'Codex',
    eyebrow: 'Agent surface',
    description:
      'Reusable skills and workflows that fit Codex-style coding, repository inspection, testing, automation, and install handoffs.',
    kind: 'agent-platform',
    agentPlatform: 'codex',
  },
  {
    slug: 'best-claude-code-skills',
    title: 'Best Claude Code skills for AI agents',
    shortTitle: 'Claude Code',
    eyebrow: 'Agent surface',
    description:
      'Reusable skills for Claude Code workflows, including coding agents, documentation, research, browser automation, and safe install review.',
    kind: 'agent-platform',
    agentPlatform: 'claude code',
  },
  {
    slug: 'best-cursor-skills',
    title: 'Best Cursor skills for AI agents',
    shortTitle: 'Cursor',
    eyebrow: 'Agent surface',
    description:
      'Skills that work well for Cursor-powered coding, frontend implementation, repo exploration, and developer productivity workflows.',
    kind: 'agent-platform',
    agentPlatform: 'cursor',
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

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10))
}

function weightedScore(
  dimensions: RankingDimensions,
  weights: Partial<Record<keyof RankingDimensions, number>>
) {
  let totalWeight = 0
  let total = 0

  for (const [key, weight] of Object.entries(weights) as Array<[
    keyof RankingDimensions,
    number,
  ]>) {
    const value = dimensions[key]
    if (value === null || weight <= 0) continue
    total += value * weight
    totalWeight += weight
  }

  return clampScore(totalWeight > 0 ? total / totalWeight : 0)
}

function popularityScore(stars: number) {
  // 100k stars is the top of the public popularity scale. Raw stars still
  // determine ties and the literal most-starred ordering.
  return clampScore((Math.log10(Math.max(0, stars) + 1) / 5) * 100)
}

function evidenceConfidenceScore(totalOutcomes: number, uniqueAgents: number) {
  if (totalOutcomes <= 0) return 0
  const sampleConfidence = Math.min(70, (Math.log10(totalOutcomes + 1) / Math.log10(21)) * 70)
  const agentDiversity = Math.min(30, uniqueAgents * 6)
  return clampScore(sampleConfidence + agentDiversity)
}

function installReadinessScore(skill: SkillRecord, riskPenalty = 0) {
  const command = String(skill.install_command || '')
  const repository = String(skill.repository || '')
  const license = String(skill.license || '').toLowerCase()
  let score = 25

  if (/^npx(?:\s+-y)?\s+skills(?:@latest)?\s+add\s+/i.test(command)) score += 40
  else if (command.trim()) score += 15
  if (/^https:\/\/github\.com\//i.test(repository)) score += 12
  if (license && license !== 'unknown') score += 13
  if (skill.verified) score += 10

  return clampScore(score - riskPenalty)
}

function buildDimensions(input: {
  skill: SkillRecord
  quality: number
  freshness: number
  evidence: number
  totalOutcomes: number
  uniqueAgents: number
  riskPenalty: number
  fit?: number | null
}): RankingDimensions {
  return {
    popularity: popularityScore(Number(input.skill.github_stars || 0)),
    quality: clampScore(input.quality),
    freshness: clampScore(input.freshness),
    agentEvidence: clampScore(input.evidence),
    evidenceConfidence: evidenceConfidenceScore(input.totalOutcomes, input.uniqueAgents),
    installReadiness: installReadinessScore(input.skill, input.riskPenalty),
    fit: input.fit === undefined || input.fit === null ? null : clampScore(input.fit),
  }
}

function compactStars(skill: SkillRecord) {
  return `${formatCompactNumber(skill.github_stars || 0)} stars`
}

function reasonForUseCase(skill: SkillRecord, score: number) {
  const quality = getSkillQualityProfile(skill)
  return `${quality.label} quality, ${compactStars(skill)}, and a ${Math.round(score)} use-case fit score.`
}

function getSkillLikeness(skill: SkillRecord) {
  return evaluateSkillLikeness({
    fullName: skill.github_repo,
    name: skill.name,
    description: skill.description,
    longDescription: skill.long_description,
    tagline: skill.tagline,
    tags: skill.tags,
    frameworks: skill.frameworks,
    language: skill.github_language,
    category: skill.category,
    stars: skill.github_stars,
  })
}

function rankingSkillPenalty(skill: SkillRecord) {
  const likeness = getSkillLikeness(skill)

  if (likeness.importReady && likeness.score >= 45) return 0
  if (likeness.importReady) return 6
  if (likeness.score >= 45 && Number(skill.github_stars || 0) < 50_000) return 8

  return 45
}

function rankByUseCase(
  skills: SkillRecord[],
  definition: RankingDefinition,
  limit: number
): RankedSkill[] {
  const useCase = definition.useCaseSlug ? getUseCaseBySlug(definition.useCaseSlug) : null
  if (!useCase) return []

  const scored = skills
    .map((skill) => {
      const rawFit = scoreSkillForUseCase(skill, useCase) - rankingSkillPenalty(skill) / 12
      const quality = getSkillQualityProfile(skill)
      const dimensions = buildDimensions({
        skill,
        quality: quality.score,
        freshness: freshnessScore(skill.github_last_pushed_at || skill.updated_at),
        evidence: 0,
        totalOutcomes: 0,
        uniqueAgents: 0,
        riskPenalty: 0,
        fit: rawFit,
      })
      return {
        skill,
        rawFit,
        dimensions,
        score: weightedScore(dimensions, {
          fit: 0.65,
          quality: 0.15,
          popularity: 0.08,
          freshness: 0.07,
          installReadiness: 0.05,
        }),
      }
    })
    .filter((item) => item.rawFit >= 6 && rankingSkillPenalty(item.skill) < 45)
    .sort((a, b) => b.score - a.score || b.rawFit - a.rawFit || b.skill.github_stars - a.skill.github_stars)

  return dedupeRankedSkills(scored)
    .slice(0, limit)
    .map((item, index) => ({
      skill: item.skill,
      rank: index + 1,
      score: item.score,
      badge: `${Math.round(item.score)} fit`,
      reason: reasonForUseCase(item.skill, item.dimensions.fit || 0),
      dimensions: item.dimensions,
    }))
}

function getGitHubProjectKey(skill: SkillRecord) {
  const raw = (skill.github_repo || skill.repository || '')
    .toLowerCase()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/^github\.com\//, '')
    .split(/[?#]/)[0]
    .replace(/\/$/, '')
  const [owner, repository] = raw.split('/')
  return owner && repository ? `${owner}/${repository}` : ''
}

function dedupeRankedProjects<T extends { skill: SkillRecord }>(items: T[]) {
  const projects = new Set<string>()
  return items.filter((item) => {
    const key = getGitHubProjectKey(item.skill)
    if (!key || projects.has(key)) return false
    projects.add(key)
    return true
  })
}

export function getUniqueProjectStarTotal(skills: SkillRecord[]) {
  const stars = new Map<string, number>()
  for (const skill of skills) {
    const key = getGitHubProjectKey(skill)
    if (!key) continue
    stars.set(key, Math.max(stars.get(key) || 0, Number(skill.github_stars || 0)))
  }
  return [...stars.values()].reduce((total, value) => total + value, 0)
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
      const outcomeStats = stats && 'total_outcomes' in stats ? stats : null
      const proven = getAgentProvenProfile(outcomeStats)
      const totalUsage = stats
        ? 'total_outcomes' in stats
          ? stats.total_outcomes
          : stats.total_calls
        : 0
      const failures = stats && 'failed_outcomes' in stats ? Number(stats.failed_outcomes || 0) : 0
      const notRelevant = stats && 'not_relevant_outcomes' in stats ? Number(stats.not_relevant_outcomes || 0) : 0
      const riskBlocked = stats && 'risk_blocked_outcomes' in stats ? Number(stats.risk_blocked_outcomes || 0) : 0
      const setupRequired = stats && 'setup_required_outcomes' in stats ? Number(stats.setup_required_outcomes || 0) : 0
      const uniqueAgents = stats && 'unique_agents' in stats ? Number(stats.unique_agents || 0) : 0
      const installAttempts = stats && 'install_attempts' in stats ? Number(stats.install_attempts || 0) : 0
      const lastPushedScore = freshnessScore(skill.github_last_pushed_at || skill.updated_at)
      const skillSpecificPenalty = rankingSkillPenalty(skill)
      const createdAt = dateValue(skill.created_at)
      const isNewThisWeek = createdAt >= weekAgo
      const successRate =
        stats?.success_rate === null || stats?.success_rate === undefined
          ? null
          : Number(stats.success_rate)
      const platformText = [
        skill.name,
        skill.description,
        skill.long_description,
        skill.category,
        skill.install_command,
        ...(skill.tags || []),
        ...(skill.frameworks || []),
      ].filter(Boolean).join(' ').toLowerCase()
      const exactPlatformHit = definition.agentPlatform
        ? platformText.includes(definition.agentPlatform.toLowerCase())
        : false
      const inferredPlatformHit = definition.agentPlatform
        ? (definition.agentPlatform === 'codex' && /\b(code|coding|repo|repository|github|test|review|frontend|backend)\b/.test(platformText)) ||
          (definition.agentPlatform === 'claude code' && /\b(claude|code|coding|docs?|research|browser|analysis)\b/.test(platformText)) ||
          (definition.agentPlatform === 'cursor' && /\b(cursor|code|coding|frontend|component|typescript|react|repo)\b/.test(platformText))
        : false
      const platformFit = exactPlatformHit ? 100 : inferredPlatformHit ? 68 : 0
      const riskPenalty = Math.min(
        100,
        riskBlocked * 25 + setupRequired * 10 + failures * 8 + notRelevant * 12
      )
      const dimensions = buildDimensions({
        skill,
        quality: quality.score,
        freshness: lastPushedScore,
        evidence: proven.score,
        totalOutcomes: Number(totalUsage || 0),
        uniqueAgents,
        riskPenalty,
        fit: definition.kind === 'agent-platform' ? platformFit : null,
      })

      switch (definition.kind) {
        case 'most-starred':
          return {
            skill,
            score: dimensions.popularity,
            sortScore: Number(skill.github_stars || 0),
            dimensions,
            badge: compactStars(skill),
            reason: `${compactStars(skill)} and ${quality.label.toLowerCase()} quality signals.`,
          }
        case 'recently-updated':
          return {
            skill,
            score: weightedScore(dimensions, {
              freshness: 0.6,
              quality: 0.2,
              popularity: 0.1,
              installReadiness: 0.1,
            }),
            sortScore: lastPushedScore * 10 + dateValue(skill.github_last_pushed_at || skill.updated_at) / 1_000_000_000_000,
            dimensions,
            badge: `${Math.round(lastPushedScore)} fresh`,
            reason: `Recently pushed, ${quality.label.toLowerCase()} quality, and ${compactStars(skill)}.`,
          }
        case 'new-this-week':
          return {
            skill,
            score: weightedScore(dimensions, {
              freshness: 0.45,
              quality: 0.25,
              popularity: 0.12,
              installReadiness: 0.18,
            }),
            sortScore: (isNewThisWeek ? 10_000 : 0) + dateValue(skill.created_at) / 1_000_000_000_000,
            dimensions,
            badge: isNewThisWeek ? 'New this week' : 'Recently indexed',
            reason: `Indexed recently with ${quality.label.toLowerCase()} quality and ${compactStars(skill)}.`,
          }
        case 'agent-usage':
          return {
            skill,
            score: weightedScore(dimensions, {
              agentEvidence: 0.45,
              evidenceConfidence: 0.25,
              quality: 0.12,
              installReadiness: 0.08,
              popularity: 0.05,
              freshness: 0.05,
            }),
            sortScore: proven.score * 2 + dimensions.evidenceConfidence + Math.log10(totalUsage + 1) * 10,
            dimensions,
            badge: totalUsage ? `${proven.score}/100 proven` : 'Needs first outcome',
            reason: totalUsage
              ? `${proven.summary} ${formatCompactNumber(installAttempts)} install attempts, ${riskBlocked} risk blocks, and ${quality.label.toLowerCase()} quality.`
              : `No public outcome reports yet. ${quality.label} quality and ${compactStars(skill)} make it ready for a first sandbox run.`,
          }
        case 'success-rate':
          return {
            skill,
            score: clampScore(
              (successRate ?? 0) * 0.42 +
              dimensions.agentEvidence * 0.25 +
              dimensions.evidenceConfidence * 0.2 +
              dimensions.quality * 0.08 +
              dimensions.installReadiness * 0.05
            ),
            sortScore: (successRate ?? 0) + dimensions.evidenceConfidence * 0.65 + proven.score * 0.35,
            dimensions,
            badge: successRate === null ? 'No success data' : `${Math.round(successRate)}% success`,
            reason: totalUsage
              ? `${proven.summary} Recent success ${proven.metrics.recentSuccessRate === null ? 'unknown' : `${Math.round(proven.metrics.recentSuccessRate)}%`}.`
              : `No public outcome reports yet. ${quality.label} quality and ${compactStars(skill)} make it a candidate to test.`,
          }
        case 'safe-auto-install':
          return {
            skill,
            score: weightedScore(dimensions, {
              installReadiness: 0.38,
              quality: 0.2,
              agentEvidence: 0.18,
              evidenceConfidence: 0.12,
              freshness: 0.07,
              popularity: 0.05,
            }),
            sortScore: dimensions.installReadiness * 1.5 + dimensions.agentEvidence + dimensions.evidenceConfidence - riskPenalty,
            dimensions,
            badge: riskBlocked > 0 ? 'Review risk' : totalUsage > 0 ? 'Evidence-backed' : 'Needs first run',
            reason: totalUsage
              ? `${proven.summary} ${riskBlocked} risk blocks and ${setupRequired} setup-required reports.`
              : `${quality.label} quality and ${compactStars(skill)}; no real agent safety evidence yet.`,
          }
        case 'agent-platform':
          return {
            skill,
            score: weightedScore(dimensions, {
              fit: 0.5,
              quality: 0.18,
              installReadiness: 0.1,
              agentEvidence: 0.08,
              evidenceConfidence: 0.06,
              popularity: 0.04,
              freshness: 0.04,
            }),
            sortScore: platformFit * 2 + quality.score + proven.score * 0.5,
            dimensions,
            badge: definition.agentPlatform ? definition.agentPlatform : 'Agent fit',
            reason: `${definition.shortTitle} fit with ${quality.label.toLowerCase()} quality, ${compactStars(skill)}, and ${proven.label.toLowerCase()}.`,
          }
        case 'highest-quality':
        default: {
          const qualityRankingScore = weightedScore(dimensions, {
            quality: 0.5,
            freshness: 0.18,
            installReadiness: 0.12,
            agentEvidence: 0.1,
            evidenceConfidence: 0.05,
            popularity: 0.05,
          })
          return {
            skill,
            score: qualityRankingScore,
            sortScore: qualityRankingScore - skillSpecificPenalty,
            dimensions,
            badge: `${quality.label} | ${quality.score}`,
            reason: `${quality.summary} ${compactStars(skill)}; ${Math.round(dimensions.evidenceConfidence)}/100 evidence confidence.`,
          }
        }
      }
    })
    .filter((item) => {
      if (rankingSkillPenalty(item.skill) >= 45) return false

      if (definition.kind === 'agent-usage' || definition.kind === 'success-rate') {
        const stats = statsMap[item.skill.slug]
        const totalUsage = stats
          ? 'total_outcomes' in stats
            ? Number(stats.total_outcomes || 0)
            : Number(stats.total_calls || 0)
          : 0

        if (totalUsage <= 0) return false
        if (definition.kind === 'success-rate' && (stats?.success_rate === null || stats?.success_rate === undefined)) {
          return false
        }
      }

      return true
    })
    .sort((a, b) => b.sortScore - a.sortScore || b.score - a.score || b.skill.github_stars - a.skill.github_stars)

  const deduped = definition.entityScope === 'project'
    ? dedupeRankedProjects(scored)
    : dedupeRankedSkills(scored)

  return deduped
    .slice(0, limit)
    .map((item, index) => ({
      skill: item.skill,
      score: clampScore(item.score),
      badge: item.badge,
      reason: item.reason,
      dimensions: item.dimensions,
      rank: index + 1,
    }))
}

export function getRankingCompareHref(rankedSkills: RankedSkill[]) {
  const slugs = rankedSkills.slice(0, 4).map((item) => item.skill.slug).join(',')
  return `/compare?skills=${encodeURIComponent(slugs)}`
}
