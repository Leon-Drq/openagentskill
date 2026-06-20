import { auditRiskLabel, buildSkillAudit, type ComputedSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile, type AgentSafetyProfile } from '@/lib/agent-safety'
import { buildAgentReadableSkillMetadata, type AgentReadableSkillMetadata } from '@/lib/agent-readable'
import type { SkillEventStats, SkillRecord } from '@/lib/db/skills'
import { getPrimaryInstallCommand } from '@/lib/install-targets'
import { getSkillQualityProfile } from '@/lib/quality'
import { getSkillTrustProfile, type SkillTrustProfile } from '@/lib/trust'

export type SkillEvalStatus = 'passed' | 'review' | 'failed'
export type SkillEvalCheckStatus = 'pass' | 'warn' | 'fail' | 'info'
export type SkillEvalRiskLevel = 'low' | 'medium' | 'high'

export interface SkillEvalCheck {
  id: string
  label: string
  status: SkillEvalCheckStatus
  score: number
  required_for_auto_install: boolean
  detail: string
  evidence: string[]
}

export interface SkillEvalProfile {
  version: 'openagentskill-skill-eval-v1'
  slug: string
  name: string
  generated_at: string
  task_input: string
  status: SkillEvalStatus
  score: number
  risk_level: SkillEvalRiskLevel
  decision: {
    recommendation: 'shortlist' | 'manual_review' | 'do_not_auto_install'
    reason: string
    auto_install_allowed: boolean
    policy: string
    human_review_required: boolean
  }
  task_fit: {
    score: number
    suited_tasks: string[]
    suited_agents: string[]
  }
  install: {
    command: string
    ready: boolean
    policy: string
    safety_label: string
    targets: AgentReadableSkillMetadata['install']['targets']
  }
  trust: {
    score: number
    label: string
    version: string
    evidence: SkillTrustProfile['evidence']
  }
  audit: {
    score: number
    risk_level: ComputedSkillAudit['risk_level']
    risk_label: string
    warnings: string[]
  }
  safety_gate: {
    score: number
    tier: string
    label: string
    auto_install_policy: string
    blocked: boolean
    permission_hints: AgentSafetyProfile['permission_hints']
    policy_warnings: string[]
  }
  checks: SkillEvalCheck[]
  blockers: string[]
  warnings: string[]
  validation_plan: string[]
  do_not_use_when: string[]
  alternatives: AgentReadableSkillMetadata['alternative_skills']
  machine_metadata: AgentReadableSkillMetadata
  endpoints: {
    web: string
    api: string
    eval: string
    audit: string
    resolve: string
  }
}

const SITE_URL = 'https://www.openagentskill.com'

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function uniqueStrings(values: Array<string | null | undefined>, limit: number) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const normalized = (value || '').replace(/\s+/g, ' ').trim()
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
    if (result.length >= limit) break
  }

  return result
}

function statusFromScore(score: number): SkillEvalCheckStatus {
  if (score >= 82) return 'pass'
  if (score >= 60) return 'warn'
  return 'fail'
}

function taskTokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4)
  )
}

function scoreTaskFit(task: string, metadata: AgentReadableSkillMetadata, skill: SkillRecord) {
  const haystack = [
    skill.slug,
    skill.name,
    skill.description,
    skill.long_description,
    skill.category,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
    ...metadata.suited_tasks,
  ].join(' ')
  const queryTokens = taskTokens(task)
  const haystackTokens = taskTokens(haystack)
  let hits = 0

  for (const token of queryTokens) {
    if (haystackTokens.has(token)) hits += 1
  }

  if (queryTokens.size === 0) return 78
  const ratio = hits / queryTokens.size
  if (ratio >= 0.55) return 94
  if (ratio >= 0.3) return 84
  if (ratio > 0) return 70
  return 58
}

function dimensionScore(trust: SkillTrustProfile, id: string, fallback = 60) {
  return trust.dimensions.find((dimension) => dimension.id === id)?.score || fallback
}

