import type { SkillAgentStats, SkillRecord } from '@/lib/db/skills'

export type QualityTier = 'excellent' | 'strong' | 'promising' | 'review'

export interface QualitySignal {
  label: string
  value: string
  tone: 'positive' | 'neutral' | 'warning'
}

export interface SkillQualityProfile {
  score: number
  tier: QualityTier
  label: string
  summary: string
  signals: QualitySignal[]
  warnings: string[]
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function formatCompactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}K`
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

export function getFreshnessDays(value: string | null | undefined) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return null
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000))
}

function getFreshnessLabel(days: number | null) {
  if (days === null) return 'Unknown'
  if (days === 0) return 'Today'
  if (days < 31) return `${days}d ago`
  if (days < 365) return `${Math.round(days / 30)}mo ago`
  return `${Math.round(days / 365)}y ago`
}

function getTier(score: number): { tier: QualityTier; label: string } {
  if (score >= 85) return { tier: 'excellent', label: 'Excellent' }
  if (score >= 70) return { tier: 'strong', label: 'Strong' }
  if (score >= 55) return { tier: 'promising', label: 'Promising' }
  return { tier: 'review', label: 'Needs review' }
}

export function getSkillQualityProfile(
  skill: SkillRecord,
  agentStats?: SkillAgentStats | null
): SkillQualityProfile {
  const baseScore = Math.max(
    Number(skill.quality_score || 0),
    Number(skill.ai_review_score?.score || 0)
  )
  const freshnessDays = getFreshnessDays(skill.github_last_pushed_at || skill.updated_at)
  const hasInstall = Boolean(skill.install_command || skill.github_repo)
  const hasDocs = Boolean(skill.repository || skill.github_repo)
  const hasDescription = (skill.long_description || skill.description || '').length > 240

  let score = baseScore || 40
  score += Math.min(14, Math.log10(Math.max(1, skill.github_stars || 0)) * 3.2)
  score += skill.verified ? 6 : 0
  score += hasInstall ? 5 : -8
  score += hasDocs ? 4 : -6
  score += hasDescription ? 3 : -3
  score += (skill.license && skill.license.toLowerCase() !== 'unknown') ? 3 : -2

  if (freshnessDays === null) score -= 4
  else if (freshnessDays <= 30) score += 8
  else if (freshnessDays <= 180) score += 5
  else if (freshnessDays <= 365) score += 1
  else score -= 8

  if (agentStats?.success_rate != null && agentStats.total_calls > 0) {
    if (agentStats.success_rate >= 90) score += 5
    else if (agentStats.success_rate < 70) score -= 8
  }

  const finalScore = clampScore(score)
  const tier = getTier(finalScore)
  const warnings: string[] = []

  if (!hasInstall) warnings.push('No install command detected')
  if (!hasDocs) warnings.push('Repository or documentation link is missing')
  if (freshnessDays !== null && freshnessDays > 365) warnings.push('Repository looks stale')
  if ((skill.github_stars || 0) < 50) warnings.push('Low GitHub adoption signal')
  if (Array.isArray(skill.ai_review_issues) && skill.ai_review_issues.length > 0) {
    warnings.push(skill.ai_review_issues[0])
  }

  const signals: QualitySignal[] = [
    {
      label: 'GitHub stars',
      value: formatCompactNumber(skill.github_stars || 0),
      tone: (skill.github_stars || 0) >= 500 ? 'positive' : 'neutral',
    },
    {
      label: 'Freshness',
      value: getFreshnessLabel(freshnessDays),
      tone: freshnessDays === null || freshnessDays > 365 ? 'warning' : 'positive',
    },
    {
      label: 'Install ready',
      value: hasInstall ? 'Yes' : 'Missing',
      tone: hasInstall ? 'positive' : 'warning',
    },
    {
      label: 'License',
      value: skill.license || 'Unknown',
      tone: skill.license ? 'neutral' : 'warning',
    },
  ]

  if (agentStats && agentStats.total_calls > 0) {
    signals.push({
      label: 'Agent success',
      value: agentStats.success_rate == null ? 'Unknown' : `${Math.round(agentStats.success_rate)}%`,
      tone: agentStats.success_rate != null && agentStats.success_rate >= 90 ? 'positive' : 'neutral',
    })
  }

  return {
    score: finalScore,
    tier: tier.tier,
    label: tier.label,
    summary:
      finalScore >= 85
        ? 'High-confidence pick with strong adoption and healthy maintenance signals.'
        : finalScore >= 70
          ? 'Solid option that is likely worth shortlisting for production workflows.'
          : finalScore >= 55
            ? 'Useful candidate, but compare it with alternatives before adopting.'
            : 'Inspect the repository carefully before adding it to an agent workflow.',
    signals,
    warnings,
  }
}

export function getPlatformHints(skill: Pick<SkillRecord, 'frameworks' | 'tags' | 'description' | 'long_description'>) {
  const text = [
    skill.description,
    skill.long_description,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .join(' ')
    .toLowerCase()

  const hints = new Set<string>()
  if (/claude|anthropic|skills?/.test(text)) hints.add('Claude Code')
  if (/codex|openai|gpt|agents? sdk/.test(text)) hints.add('OpenAI Agents')
  if (/cursor/.test(text)) hints.add('Cursor')
  if (/langchain/.test(text)) hints.add('LangChain')
  if (/llamaindex|llama index/.test(text)) hints.add('LlamaIndex')
  if (/browser|playwright|puppeteer|selenium/.test(text)) hints.add('Browser agents')
  return [...hints]
}
