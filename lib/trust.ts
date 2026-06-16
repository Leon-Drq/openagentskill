import type { SkillEventStats, SkillRecord } from '@/lib/db/skills'
import { formatCompactNumber, getFreshnessDays } from '@/lib/quality'

export type SkillTrustTier = 'production' | 'strong' | 'review' | 'risk'
export type TrustCheckStatus = 'pass' | 'warn' | 'fail' | 'info'

export interface SkillTrustCheck {
  label: string
  status: TrustCheckStatus
  detail: string
}

export interface SkillTrustDimension {
  id: string
  label: string
  score: number
  weight: number
  status: TrustCheckStatus
  detail: string
}

export interface SkillTrustProfile {
  score: number
  tier: SkillTrustTier
  label: string
  summary: string
  recommendedAction: string
  dimensions: SkillTrustDimension[]
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
      summary:
        'Strong OpenAgentSkill Trust Score across adoption, recent maintenance, license clarity, documentation, dependency risk, and install availability.',
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

function statusForScore(score: number): TrustCheckStatus {
  if (score >= 82) return 'pass'
  if (score >= 62) return 'info'
  if (score >= 42) return 'warn'
  return 'fail'
}

function scoreAdoption(stars: number) {
  if (stars >= 10_000) return 100
  if (stars >= 5_000) return 94
  if (stars >= 1_000) return 86
  if (stars >= 500) return 76
  if (stars >= 100) return 62
  if (stars >= 25) return 48
  return 30
}

function scoreMaintenance(days: number | null) {
  if (days === null) return 42
  if (days <= 30) return 100
  if (days <= 90) return 88
  if (days <= 180) return 76
  if (days <= 365) return 62
  if (days <= 730) return 38
  return 22
}

function scoreLicense(skill: SkillRecord) {
  return hasKnownLicense(skill) ? 86 : 42
}

function documentationText(skill: SkillRecord) {
  return [
    skill.description,
    skill.long_description,
    skill.tagline,
    skill.install_command,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
}

function scoreDocumentation(skill: SkillRecord) {
  const text = documentationText(skill)
  let score = 30
  if ((skill.description || '').length >= 80) score += 16
  if ((skill.long_description || '').length >= 240) score += 24
  if (skill.tagline) score += 6
  if ((skill.tags || []).length >= 3) score += 8
  if ((skill.frameworks || []).length > 0) score += 6
  if (/skill\.md|readme|usage|example|examples|install|quickstart/i.test(text)) score += 10
  return clampScore(score)
}

function getDependencyRisk(skill: SkillRecord) {
  const text = [
    skill.name,
    skill.description,
    skill.long_description,
    skill.tagline,
    skill.install_command,
    skill.github_repo,
    skill.repository,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  let risk = 10
  const notes: string[] = []

  if (/\b(curl\s+\S+\s*\|\s*(sh|bash)|wget\s+\S+\s*\|\s*(sh|bash))\b/.test(text)) {
    risk += 32
    notes.push('shell pipe install pattern')
  }
  if (/\b(shell|exec|subprocess|powershell|bash|terminal|cli)\b/.test(text)) {
    risk += 18
    notes.push('command execution surface')
  }
  if (/\b(secret|token|credential|api key|oauth|env|environment variable)\b/.test(text)) {
    risk += 18
    notes.push('credential or environment access')
  }
  if (/\b(pip install|npm install|pnpm add|yarn add|docker|container)\b/.test(text)) {
    risk += 10
    notes.push('external package install surface')
  }
  if (/\b(browser|playwright|puppeteer|selenium|crawl|scrape|fetch|http|webhook|api)\b/.test(text)) {
    risk += 8
    notes.push('network or browser surface')
  }
  if (/\b(sql|database|postgres|mysql|sqlite|migration)\b/.test(text)) {
    risk += 8
    notes.push('database surface')
  }

  return {
    score: clampScore(100 - Math.min(85, risk)),
    notes: notes.length ? notes : ['no major dependency risk hints in public metadata'],
  }
}

function weightedScore(dimensions: SkillTrustDimension[]) {
  const totalWeight = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0) || 1
  return clampScore(
    dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0) / totalWeight
  )
}

function buildTrustDimensions(
  skill: SkillRecord,
  freshnessDays: number | null,
  stars: number,
  qualityScore: number
): SkillTrustDimension[] {
  const adoptionScore = scoreAdoption(stars)
  const maintenanceScore = scoreMaintenance(freshnessDays)
  const documentationScore = scoreDocumentation(skill)
  const dependency = getDependencyRisk(skill)
  const installScore = hasInstallPath(skill) ? 92 : 24
  const repositoryScore = hasRepository(skill) ? 86 : 24
  const reviewScore =
    skill.ai_review_approved && (skill.ai_review_issues || []).length === 0
      ? 88
      : skill.ai_review_approved
        ? 66
        : 46

  return [
    {
      id: 'github_adoption',
      label: 'GitHub adoption',
      score: adoptionScore,
      weight: 0.16,
      status: statusForScore(adoptionScore),
      detail: `${formatCompactNumber(stars)} GitHub stars`,
    },
    {
      id: 'maintenance',
      label: 'Recent maintenance',
      score: maintenanceScore,
      weight: 0.18,
      status: statusForScore(maintenanceScore),
      detail: getMaintenanceLabel(freshnessDays),
    },
    {
      id: 'license',
      label: 'License clarity',
      score: scoreLicense(skill),
      weight: 0.1,
      status: hasKnownLicense(skill) ? 'pass' : 'warn',
      detail: skill.license || 'Unknown license',
    },
    {
      id: 'documentation',
      label: 'README/SKILL.md completeness',
      score: documentationScore,
      weight: 0.16,
      status: statusForScore(documentationScore),
      detail:
        documentationScore >= 82
          ? 'Metadata includes enough usage and workflow context'
          : 'Public metadata needs stronger README/SKILL.md context',
    },
    {
      id: 'dependency_risk',
      label: 'Dependency risk',
      score: dependency.score,
      weight: 0.14,
      status: statusForScore(dependency.score),
      detail: dependency.notes.slice(0, 2).join(', '),
    },
    {
      id: 'installability',
      label: 'Install availability',
      score: installScore,
      weight: 0.14,
      status: hasInstallPath(skill) ? 'pass' : 'fail',
      detail: skill.install_command || skill.npm_package || skill.github_repo || 'Missing install command',
    },
    {
      id: 'repository',
      label: 'Repository evidence',
      score: repositoryScore,
      weight: 0.06,
      status: hasRepository(skill) ? 'pass' : 'fail',
      detail: skill.repository || skill.github_repo || 'Missing repository link',
    },
    {
      id: 'review_status',
      label: 'Review status',
      score: Math.max(reviewScore, Math.min(qualityScore, 90)),
      weight: 0.06,
      status: statusForScore(reviewScore),
      detail: skill.ai_review_approved ? 'AI review data available' : 'AI review approval is missing',
    },
  ]
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
  const dimensions = buildTrustDimensions(skill, freshnessDays, stars, qualityScore)
  const checks: SkillTrustCheck[] = []
  const strengths: string[] = []
  const warnings: string[] = []

  let score = weightedScore(dimensions)

  if (skill.verified) {
    score += 5
    strengths.push('Manually verified listing')
  }

  if (hasApprovedClaim) {
    score += 4
    strengths.push('Owner claim is approved')
  }

  if (skill.ai_review_approved) {
    strengths.push('AI review approved')
  } else {
    warnings.push('AI review approval is missing')
  }

  if (issues.length > 0) {
    score -= Math.min(8, issues.length * 3)
    warnings.push(issues[0])
  }

  if (hasInstallPath(skill)) strengths.push('Install path is available')
  else warnings.push('Install path is missing')

  if (hasRepository(skill)) strengths.push('Repository evidence is available')
  else warnings.push('Repository link is missing')

  if (!hasKnownLicense(skill)) warnings.push('License is unclear')

  if (freshnessDays === null) warnings.push('Repository freshness is unknown')
  else if (freshnessDays <= 90) strengths.push('Recently maintained repository')
  else if (freshnessDays > 365) warnings.push('Repository looks stale')

  if (stars >= 5000) strengths.push('Large GitHub adoption signal')
  else if (stars >= 500) strengths.push('Meaningful GitHub adoption signal')
  else if (stars < 50) warnings.push('Low GitHub adoption signal')

  if (qualityScore >= 85) strengths.push('High quality score')
  else if (qualityScore < 55) warnings.push('Quality score needs review')

  if (`${skill.long_description || ''} ${skill.description || ''}`.trim().length < 320) {
    warnings.push('Documentation summary is thin')
  }

  if (eventStats && eventStats.total_events > 0) {
    const usageBoost = Math.min(4, Math.floor((eventStats.install_copies + eventStats.outbound_clicks) / 10))
    score += usageBoost
    if (eventStats.install_copies > 0 || eventStats.outbound_clicks > 0) {
      strengths.push('OpenAgentSkill usage activity detected')
    }
  }

  for (const dimension of dimensions) {
    addCheck(checks, dimension.status, dimension.label, dimension.detail)
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
    eventStats && eventStats.total_events > 0 ? 'pass' : 'info',
    'OpenAgentSkill usage',
    eventStats && eventStats.total_events > 0
      ? `${formatCompactNumber(eventStats.views || 0)} views, ${formatCompactNumber(eventStats.install_copies || 0)} install copies`
      : 'No local usage activity yet'
  )

  const finalScore = clampScore(score)
  const tier = getTier(finalScore)
  const dimensionWarnings = dimensions
    .filter((dimension) => dimension.status === 'warn' || dimension.status === 'fail')
    .map((dimension) => `${dimension.label}: ${dimension.detail}`)

  return {
    score: finalScore,
    ...tier,
    dimensions,
    checks,
    strengths: [...new Set(strengths)].slice(0, 8),
    warnings: [...new Set([...warnings, ...dimensionWarnings])].slice(0, 10),
  }
}
