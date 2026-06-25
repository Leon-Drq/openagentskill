import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import type { SkillEventStats, SkillOutcomeStats, SkillRecord } from '@/lib/db/skills'
import { getSkillDecisionProfile } from '@/lib/decision'
import { getPrimaryInstallCommand, getSkillInstallTargets } from '@/lib/install-targets'
import { getPlatformHints, getSkillQualityProfile } from '@/lib/quality'
import { getSkillSupplyProfile } from '@/lib/supply'
import { getSkillTrustProfile, type SkillTrustEvidence } from '@/lib/trust'
import { getUseCasesForSkill } from '@/lib/use-cases'
import { AGENT_OUTCOMES } from '@/lib/agent-outcomes'

const SITE_URL = 'https://www.openagentskill.com'

export interface AgentReadableSkillMetadata {
  version: 'openagentskill-agent-metadata-v2'
  skill: {
    slug: string
    name: string
    description: string
    category: string
    url: string
    repository: string | null
    github_repo: string | null
  }
  suited_tasks: string[]
  suited_agents: string[]
  install: {
    command: string
    ready: boolean
    targets: Array<{
      id: string
      label: string
      kind: string
      value: string
    }>
    handoff_url: string
    manifest_url: string
  }
  trust: {
    score: number
    label: string
    version: string
    install_policy: string
    evidence: SkillTrustEvidence
    outcome_evidence: {
      total: number
      success_rate: number | null
      install_attempts: number
      risk_blocked: number
      setup_required: number
      label: string
    }
    auto_install: {
      allowed: boolean
      sandbox_required: boolean
      reason: string
    }
    best_for: string[]
    known_risks: string[]
  }
  audit: {
    score: number
    risk_level: string
    risk_label: string
    warnings: string[]
  }
  safety_gate: {
    tier: string
    label: string
    auto_install_policy: string
    auto_install_allowed: boolean
    human_review_required: boolean
    blocked: boolean
    recommended_action: string
  }
  quality: {
    score: number
    label: string
  }
  supply: {
    track: string
    scenario: string
    maintenance: string
    risk: string
  }
  alternative_skills: Array<{
    slug: string
    name: string
    url: string
    stars: number
    install_command: string
    trust_score: number
    audit_score: number
  }>
  do_not_use_when: string[]
  agent_contract: {
    task_input: string
    recommended_action: string
    install_policy: string
    minimum_review_before_use: string[]
    expected_agent_output: {
      selected_skill: string
      install_command: string
      risk_summary: string
      verification_result: string
    }
  }
  outcome_feedback: {
    endpoint: string
    method: 'POST'
    requires_resolve_event_id: boolean
    event_id_source: string
    expected_outcomes: string[]
    payload_template: {
      event_id: string
      skill_slug: string
      task: string
      agent: string
      outcome: string
      install_used: boolean
      risk_blocked: boolean
      setup_required: boolean
      notes: string
    }
  }
  endpoints: {
    web: string
    api: string
    audit: string
    eval: string
    resolve: string
    install: string
    manifest: string
  }
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

function absoluteUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export function buildAgentReadableSkillMetadata(
  skill: SkillRecord,
  options: {
    baseUrl?: string
    eventStats?: SkillEventStats | null
    outcomeStats?: SkillOutcomeStats | null
    approvedClaim?: boolean
    alternatives?: SkillRecord[]
    task?: string
    maxAlternatives?: number
  } = {}
): AgentReadableSkillMetadata {
  const baseUrl = options.baseUrl || SITE_URL
  const task = options.task || `Use ${skill.name} in an agent workflow`
  const installCommand = getPrimaryInstallCommand(skill)
  const installTargets = getSkillInstallTargets(skill)
  const quality = getSkillQualityProfile(skill)
  const decision = getSkillDecisionProfile(skill, options.eventStats || null)
  const useCases = getUseCasesForSkill(skill, 4)
  const supply = getSkillSupplyProfile(skill, options.eventStats || null)
  const trust = getSkillTrustProfile(
    skill,
    Boolean(options.approvedClaim),
    options.eventStats || null,
    options.outcomeStats || null
  )
  const audit = buildSkillAudit(skill, options.eventStats || null)
  const safety = getAgentSafetyProfile(skill, audit, {
    max_risk: 'medium',
    needs_install_command: true,
  })
  const platformHints = getPlatformHints(skill)
  const resolvePath = `/api/agent/resolve?task=${encodeURIComponent(task)}&agent=codex&max_risk=medium`
  const installPath = `/api/skills/${skill.slug}/install`
  const manifestPath = `/api/registry/manifest/${skill.slug}`
  const auditPath = `/skills/${skill.slug}/audit`
  const outcomePath = '/api/agent/outcome'
  const evalPath = `/api/agent/evals?slug=${encodeURIComponent(skill.slug)}&task=${encodeURIComponent(task)}&max_risk=medium`

  const suitedTasks = uniqueStrings(
    [
      ...decision.bestFor,
      ...useCases.flatMap((useCase) => useCase.agentTasks),
      ...useCases.flatMap((useCase) => useCase.workflows),
      supply.scenario.label,
      supply.scenario.description,
      skill.description,
    ],
    8
  )
  const suitedAgents = uniqueStrings(
    [
      ...trust.agentCompatibility,
      ...supply.applicableAgents,
      ...(skill.frameworks || []),
      ...platformHints,
      'Codex',
      'Claude Code',
      'Cursor',
    ],
    8
  )
  const doNotUseWhen = uniqueStrings(
    [
      ...decision.notIdealFor,
      ...decision.riskNotes,
      ...safety.policy_warnings,
      ...audit.warnings,
      ...trust.riskSummary.notes,
      ...trust.doNotUseFor,
      audit.risk_level !== 'safe_to_try' ? 'production agents without a sandbox test and repository review' : null,
    ],
    8
  )
  const alternativeSkills = (options.alternatives || [])
    .filter((candidate) => candidate.slug !== skill.slug)
    .slice(0, options.maxAlternatives || 4)
    .map((candidate) => {
      const candidateTrust = getSkillTrustProfile(candidate)
      const candidateAudit = buildSkillAudit(candidate)
      return {
        slug: candidate.slug,
        name: candidate.name,
        url: absoluteUrl(baseUrl, `/skills/${candidate.slug}`),
        stars: Number(candidate.github_stars || 0),
        install_command: getPrimaryInstallCommand(candidate),
        trust_score: candidateTrust.score,
        audit_score: candidateAudit.audit_score,
      }
    })

  return {
    version: 'openagentskill-agent-metadata-v2',
    skill: {
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      category: skill.category,
      url: absoluteUrl(baseUrl, `/skills/${skill.slug}`),
      repository: skill.repository || null,
      github_repo: skill.github_repo || null,
    },
    suited_tasks: suitedTasks,
    suited_agents: suitedAgents,
    install: {
      command: installCommand,
      ready: Boolean(skill.install_command || skill.github_repo || skill.repository),
      targets: installTargets.map((target) => ({
        id: target.id,
        label: target.label,
        kind: target.kind,
        value: target.value,
      })),
      handoff_url: absoluteUrl(baseUrl, installPath),
      manifest_url: absoluteUrl(baseUrl, manifestPath),
    },
    trust: {
      score: trust.score,
      label: trust.label,
      version: trust.version,
      install_policy: trust.installReadiness.policy,
      evidence: trust.evidence,
      outcome_evidence: {
        total: trust.outcomeEvidence.total,
        success_rate: trust.outcomeEvidence.successRate,
        install_attempts: trust.outcomeEvidence.installAttempts,
        risk_blocked: trust.outcomeEvidence.riskBlocked,
        setup_required: trust.outcomeEvidence.setupRequired,
        label: trust.outcomeEvidence.label,
      },
      auto_install: {
        allowed: trust.autoInstall.allowed,
        sandbox_required: trust.autoInstall.sandboxRequired,
        reason: trust.autoInstall.reason,
      },
      best_for: trust.bestFor,
      known_risks: trust.knownRisks,
    },
    audit: {
      score: audit.audit_score,
      risk_level: audit.risk_level,
      risk_label: auditRiskLabel(audit.risk_level),
      warnings: audit.warnings.slice(0, 8),
    },
    safety_gate: {
      tier: safety.safety_tier.tier,
      label: safety.safety_tier.label,
      auto_install_policy: safety.safety_tier.auto_install_policy,
      auto_install_allowed: safety.auto_install_allowed,
      human_review_required: safety.human_review_required,
      blocked: safety.blocked,
      recommended_action: safety.safety_tier.recommended_action,
    },
    quality: {
      score: quality.score,
      label: quality.label,
    },
    supply: {
      track: supply.track.label,
      scenario: supply.scenario.label,
      maintenance: supply.maintenance.label,
      risk: supply.risk.label,
    },
    alternative_skills: alternativeSkills,
    do_not_use_when:
      doNotUseWhen.length > 0
        ? doNotUseWhen
        : ['Do not skip repository, license, permission, and dependency review before production use.'],
    agent_contract: {
      task_input: task,
      recommended_action: safety.safety_tier.recommended_action,
      install_policy: safety.safety_tier.auto_install_policy,
      minimum_review_before_use: [
        `Trust: ${trust.score}/100 ${trust.label}`,
        `Audit: ${audit.audit_score}/100 ${auditRiskLabel(audit.risk_level)}`,
        `Safety: ${safety.score}/100 ${safety.label}`,
        'Review repository, license, install command, and permission surface before production use.',
      ],
      expected_agent_output: {
        selected_skill: `${skill.slug} (${skill.name})`,
        install_command: installCommand,
        risk_summary: `${auditRiskLabel(audit.risk_level)}; ${safety.safety_tier.label}; ${trust.riskSummary.label}`,
        verification_result: 'Report the smallest successful task, files touched, warnings, and any missing setup.',
      },
    },
    outcome_feedback: {
      endpoint: absoluteUrl(baseUrl, outcomePath),
      method: 'POST',
      requires_resolve_event_id: true,
      event_id_source: 'Use feedback.event_id returned by /api/agent/resolve for the current task.',
      expected_outcomes: [...AGENT_OUTCOMES],
      payload_template: {
        event_id: '<feedback.event_id from /api/agent/resolve>',
        skill_slug: skill.slug,
        task,
        agent: 'codex',
        outcome: 'success',
        install_used: true,
        risk_blocked: false,
        setup_required: false,
        notes: 'Report the smallest successful task, setup friction, files touched, and risk notes.',
      },
    },
    endpoints: {
      web: absoluteUrl(baseUrl, `/skills/${skill.slug}`),
      api: absoluteUrl(baseUrl, `/api/agent/skills/${skill.slug}`),
      audit: absoluteUrl(baseUrl, auditPath),
      eval: absoluteUrl(baseUrl, evalPath),
      resolve: absoluteUrl(baseUrl, resolvePath),
      install: absoluteUrl(baseUrl, installPath),
      manifest: absoluteUrl(baseUrl, manifestPath),
    },
  }
}
