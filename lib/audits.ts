import type { SkillAuditRecord, SkillEventStats, SkillRecord } from '@/lib/db/skills'
import { formatCompactNumber, getFreshnessDays, getSkillQualityProfile } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'

export type AuditRiskLevel = SkillAuditRecord['risk_level']
export type AuditCheckStatus = 'pass' | 'warn' | 'fail' | 'info'

export interface SkillAuditCheck {
  label: string
  status: AuditCheckStatus
  score: number
  detail: string
}

export interface SkillAuditSignal {
  label: string
  value: string
  tone: 'positive' | 'neutral' | 'warning'
}

export interface ComputedSkillAudit {
  skill_slug: string
  audit_score: number
  risk_level: AuditRiskLevel
  quality_score: number
  trust_score: number
  maintenance_score: number
  security_score: number
  install_score: number
  checks: SkillAuditCheck[]
  signals: SkillAuditSignal[]
  warnings: string[]
  metadata: Record<string, unknown>
  generated_at: string
  updated_at: string
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function scoreFreshness(days: number | null) {
  if (days === null) return 45
  if (days <= 30) return 100
  if (days <= 90) return 88
  if (days <= 180) return 76
  if (days <= 365) return 62
  if (days <= 730) return 38
  return 20
}

function freshnessLabel(days: number | null) {
  if (days === null) return 'Unknown'
  if (days === 0) return 'Pushed today'
  if (days < 31) return `${days}d since push`
  if (days < 365) return `${Math.round(days / 30)}mo since push`
  return `${Math.round(days / 365)}y since push`
}

function licenseKnown(skill: SkillRecord) {
  const license = (skill.license || '').trim().toLowerCase()
  return Boolean(license && license !== 'unknown' && license !== 'other')
}

function hasInstallPath(skill: SkillRecord) {
  return Boolean(skill.install_command || skill.github_repo || skill.npm_package)
}

function hasRepository(skill: SkillRecord) {
  return Boolean(skill.repository || skill.github_repo)
}

function hasEnoughDocumentation(skill: SkillRecord) {
  const text = `${skill.description || ''} ${skill.long_description || ''} ${skill.tagline || ''}`.trim()
  return text.length >= 260
}

function statusForScore(score: number): AuditCheckStatus {
  if (score >= 80) return 'pass'
  if (score >= 58) return 'warn'
  return 'fail'
}

export function normalizeAuditRecord(record: SkillAuditRecord): ComputedSkillAudit {
  return {
    ...record,
    checks: (record.checks || []) as unknown as SkillAuditCheck[],
    signals: (record.signals || []) as unknown as SkillAuditSignal[],
    warnings: record.warnings || [],
  }
}

export function auditRiskLabel(level: AuditRiskLevel) {
  if (level === 'safe_to_try') return 'Safe to try'
  if (level === 'needs_review') return 'Needs review'
  return 'Risky'
}

export function auditRiskColor(level: AuditRiskLevel) {
  if (level === 'safe_to_try') return '#111111'
  if (level === 'needs_review') return '#b45309'
  return '#991b1b'
}

export function buildSkillAudit(skill: SkillRecord, eventStats?: SkillEventStats | null): ComputedSkillAudit {
  const quality = getSkillQualityProfile(skill)
  const trust = getSkillTrustProfile(skill, false, eventStats || null)
  const freshnessDays = getFreshnessDays(skill.github_last_pushed_at || skill.updated_at)
  const maintenanceScore = scoreFreshness(freshnessDays)
  const installScore = hasInstallPath(skill) ? 92 : 20
  const repositoryScore = hasRepository(skill) ? 88 : 18
  const licenseScore = licenseKnown(skill) ? 86 : 45
  const docsScore = hasEnoughDocumentation(skill) ? 84 : 48
  const aiReviewScore = skill.ai_review_approved && (skill.ai_review_issues || []).length === 0 ? 88 : 55
  const adoptionScore = (skill.github_stars || 0) >= 500
    ? 88
    : (skill.github_stars || 0) >= 50
      ? 68
      : 42
  const securityScore = clampScore(
    repositoryScore * 0.22 +
    licenseScore * 0.2 +
    docsScore * 0.16 +
    aiReviewScore * 0.24 +
    adoptionScore * 0.1 +
    installScore * 0.08
  )

  const auditScore = clampScore(
    quality.score * 0.28 +
    trust.score * 0.28 +
    securityScore * 0.2 +
    maintenanceScore * 0.14 +
    installScore * 0.1
  )

  const warnings = new Set<string>()
  if (!hasInstallPath(skill)) warnings.add('No install path detected')
  if (!hasRepository(skill)) warnings.add('Repository link is missing')
  if (!licenseKnown(skill)) warnings.add('License is unclear')
  if (!hasEnoughDocumentation(skill)) warnings.add('Documentation summary is thin')
  if (freshnessDays !== null && freshnessDays > 365) warnings.add('Repository appears stale')
  for (const issue of skill.ai_review_issues || []) warnings.add(issue)
  for (const warning of quality.warnings) warnings.add(warning)
  for (const warning of trust.warnings) warnings.add(warning)

  const checks: SkillAuditCheck[] = [
    {
      label: 'Install path',
      status: hasInstallPath(skill) ? 'pass' : 'fail',
      score: installScore,
      detail: skill.install_command || skill.npm_package || skill.github_repo || 'Missing install command',
    },
    {
      label: 'Repository',
      status: hasRepository(skill) ? 'pass' : 'fail',
      score: repositoryScore,
      detail: skill.repository || skill.github_repo || 'Missing repository link',
    },
    {
      label: 'License',
      status: licenseKnown(skill) ? 'pass' : 'warn',
      score: licenseScore,
      detail: skill.license || 'Unknown',
    },
    {
      label: 'Maintenance',
      status: statusForScore(maintenanceScore),
      score: maintenanceScore,
      detail: freshnessLabel(freshnessDays),
    },
    {
      label: 'AI review',
      status: aiReviewScore >= 80 ? 'pass' : 'warn',
      score: aiReviewScore,
      detail: skill.ai_review_approved
        ? (skill.ai_review_issues || []).length > 0
          ? skill.ai_review_issues[0]
          : 'Approved with no listed issues'
        : 'Review approval is missing',
    },
    {
      label: 'Documentation',
      status: hasEnoughDocumentation(skill) ? 'pass' : 'warn',
      score: docsScore,
      detail: hasEnoughDocumentation(skill) ? 'Usable description available' : 'Description is too thin for confident adoption',
    },
    {
      label: 'Adoption',
      status: adoptionScore >= 80 ? 'pass' : adoptionScore >= 60 ? 'info' : 'warn',
      score: adoptionScore,
      detail: `${formatCompactNumber(skill.github_stars || 0)} GitHub stars`,
    },
  ]

  const signals: SkillAuditSignal[] = [
    { label: 'Audit score', value: `${auditScore}/100`, tone: auditScore >= 80 ? 'positive' : auditScore >= 60 ? 'neutral' : 'warning' },
    { label: 'Quality', value: `${quality.score}/100`, tone: quality.score >= 80 ? 'positive' : quality.score >= 60 ? 'neutral' : 'warning' },
    { label: 'Trust', value: `${trust.score}/100`, tone: trust.score >= 80 ? 'positive' : trust.score >= 60 ? 'neutral' : 'warning' },
    { label: 'Maintenance', value: freshnessLabel(freshnessDays), tone: maintenanceScore >= 80 ? 'positive' : maintenanceScore >= 58 ? 'neutral' : 'warning' },
    { label: 'Events', value: eventStats?.total_events ? `${eventStats.total_events} events` : 'No events yet', tone: eventStats?.total_events ? 'positive' : 'neutral' },
  ]

  const riskLevel: AuditRiskLevel =
    auditScore >= 82 && warnings.size <= 3
      ? 'safe_to_try'
      : auditScore >= 60
        ? 'needs_review'
        : 'risky'

  const now = new Date().toISOString()

  return {
    skill_slug: skill.slug,
    audit_score: auditScore,
    risk_level: riskLevel,
    quality_score: quality.score,
    trust_score: trust.score,
    maintenance_score: maintenanceScore,
    security_score: securityScore,
    install_score: installScore,
    checks,
    signals,
    warnings: [...warnings].slice(0, 12),
    metadata: {
      algorithm: 'heuristic-v1',
      note: 'This is a heuristic adoption audit based on public metadata, not a full source-code security review.',
    },
    generated_at: now,
    updated_at: now,
  }
}

export function toAuditRecord(audit: ComputedSkillAudit) {
  return {
    skill_slug: audit.skill_slug,
    audit_score: audit.audit_score,
    risk_level: audit.risk_level,
    quality_score: audit.quality_score,
    trust_score: audit.trust_score,
    maintenance_score: audit.maintenance_score,
    security_score: audit.security_score,
    install_score: audit.install_score,
    checks: audit.checks,
    signals: audit.signals,
    warnings: audit.warnings,
    metadata: audit.metadata,
    generated_at: audit.generated_at,
  }
}