function dimensionDetail(trust: SkillTrustProfile, id: string, fallback: string) {
  return trust.dimensions.find((dimension) => dimension.id === id)?.detail || fallback
}

function check(
  id: string,
  label: string,
  score: number,
  requiredForAutoInstall: boolean,
  detail: string,
  evidence: string[],
  status: SkillEvalCheckStatus = statusFromScore(score)
): SkillEvalCheck {
  return {
    id,
    label,
    status,
    score: clampScore(score),
    required_for_auto_install: requiredForAutoInstall,
    detail,
    evidence: uniqueStrings(evidence, 4),
  }
}

function buildEvalChecks({
  skill,
  task,
  metadata,
  trust,
  audit,
  safety,
}: {
  skill: SkillRecord
  task: string
  metadata: AgentReadableSkillMetadata
  trust: SkillTrustProfile
  audit: ComputedSkillAudit
  safety: AgentSafetyProfile
}) {
  const taskFitScore = scoreTaskFit(task, metadata, skill)
  const installSafetyScore = dimensionScore(trust, 'install_safety', metadata.install.ready ? 80 : 20)
  const docsScore = dimensionScore(trust, 'documentation', 48)
  const licenseScore = dimensionScore(trust, 'license', skill.license && skill.license !== 'Unknown' ? 82 : 45)
  const maintenanceScore = dimensionScore(trust, 'maintenance', audit.maintenance_score)
  const permissionSurfaceScore = dimensionScore(trust, 'permission_surface', 60)

  return [
    check(
      'task_fit',
      'Task fit',
      taskFitScore,
      true,
      taskFitScore >= 82 ? 'Task wording matches this skill metadata.' : 'Task fit is weak; compare alternatives before selecting.',
      [task, skill.category, metadata.suited_tasks.slice(0, 3).join('; ')],
      taskFitScore >= 82 ? 'pass' : taskFitScore >= 65 ? 'warn' : 'fail'
    ),
    check(
      'install_path',
      'Install path',
      metadata.install.ready ? 92 : 20,
      true,
      metadata.install.ready ? 'Install handoff is available.' : 'No install command or repository handoff is available.',
      [metadata.install.command],
      metadata.install.ready ? 'pass' : 'fail'
    ),
    check(
      'install_safety',
      'Install command safety',
      installSafetyScore,
      true,
      dimensionDetail(trust, 'install_safety', 'Install command safety from public metadata.'),
      [metadata.install.command]
    ),
    check(
      'trust_score',
      'Trust score',
      trust.score,
      true,
      trust.summary,
      [trust.label, trust.evidence.stars, trust.evidence.license]
    ),
    check(
      'audit_score',
      'Audit score',
      audit.audit_score,
      true,
      auditRiskLabel(audit.risk_level),
      [audit.warnings[0] || 'No major audit warning from metadata.'],
      audit.risk_level === 'risky' ? 'fail' : audit.risk_level === 'needs_review' ? 'warn' : 'pass'
    ),
    check(
      'agent_safety_gate',
      'Agent safety gate',
      safety.score,
      true,
      safety.safety_tier.summary,
      [safety.safety_tier.recommended_action, safety.safety_tier.reasons[0]],
      safety.blocked ? 'fail' : safety.auto_install_allowed ? 'pass' : 'warn'
    ),
    check(
      'readme_skillmd_completeness',
      'README/SKILL.md completeness',
      docsScore,
      false,
      dimensionDetail(trust, 'documentation', 'Documentation completeness from public metadata.'),
      [trust.evidence.documentation]
    ),
    check(
      'license_clarity',
      'License clarity',
      licenseScore,
      true,
      skill.license || 'Unknown license',
      [trust.evidence.license],
      skill.license && skill.license !== 'Unknown' ? statusFromScore(licenseScore) : 'warn'
    ),
    check(
      'recent_maintenance',
      'Recent maintenance',
      maintenanceScore,
      false,
      dimensionDetail(trust, 'maintenance', 'Repository freshness from GitHub metadata.'),
      [trust.evidence.lastPushed]
    ),
    check(
      'permission_surface',
      'Permission surface',
      permissionSurfaceScore,
      true,
      dimensionDetail(trust, 'permission_surface', 'Permission surface from public metadata.'),
      safety.permission_hints.slice(0, 3).map((hint) => `${hint.label}: ${hint.severity}`)
    ),
    check(
      'alternatives',
      'Alternatives available',
      metadata.alternative_skills.length > 0 ? 82 : 55,
      false,
      metadata.alternative_skills.length > 0
        ? 'Alternative skills are available for comparison.'
        : 'No close alternatives were found in the current shortlist.',
      metadata.alternative_skills.map((item) => item.slug),
      metadata.alternative_skills.length > 0 ? 'pass' : 'info'
    ),
  ]
}

