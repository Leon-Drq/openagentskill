import { auditRiskLabel, type ComputedSkillAudit } from '@/lib/audits'
import type { SkillRecord } from '@/lib/db/skills'

export type AgentSafetyLevel = 'safe_to_install' | 'review_before_install' | 'avoid_auto_install'

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
) {
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

  return {
    score,
    level,
    label: safetyLabel(level),
    auto_install_allowed: level === 'safe_to_install',
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
