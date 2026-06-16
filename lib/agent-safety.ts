import { auditRiskLabel, type ComputedSkillAudit } from '@/lib/audits'
import type { SkillRecord } from '@/lib/db/skills'

export type AgentSafetyLevel = 'safe_to_install' | 'review_before_install' | 'avoid_auto_install'
export type SkillSafetyTier = 'verified' | 'reviewed' | 'experimental' | 'blocked'
export type AutoInstallPolicy = 'allow' | 'review' | 'block'

export interface AgentResolveConstraints {
  max_risk?: string
  needs_install_command?: boolean
  min_stars?: number
}

export interface PermissionHint {
  id: string
  label: string
  reason: string
  severity: 'low' | 'medium' | 'high'
}

export interface SkillSafetyTierProfile {
  tier: SkillSafetyTier
  label: string
  badge: string
  summary: string
  recommended_action: string
  auto_install_policy: AutoInstallPolicy
  reasons: string[]
}

export interface AgentSafetyProfile {
  score: number
  level: AgentSafetyLevel
  label: string
  safety_tier: SkillSafetyTierProfile
  auto_install_allowed: boolean
  human_review_required: boolean
  blocked: boolean
  audit_risk: ComputedSkillAudit['risk_level']
  permission_hints: PermissionHint[]
  policy_warnings: string[]
  constraints_applied: {
    max_risk: string
    needs_install_command: boolean
    min_stars: number
  }
}

const PERMISSION_PATTERNS: Array<{
  id: string
  label: string
  reason: string
  severity: PermissionHint['severity']
  pattern: RegExp
}> = [
  {
    id: 'shell',
    label: 'Shell or command execution',
    reason: 'Skill metadata references terminal, CLI, shell, subprocess, or command execution workflows.',
    severity: 'high',
    pattern: /\b(shell|terminal|cli|command|exec|subprocess|bash|zsh|powershell)\b/i,
  },
  {
    id: 'browser',
    label: 'Browser automation',
    reason: 'Skill may drive a browser or interact with web pages.',
    severity: 'medium',
    pattern: /\b(browser|playwright|puppeteer|selenium|web automation|forms?)\b/i,
  },
  {
    id: 'network',
    label: 'Network access',
    reason: 'Skill likely fetches remote pages, APIs, repositories, or external services.',
    severity: 'medium',
    pattern: /\b(fetch|http|api|crawl|crawler|scrape|scraper|github|webhook|network)\b/i,
  },
  {
    id: 'filesystem',
    label: 'Filesystem access',
    reason: 'Skill may read or write project files, documents, generated artifacts, or local workspace state.',
    severity: 'medium',
    pattern: /\b(file|files|filesystem|workspace|readme|markdown|document|pdf|csv|xlsx|repo|repository)\b/i,
  },
  {
    id: 'secrets',
    label: 'Secrets or environment access',
    reason: 'Skill metadata references credentials, tokens, environment variables, or secret-bearing workflows.',
    severity: 'high',
    pattern: /\b(secret|token|credential|api key|env|environment variable|oauth|auth)\b/i,
  },
  {
    id: 'database',
    label: 'Database access',
    reason: 'Skill may inspect schemas, query databases, or work with persistent stores.',
    severity: 'medium',
    pattern: /\b(database|sql|postgres|mysql|sqlite|schema|migration|query)\b/i,
  },
]

