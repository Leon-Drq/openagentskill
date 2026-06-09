import type { SkillEventStats, SkillRecord } from '@/lib/db/skills'
import { formatCompactNumber, getFreshnessDays } from '@/lib/quality'

export type SkillTrustTier = 'production' | 'strong' | 'review' | 'risk'
export type TrustCheckStatus = 'pass' | 'warn' | 'fail' | 'info'

export interface SkillTrustCheck {
  label: string
  status: TrustCheckStatus
  detail: string
}

export interface SkillTrustProfile {
  score: number
  tier: SkillTrustTier
  label: string
  summary: string
  recommendedAction: string
  checks: SkillTrustCheck[]
  strengths: string[]
  warnings: string[]
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function hasKnownLicense(skill: SkillRecord) {
  const license = (skill.license || '').trim().toLowerCase()
  return Boolean(license && license !== 'unknown' && license !== 'other')
}

function hasRepository(skill: SkillRecord) {
  return Boolean(skill.repository || skill.github_repo)
}

function hasInstallPath(skill: SkillRecord) {
  return Boolean(skill.install_command || skill.github_repo || skill.npm_package)
}

function getMaintenanceLabel(days: number | null) {
  if (days === null) return 'Unknown'
  if (days === 0) return 'Pushed today'
  if (days < 31) return `${days}d since push`
  if (days < 365) return `${Math.round(days / 30)}mo since push`
  return `${Math.round(days / 365)}y since push`
}

function getTier(score: number): Pick<SkillTrustProfile, 'tier' | 'label' | 'summary' | 'recommendedAction'> {
  if (score >= 86) {
    return {
      tier: 'production',
      label: 'Production candidate',
      summary: 'Strong trust signals across adoption, maintenance, install readiness, and review status.',
      recommendedAction: 'Shortlist for production use, then run a normal repository and dependency review.',
    }
  }

  if (score >= 72) {
    return {
      tier: 'strong',
      label: 'Strong shortlist',
      summary: 'Good trust signals with a few areas worth checking before rollout.',
      recommendedAction: 'Test in a sandbox workflow and compare its install path with close alternatives.',
    }
  }

  if (score >= 58) {
    return {
      tier: 'review',
      label: 'Manual review',
      summary: 'Potentially useful, but at least one trust signal needs human inspection.',
      recommendedAction: 'Inspect the repository, license, and recent activity before connecting it to agent workflows.',
    }
  }

  return {
    tier: 'risk',
    label: 'High review required',
    summary: 'Sparse or weak trust signals. Treat this as an experimental candidate.',
    recommendedAction: 'Use only in a controlled test environment until missing trust signals are resolved.',
  }
}

function addCheck(
  checks: SkillTrustCheck[],
  status: TrustCheckStatus,
  label: string,
  detail: string
) {
  checks.push({ status, label, detail })
}

export function getSkillTrustProfile(
  skill: SkillRecord,
  hasApprovedClaim = false,
  eventStats?: SkillEventStats | null
): SkillTrustProfile {
  const freshnessDays = getFreshnessDays(skill.github_last_pushed_at || skill.updated_at)
  const stars = Number(skill.github_stars || 0)
  const qualityScore = Number(skill.quality_score || skill.ai_review_score?.score || 0)
  const issues = Array.isArray(skill.ai_review_issues) ? skill.ai_review_issues : []
  const descriptionLength = `${skill.long_description || ''} ${skill.description || ''}`.trim().length
  const checks: SkillTrustCheck[] = []
  const strengths: string[] = []
  const warnings: string[] = []

  let score = 50

  if (skill.verified) {
    score += 14
    strengths.push('Manually verified listing')
  }

  if (hasApprovedClaim) {
    score += 10
    strengths.push('Owner claim is approved')
  }

  if (skill.ai_review_approved) {
    score += 8
    strengths.push('AI review approved')
  } else {
    score -= 10
    warnings.push('AI review approval is missing')
  }

  if (issues.length > 0) {
    score -= Math.min(12, issues.length * 4)
    warnings.push(issues[0])
  } else if (skill.ai_review_approved) {
    score += 6
  }

  if (hasInstallPath(skill)) score += 10
  else {
    score -= 15
    warnings.push('Install path is missing')
  }

  if (hasRepository(skill)) score += 8
  else {
    score -= 12
    warnings.push('Repository link is missing')
  }

  if (hasKnownLicense(skill)) score += 6
  else {
    score -= 6
    warnings.push('License is unclear')
  }

  if (freshnessDays === null) {
    score -= 6
    warnings.push('Repository freshness is unknown')
  } else if (freshnessDays <= 90) {
    score += 10
    strengths.push('Recently maintained repository')
  } else if (freshnessDays <= 180) {
    score += 6
  } else if (freshnessDays <= 365) {
    score += 2
  } else {
    score -= 12
    warnings.push('Repository looks stale')
  }

  if (stars >= 5000) {
    score += 8
    strengths.push('Large GitHub adoption signal')
  } else if (stars >= 500) {
    score += 5
    strengths.push('Meaningful GitHub adoption signal')
  } else if (stars >= 50) {
    score += 2
  } else {
    score -= 6
    warnings.push('Low GitHub adoption signal')
  }

  if (qualityScore >= 85) {
    score += 8
    strengths.push('High quality score')
  } else if (qualityScore >= 70) {
    score += 5
  } else if (qualityScore >= 55) {
    score += 2
  } else {
    score -= 6
    warnings.push('Quality score needs review')
  }

  if (descriptionLength >= 320) {
    score += 3
  } else {
    score -= 3
    warnings.push('Documentation summary is thin')
  }

  if (eventStats && eventStats.total_events > 0) {
    const usageBoost = Math.min(4, Math.floor((eventStats.install_copies + eventStats.outbound_clicks) / 10))
    score += usageBoost
    if (eventStats.install_copies > 0 || eventStats.outbound_clicks > 0) {
      strengths.push('OpenAgentSkill usage activity detected')
    }
  }

  addCheck(
    checks,
    skill.verified || hasApprovedClaim ? 'pass' : 'warn',
    'Ownership',
    hasApprovedClaim
      ? 'Owner claim approved'
      : skill.verified
        ? 'Listing manually verified'
        : 'No approved owner claim yet'
  )
  addCheck(
    checks,
    hasInstallPath(skill) ? 'pass' : 'fail',
    'Install path',
    skill.install_command || skill.npm_package || skill.github_repo || 'Missing install command'
  )
  addCheck(
    checks,
    hasRepository(skill) ? 'pass' : 'fail',
    'Repository',
    skill.repository || skill.github_repo || 'Missing repository link'
  )
  addCheck(
    checks,
    hasKnownLicense(skill) ? 'pass' : 'warn',
    'License',
    skill.license || 'Unknown'
  )
  addCheck(
    checks,
    freshnessDays === null ? 'warn' : freshnessDays > 365 ? 'fail' : 'pass',
    'Maintenance',
    getMaintenanceLabel(freshnessDays)
  )
  addCheck(
    checks,
    skill.ai_review_approved && issues.length === 0 ? 'pass' : issues.length > 0 ? 'warn' : 'info',
    'AI review',
    issues.length > 0 ? issues[0] : skill.ai_review_approved ? 'Approved with no listed issues' : 'Not enough review data'
  )
  addCheck(
    checks,
    stars >= 500 ? 'pass' : stars >= 50 ? 'info' : 'warn',
    'Adoption',
    `${formatCompactNumber(stars)} GitHub stars`
  )
  addCheck(
    checks,
    descriptionLength >= 320 ? 'pass' : 'warn',
    'Documentation',
    descriptionLength >= 320 ? 'Usable description available' : 'Summary is thin'
  )
  addCheck(
    checks,
    eventStats && eventStats.total_events > 0 ? 'pass' : 'info',
    'OpenAgentSkill usage',
    eventStats && eventStats.total_events > 0
      ? `${formatCompactNumber(eventStats.views || 0)} views, ${formatCompactNumber(eventStats.install_copies || 0)} install copies`
      : 'No local usage activity yet'
  )

  const finalScore = clampScore(score)
  const tier = getTier(finalScore)

  return {
    score: finalScore,
    ...tier,
    checks,
    strengths: [...new Set(strengths)].slice(0, 5),
    warnings: [...new Set(warnings)].slice(0, 5),
  }
}