function getEvalStatus(checks: SkillEvalCheck[], score: number, safety: AgentSafetyProfile): SkillEvalStatus {
  const requiredFailures = checks.some((item) => item.required_for_auto_install && item.status === 'fail')
  if (requiredFailures || safety.blocked || score < 58) return 'failed'
  const requiredWarnings = checks.some((item) => item.required_for_auto_install && item.status === 'warn')
  if (requiredWarnings || score < 82 || !safety.auto_install_allowed) return 'review'
  return 'passed'
}

function getEvalRisk(status: SkillEvalStatus, audit: ComputedSkillAudit, safety: AgentSafetyProfile): SkillEvalRiskLevel {
  if (status === 'failed' || audit.risk_level === 'risky' || safety.blocked) return 'high'
  if (status === 'review' || audit.risk_level === 'needs_review') return 'medium'
  return 'low'
}

function getDecision(status: SkillEvalStatus, safety: AgentSafetyProfile, blockers: string[]) {
  if (status === 'passed') {
    return {
      recommendation: 'shortlist' as const,
      reason: 'All required eval gates passed for an agent shortlist.',
      auto_install_allowed: safety.auto_install_allowed,
      policy: safety.safety_tier.auto_install_policy,
      human_review_required: safety.human_review_required,
    }
  }

  if (status === 'failed') {
    return {
      recommendation: 'do_not_auto_install' as const,
      reason: blockers[0] || 'One or more required eval gates failed.',
      auto_install_allowed: false,
      policy: 'block',
      human_review_required: true,
    }
  }

  return {
    recommendation: 'manual_review' as const,
    reason: safety.safety_tier.recommended_action,
    auto_install_allowed: false,
    policy: safety.safety_tier.auto_install_policy,
    human_review_required: true,
  }
}