function skillPolicyText(skill: SkillRecord) {
  return [
    skill.name,
    skill.description,
    skill.long_description,
    skill.tagline,
    skill.category,
    skill.github_repo,
    skill.repository,
    skill.install_command,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
}

function riskRank(value: string | undefined) {
  const normalized = (value || '').toLowerCase().replace(/[-\s]+/g, '_')
  if (!normalized || normalized === 'high' || normalized === 'risky') return 2
  if (normalized === 'medium' || normalized === 'needs_review' || normalized === 'review') return 1
  if (normalized === 'low' || normalized === 'safe' || normalized === 'safe_to_try') return 0
  return 2
}

function auditRiskRank(audit: ComputedSkillAudit) {
  if (audit.risk_level === 'safe_to_try') return 0
  if (audit.risk_level === 'needs_review') return 1
  return 2
}

function safetyLabel(level: AgentSafetyLevel) {
  if (level === 'safe_to_install') return 'Safe to install with normal review'
  if (level === 'review_before_install') return 'Review before install'
  return 'Avoid automatic install'
}

function safetyTierProfile({
  skill,
  audit,
  score,
  hasInstallPath,
  currentRiskRank,
  requiredRiskRank,
  highRiskHints,
  policyWarnings,
}: {
  skill: SkillRecord
  audit: ComputedSkillAudit
  score: number
  hasInstallPath: boolean
  currentRiskRank: number
  requiredRiskRank: number
  highRiskHints: PermissionHint[]
  policyWarnings: Set<string>
}): SkillSafetyTierProfile {
  const reasons = new Set<string>()
  const highRiskIds = new Set(highRiskHints.map((hint) => hint.id))
  const hasSecretsAndShell = highRiskIds.has('secrets') && highRiskIds.has('shell')
  const hardBlock =
    currentRiskRank > requiredRiskRank ||
    !hasInstallPath ||
    audit.risk_level === 'risky' ||
    (hasSecretsAndShell && audit.audit_score < 82)

  if (currentRiskRank > requiredRiskRank) reasons.add('Audit risk exceeds the requested agent policy')
  if (!hasInstallPath) reasons.add('No install command or repository source is available')
  if (audit.risk_level === 'risky') reasons.add('Audit classified this skill as risky')
  if (hasSecretsAndShell) reasons.add('Metadata combines secrets access with shell or command execution')
  if (policyWarnings.size > 0) reasons.add([...policyWarnings][0])

  if (hardBlock) {
    return {
      tier: 'blocked',
      label: 'Blocked for auto-install',
      badge: 'BLOCKED',
      summary: 'This skill should not be selected by an agent without explicit human security review.',
      recommended_action: 'Do not auto-install. Inspect the source, dependencies, and permission surface first.',
      auto_install_policy: 'block',
      reasons: [...reasons].slice(0, 5),
    }
  }

  if (
    skill.verified &&
    audit.risk_level === 'safe_to_try' &&
    score >= 82 &&
    policyWarnings.size === 0
  ) {
    return {
      tier: 'verified',
      label: 'Verified',
      badge: 'VERIFIED',
      summary: 'Strong metadata, audit, install, and review signals. Suitable for agent shortlists after normal workspace review.',
      recommended_action: 'Allow agent install in a sandbox or low-risk workspace, then promote after one successful narrow task.',
      auto_install_policy: 'allow',
      reasons: ['Verified listing', 'Safe-to-try audit', `${score}/100 agent safety score`],
    }
  }

  if (audit.risk_level === 'safe_to_try' && score >= 68 && highRiskHints.length === 0) {
    return {
      tier: 'reviewed',
      label: 'Reviewed',
      badge: 'REVIEWED',
      summary: 'Good audit and safety signals with no high-risk permission hints in public metadata.',
      recommended_action: 'Review the audit page, then allow agent install in a sandboxed workflow.',
      auto_install_policy: policyWarnings.size === 0 ? 'allow' : 'review',
      reasons: ['Safe-to-try audit', `${score}/100 agent safety score`],
    }
  }

  if (audit.risk_level !== 'risky' && score >= 58) {
    return {
      tier: 'reviewed',
      label: 'Reviewed with permission notes',
      badge: 'REVIEWED',
      summary: 'Usable candidate, but the agent should surface permission and audit notes before installation.',
      recommended_action: 'Require human approval before installing into a real workspace.',
      auto_install_policy: 'review',
      reasons: [...reasons, `${score}/100 agent safety score`].slice(0, 5),
    }
  }

  return {
    tier: 'experimental',
    label: 'Experimental',
    badge: 'EXPERIMENTAL',
    summary: 'Sparse or mixed signals. Useful for discovery, but not for autonomous installation.',
    recommended_action: 'Test manually in an isolated workspace and compare against safer alternatives.',
    auto_install_policy: 'review',
    reasons: [...reasons, `${score}/100 agent safety score`].slice(0, 5),
  }
}

export function getPermissionHints(skill: SkillRecord): PermissionHint[] {
  const text = skillPolicyText(skill)
  const hints = PERMISSION_PATTERNS
    .filter((item) => item.pattern.test(text))
    .map(({ id, label, reason, severity }) => ({ id, label, reason, severity }))

  if (hints.length === 0) {
    return [
      {
        id: 'metadata-only',
        label: 'No high-risk permission hints detected',
        reason: 'Current public metadata does not indicate shell, secrets, browser, or database access.',
        severity: 'low',
      },
    ]
  }

  return hints
}

export function getAgentSafetyProfile(
  skill: SkillRecord,
  audit: ComputedSkillAudit,
  constraints: AgentResolveConstraints = {}
): AgentSafetyProfile {
  const permissionHints = getPermissionHints(skill)
  const highRiskHints = permissionHints.filter((hint) => hint.severity === 'high')
  const mediumRiskHints = permissionHints.filter((hint) => hint.severity === 'medium')
  const policyWarnings = new Set<string>()
  const requiredRiskRank = riskRank(constraints.max_risk)
  const currentRiskRank = auditRiskRank(audit)
  const hasInstallPath = Boolean(skill.install_command || skill.github_repo || skill.repository)

  if (currentRiskRank > requiredRiskRank) {
    policyWarnings.add(`Audit risk ${auditRiskLabel(audit.risk_level).toLowerCase()} exceeds max_risk=${constraints.max_risk || 'high'}`)
  }
  if (constraints.needs_install_command && !hasInstallPath) {
    policyWarnings.add('Policy requires an install path, but no install command or repository was detected')
  }
  if (highRiskHints.length > 0) {
    policyWarnings.add(`High-risk permission hints: ${highRiskHints.map((hint) => hint.label).join(', ')}`)
  }
  if (audit.warnings.length > 0) {
    policyWarnings.add(audit.warnings[0])
  }

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        audit.audit_score -
          highRiskHints.length * 12 -
          mediumRiskHints.length * 4 -
          (hasInstallPath ? 0 : 22) -
          (policyWarnings.size > 0 ? 8 : 0)
      )
    )
  )

  const level: AgentSafetyLevel =
    score >= 78 && policyWarnings.size === 0
      ? 'safe_to_install'
      : score >= 55 && currentRiskRank <= Math.max(requiredRiskRank, 1)
        ? 'review_before_install'
        : 'avoid_auto_install'

  const safetyTier = safetyTierProfile({
    skill,
    audit,
    score,
    hasInstallPath,
    currentRiskRank,
    requiredRiskRank,
    highRiskHints,
    policyWarnings,
  })

  return {
    score,
    level,
    label: safetyLabel(level),
    safety_tier: safetyTier,
    auto_install_allowed: safetyTier.auto_install_policy === 'allow' && level === 'safe_to_install',
    human_review_required: safetyTier.auto_install_policy !== 'allow',
    blocked: safetyTier.auto_install_policy === 'block',
    audit_risk: audit.risk_level,
    permission_hints: permissionHints,
    policy_warnings: [...policyWarnings].slice(0, 8),
    constraints_applied: {
      max_risk: constraints.max_risk || 'high',
      needs_install_command: Boolean(constraints.needs_install_command),
      min_stars: constraints.min_stars || 0,
    },
  }
}
