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
  const dependencyDimension = trust.dimensions.find((dimension) => dimension.id === 'dependency_risk')
  const documentationDimension = trust.dimensions.find((dimension) => dimension.id === 'documentation')
  const installSafetyDimension = trust.dimensions.find((dimension) => dimension.id === 'install_safety')
  const permissionSurfaceDimension = trust.dimensions.find((dimension) => dimension.id === 'permission_surface')
  const repoActivityDimension = trust.dimensions.find((dimension) => dimension.id === 'repo_activity')
  const dependencyScore = dependencyDimension?.score || 60
  const documentationScore = documentationDimension?.score || 48
  const installSafetyScore = installSafetyDimension?.score || (hasInstallPath(skill) ? 82 : 20)
  const permissionSurfaceScore = permissionSurfaceDimension?.score || 60
  const repoActivityScore = repoActivityDimension?.score || 50
  const installScore = hasInstallPath(skill) ? 92 : 20
  const repositoryScore = hasRepository(skill) ? 88 : 18
  const licenseScore = licenseKnown(skill) ? 86 : 45
  const docsScore = Math.max(hasEnoughDocumentation(skill) ? 84 : 48, documentationScore)
  const aiReviewScore = skill.ai_review_approved && (skill.ai_review_issues || []).length === 0 ? 88 : 55
  const adoptionScore = (skill.github_stars || 0) >= 500
    ? 88
    : (skill.github_stars || 0) >= 50
      ? 68
      : 42
  const securityScore = clampScore(
    repositoryScore * 0.16 +
    licenseScore * 0.16 +
    docsScore * 0.12 +
    aiReviewScore * 0.16 +
    dependencyScore * 0.14 +
    installSafetyScore * 0.13 +
    permissionSurfaceScore * 0.08 +
    adoptionScore * 0.05
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
  if (dependencyScore < 62) warnings.add('Dependency or permission surface needs review')
  if (installSafetyScore < 62) warnings.add('Install command contains a high-risk pattern')
  if (permissionSurfaceScore < 62) warnings.add('Permission surface may require sandboxing')
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
      label: 'README/SKILL.md completeness',
      status: hasEnoughDocumentation(skill) ? 'pass' : 'warn',
      score: docsScore,
      detail: hasEnoughDocumentation(skill) ? 'Usable description available' : 'Description is too thin for confident adoption',
    },
    {
      label: 'Dependency risk',
      status: statusForScore(dependencyScore),
      score: dependencyScore,
      detail: dependencyDimension?.detail || 'Heuristic dependency risk from public metadata',
    },
    {
      label: 'Install command safety',
      status: statusForScore(installSafetyScore),
      score: installSafetyScore,
      detail: installSafetyDimension?.detail || 'Heuristic install safety from public metadata',
    },
    {
      label: 'Permission surface',
      status: statusForScore(permissionSurfaceScore),
      score: permissionSurfaceScore,
      detail: permissionSurfaceDimension?.detail || 'Heuristic permission surface from public metadata',
    },
    {
      label: 'Stars/forks activity',
      status: statusForScore(repoActivityScore),
      score: repoActivityScore,
      detail: repoActivityDimension?.detail || `${formatCompactNumber(skill.github_stars || 0)} GitHub stars`,
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
    { label: 'Install safety', value: `${installSafetyScore}/100`, tone: installSafetyScore >= 80 ? 'positive' : installSafetyScore >= 60 ? 'neutral' : 'warning' },
    { label: 'Permission surface', value: `${permissionSurfaceScore}/100`, tone: permissionSurfaceScore >= 80 ? 'positive' : permissionSurfaceScore >= 60 ? 'neutral' : 'warning' },
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
      algorithm: 'heuristic-v2',
      note: 'This is a heuristic adoption audit based on public metadata, not a full source-code security review.',
      trust_dimensions: trust.dimensions,
      trust_formula:
        'OpenAgentSkill Trust Score combines GitHub adoption, stars/forks activity, recent maintenance, license clarity, README/SKILL.md completeness, dependency/runtime risk, install availability, install command safety, permission surface, repository evidence, and review status.',
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