export function buildSkillEvalProfile(
  skill: SkillRecord,
  options: {
    task?: string
    eventStats?: SkillEventStats | null
    approvedClaim?: boolean
    alternatives?: SkillRecord[]
    baseUrl?: string
    maxRisk?: string
  } = {}
): SkillEvalProfile {
  const baseUrl = options.baseUrl || SITE_URL
  const task = options.task || `Evaluate ${skill.name} before installing it in an AI agent workflow`
  const trust = getSkillTrustProfile(skill, Boolean(options.approvedClaim), options.eventStats || null)
  const audit = buildSkillAudit(skill, options.eventStats || null)
  const safety = getAgentSafetyProfile(skill, audit, {
    max_risk: options.maxRisk || 'medium',
    needs_install_command: true,
  })
  const metadata = buildAgentReadableSkillMetadata(skill, {
    eventStats: options.eventStats || null,
    approvedClaim: Boolean(options.approvedClaim),
    alternatives: options.alternatives || [],
    task,
  })
  const quality = getSkillQualityProfile(skill)
  const checks = buildEvalChecks({ skill, task, metadata, trust, audit, safety })
  const blockers = checks
    .filter((item) => item.required_for_auto_install && item.status === 'fail')
    .map((item) => `${item.label}: ${item.detail}`)
  const warnings = uniqueStrings(
    [
      ...checks
        .filter((item) => item.status === 'warn')
        .map((item) => `${item.label}: ${item.detail}`),
      ...safety.policy_warnings,
      ...audit.warnings,
      ...trust.warnings,
    ],
    12
  )
  const score = clampScore(
    metadata.quality.score * 0.14 +
      quality.score * 0.08 +
      trust.score * 0.22 +
      audit.audit_score * 0.22 +
      safety.score * 0.22 +
      scoreTaskFit(task, metadata, skill) * 0.12
  )
  const status = getEvalStatus(checks, score, safety)
  const riskLevel = getEvalRisk(status, audit, safety)
  const installCommand = getPrimaryInstallCommand(skill)

  return {
    version: 'openagentskill-skill-eval-v1',
    slug: skill.slug,
    name: skill.name,
    generated_at: new Date().toISOString(),
    task_input: task,
    status,
    score,
    risk_level: riskLevel,
    decision: getDecision(status, safety, blockers),
    task_fit: {
      score: scoreTaskFit(task, metadata, skill),
      suited_tasks: metadata.suited_tasks,
      suited_agents: metadata.suited_agents,
    },
    install: {
      command: installCommand,
      ready: metadata.install.ready,
      policy: safety.safety_tier.auto_install_policy,
      safety_label: safety.label,
      targets: metadata.install.targets,
    },
    trust: {
      score: trust.score,
      label: trust.label,
      version: trust.version,
      evidence: trust.evidence,
    },
    audit: {
      score: audit.audit_score,
      risk_level: audit.risk_level,
      risk_label: auditRiskLabel(audit.risk_level),
      warnings: audit.warnings.slice(0, 8),
    },
    safety_gate: {
      score: safety.score,
      tier: safety.safety_tier.tier,
      label: safety.safety_tier.label,
      auto_install_policy: safety.safety_tier.auto_install_policy,
      blocked: safety.blocked,
      permission_hints: safety.permission_hints,
      policy_warnings: safety.policy_warnings,
    },
    checks,
    blockers,
    warnings,
    validation_plan: [
      'Inspect repository, README/SKILL.md, license, and recent commits before production use.',
      'Install in an isolated workspace or sandbox with no production secrets available.',
      'Run the smallest representative task and record files touched, commands run, network access, and outputs.',
      'Compare the selected skill against at least one alternative when the eval status is review or failed.',
      'Promote only after the agent reports a successful verification result and unresolved warnings are accepted.',
    ],
    do_not_use_when: metadata.do_not_use_when,
    alternatives: metadata.alternative_skills,
    machine_metadata: metadata,
    endpoints: {
      web: `${baseUrl}/skills/${skill.slug}`,
      api: `${baseUrl}/api/agent/skills/${skill.slug}`,
      eval: `${baseUrl}/api/agent/evals?slug=${encodeURIComponent(skill.slug)}`,
      audit: `${baseUrl}/skills/${skill.slug}/audit`,
      resolve: metadata.endpoints.resolve,
    },
  }
}

export function formatSkillEvalText(evalProfile: SkillEvalProfile) {
  return `${evalProfile.name} Eval
${'='.repeat(`${evalProfile.name} Eval`.length)}

Status: ${evalProfile.status}
Score: ${evalProfile.score}/100
Risk: ${evalProfile.risk_level}
Decision: ${evalProfile.decision.recommendation}
Policy: ${evalProfile.decision.policy}
Reason: ${evalProfile.decision.reason}

Install:
${evalProfile.install.command}

Required checks:
${evalProfile.checks
  .filter((item) => item.required_for_auto_install)
  .map((item) => `- ${item.status.toUpperCase()} ${item.label}: ${item.detail}`)
  .join('\n')}

Warnings:
${evalProfile.warnings.length ? evalProfile.warnings.map((warning) => `- ${warning}`).join('\n') : '- None from available metadata'}

Validation plan:
${evalProfile.validation_plan.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Do not use when:
${evalProfile.do_not_use_when.map((item) => `- ${item}`).join('\n')}

URLs:
- Skill: ${evalProfile.endpoints.web}
- Audit: ${evalProfile.endpoints.audit}
- JSON: ${evalProfile.endpoints.eval}
`
}
