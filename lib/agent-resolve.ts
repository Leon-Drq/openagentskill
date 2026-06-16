import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile, type AgentResolveConstraints, type AgentSafetyProfile } from '@/lib/agent-safety'
import { getSkillDecisionProfile } from '@/lib/decision'
import { getAllSkills, getSkillEventStatsMap, type SkillEventStats, type SkillRecord } from '@/lib/db/skills'
import { getPrimaryInstallCommand, getSkillInstallTargets, type InstallTargetId } from '@/lib/install-targets'
import { getSkillQualityProfile } from '@/lib/quality'
import { dedupeRankedSkills, getRecommendationReasons, rankSkillsForQuery } from '@/lib/registry'
import { getSkillSupplyProfile } from '@/lib/supply'
import { getSkillTrustProfile } from '@/lib/trust'
import { getUseCasesForSkill } from '@/lib/use-cases'

const SITE_URL = 'https://www.openagentskill.com'

export interface AgentResolveInput {
  task: string
  agent?: InstallTargetId | 'auto' | string
  limit?: number
  constraints?: AgentResolveConstraints
}

function normalizeLimit(limit: number | undefined) {
  const parsed = Number(limit)
  return Math.min(Math.max(Number.isFinite(parsed) && parsed > 0 ? parsed : 5, 1), 10)
}

function normalizeAgent(agent: AgentResolveInput['agent']): InstallTargetId | 'auto' {
  if (agent === 'codex' || agent === 'claude-code' || agent === 'cursor' || agent === 'openagentskill-cli') return agent
  return 'auto'
}

function candidateAllowed(skill: SkillRecord, constraints: AgentResolveConstraints) {
  if (constraints.min_stars && Number(skill.github_stars || 0) < constraints.min_stars) return false
  return true
}

function buildInstallPlan(skill: SkillRecord, agent: InstallTargetId | 'auto') {
  const targets = getSkillInstallTargets(skill)
  const preferred =
    agent === 'auto'
      ? targets.find((target) => target.id === 'openagentskill-cli') || targets[0]
      : targets.find((target) => target.id === agent) || targets[0]
  const command = getPrimaryInstallCommand(skill)

  return {
    target: preferred?.id || 'openagentskill-cli',
    label: preferred?.title || 'OpenAgentSkill CLI',
    command,
    value: preferred?.value || command,
    kind: preferred?.kind || 'command',
    steps: [
      `Review ${skill.name} trust and audit signals before installing.`,
      preferred?.kind === 'agent-prompt' ? 'Send the install prompt to the target agent.' : `Run: ${command}`,
      'Install in a sandbox or low-risk workspace first.',
      'Pin the repository source and re-check the audit before production use.',
    ],
    targets,
  }
}

function buildPolicyDecision(autoInstallAllowed: boolean, policyWarnings: string[]) {
  if (autoInstallAllowed) {
    return {
      status: 'approved_for_agent_install',
      summary: 'Policy allows an agent to install this skill after normal workspace review.',
    }
  }
  if (policyWarnings.length > 0) {
    return {
      status: 'human_review_required',
      summary: 'Do not auto-install. Review policy warnings and audit details before using this skill.',
    }
  }
  return {
    status: 'manual_review_recommended',
    summary: 'Install is possible, but a human should review the audit before allowing agent use.',
  }
}

function buildSafetyPolicyDecision(safety: AgentSafetyProfile) {
  if (safety.blocked) {
    return {
      status: 'blocked_for_auto_install',
      summary: safety.safety_tier.recommended_action,
    }
  }

  if (safety.auto_install_allowed) {
    return {
      status: 'approved_for_agent_install',
      summary: safety.safety_tier.recommended_action,
    }
  }

  if (safety.policy_warnings.length > 0 || safety.human_review_required) {
    return {
      status: 'human_review_required',
      summary: safety.safety_tier.recommended_action,
    }
  }

  return buildPolicyDecision(safety.auto_install_allowed, safety.policy_warnings)
}

function summarizeRisks(candidate: {
  audit: { risk_label: string; warnings: string[] }
  trust: { score: number; label: string; warnings: string[] }
  safety: AgentSafetyProfile
}) {
  const notes = [
    ...candidate.safety.policy_warnings,
    ...candidate.audit.warnings,
    ...candidate.trust.warnings,
  ].filter(Boolean)

  return {
    level: candidate.audit.risk_label,
    safety_tier: candidate.safety.safety_tier.label,
    safety: `${candidate.safety.score}/100 ${candidate.safety.label}`,
    trust: `${candidate.trust.score}/100 ${candidate.trust.label}`,
    notes: [...new Set(notes)].slice(0, 5),
  }
}

export async function resolveAgentSkill(input: AgentResolveInput) {
  const task = input.task.trim()
  if (!task) throw new Error('Missing required field: task')

  const agent = normalizeAgent(input.agent)
  const limit = normalizeLimit(input.limit)
  const constraints: AgentResolveConstraints = {
    max_risk: input.constraints?.max_risk || 'medium',
    needs_install_command: input.constraints?.needs_install_command ?? true,
    min_stars: Number(input.constraints?.min_stars || 0),
  }
  const [skills, eventStatsMap] = await Promise.all([
    getAllSkills('quality'),
    getSkillEventStatsMap().catch((): Record<string, SkillEventStats> => ({})),
  ])

  const ranked = dedupeRankedSkills(rankSkillsForQuery(skills, task))
    .filter(({ skill }) => candidateAllowed(skill, constraints))
    .slice(0, Math.max(limit * 3, 10))

  const candidates = ranked.map(({ skill, score }, index) => {
    const eventStats = eventStatsMap[skill.slug] || null
    const audit = buildSkillAudit(skill, eventStats)
    const safety = getAgentSafetyProfile(skill, audit, constraints)
    const trust = getSkillTrustProfile(skill, false, eventStats)
    const decision = getSkillDecisionProfile(skill, eventStats)
    const useCases = getUseCasesForSkill(skill, 3)
    const supplyProfile = getSkillSupplyProfile(skill, eventStats)

    return {
      rank: index + 1,
      match_score: score,
      skill: {
        slug: skill.slug,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        repository: skill.repository,
        github_repo: skill.github_repo,
      },
      recommendation_reasons: getRecommendationReasons(skill, task, score),
      supply_profile: supplyProfile,
      quality: getSkillQualityProfile(skill),
      trust,
      audit: {
        audit_score: audit.audit_score,
        risk_level: audit.risk_level,
        risk_label: auditRiskLabel(audit.risk_level),
        warnings: audit.warnings.slice(0, 5),
      },
      safety,
      safety_gate: {
        tier: safety.safety_tier.tier,
        label: safety.safety_tier.label,
        badge: safety.safety_tier.badge,
        auto_install_policy: safety.safety_tier.auto_install_policy,
        auto_install_allowed: safety.auto_install_allowed,
        human_review_required: safety.human_review_required,
        blocked: safety.blocked,
        recommended_action: safety.safety_tier.recommended_action,
        reasons: safety.safety_tier.reasons,
      },
      decision: {
        readiness_score: decision.readinessScore,
        readiness_label: decision.readinessLabel,
        headline: decision.decisionHeadline,
        role: decision.agentRole,
        best_for: decision.bestFor,
        risks: decision.riskNotes,
        next_steps: decision.implementationPlan,
      },
      install_plan: buildInstallPlan(skill, agent),
      use_cases: useCases.map((useCase) => ({
        slug: useCase.slug,
        title: useCase.shortTitle,
        url: `${SITE_URL}/use-cases/${useCase.slug}`,
      })),
      urls: {
        web: `${SITE_URL}/skills/${skill.slug}`,
        api: `${SITE_URL}/api/agent/skills/${skill.slug}`,
        install_api: `${SITE_URL}/api/skills/${skill.slug}/install`,
        audit: `${SITE_URL}/skills/${skill.slug}/audit`,
        badge: `${SITE_URL}/api/badge/${skill.slug}?metric=audit`,
        repository: skill.repository,
      },
    }
  })

  const eligibleCandidates = candidates.filter((candidate) => !candidate.safety.blocked)
  const safeCandidates = eligibleCandidates.filter((candidate) =>
    candidate.safety.safety_tier.tier === 'verified' || candidate.safety.safety_tier.tier === 'reviewed'
  )
  const selected =
    safeCandidates.find((candidate) => candidate.safety.auto_install_allowed) ||
    safeCandidates[0] ||
    eligibleCandidates[0] ||
    candidates[0] ||
    null
  const alternatives = eligibleCandidates
    .filter((candidate) => candidate.skill.slug !== selected?.skill.slug)
    .slice(0, Math.max(0, limit - 1))
  const blockedCandidates = candidates
    .filter((candidate) => candidate.safety.blocked)
    .slice(0, 5)
  const agentDecision = selected
    ? {
        input_task: task,
        recommended_skill: {
          slug: selected.skill.slug,
          name: selected.skill.name,
          url: selected.urls.web,
          audit_url: selected.urls.audit,
          repository: selected.urls.repository,
          safety_tier: selected.safety.safety_tier.label,
          auto_install_policy: selected.safety.safety_tier.auto_install_policy,
        },
        alternative_skills: alternatives.slice(0, 3).map((candidate) => ({
          slug: candidate.skill.slug,
          name: candidate.skill.name,
          url: candidate.urls.web,
          install_command: candidate.install_plan.command,
          why_consider: candidate.recommendation_reasons[0] || candidate.decision.headline,
          risk: summarizeRisks(candidate),
        })),
        install_command: selected.install_plan.command,
        install_target: selected.install_plan.label,
        why_recommended: [
          ...selected.recommendation_reasons,
          selected.decision.headline,
          `${selected.trust.score}/100 OpenAgentSkill Trust Score`,
          `${selected.audit.audit_score}/100 audit score`,
          `${selected.safety.safety_tier.label} safety gate`,
        ].filter(Boolean).slice(0, 6),
        risk_summary: summarizeRisks(selected),
        safety_gate: {
          tier: selected.safety.safety_tier.tier,
          label: selected.safety.safety_tier.label,
          auto_install_policy: selected.safety.safety_tier.auto_install_policy,
          action: selected.safety.safety_tier.recommended_action,
        },
        agent_next_steps: [
          'Read the audit URL before installing.',
          selected.safety.auto_install_allowed
            ? 'Install in a sandbox or low-risk workspace first.'
            : selected.safety.blocked
              ? 'Do not install automatically. Pick a safer alternative or ask for explicit human review.'
              : 'Ask for human approval before installing.',
          `Use install command: ${selected.install_plan.command}`,
          'After installation, run one narrow task and report output, warnings, and files touched.',
        ],
      }
    : null
  const agentWorkflow = selected
    ? {
        mode: 'resolve_review_install',
        recommended_action: selected.safety.safety_tier.recommended_action,
        selected_skill: {
          slug: selected.skill.slug,
          name: selected.skill.name,
          url: selected.urls.web,
          repository: selected.urls.repository,
        },
        install: {
          target: selected.install_plan.target,
          label: selected.install_plan.label,
          kind: selected.install_plan.kind,
          command: selected.install_plan.command,
          value: selected.install_plan.value,
          api: selected.urls.install_api,
        },
        copy_paste_prompt: [
          `Task: ${task}`,
          `Use ${selected.skill.name} from ${selected.urls.web}.`,
          `Review the audit first: ${selected.urls.audit}`,
          `Install handoff: ${selected.urls.install_api}`,
          `Install command: ${selected.install_plan.command}`,
          'If audit or policy warnings look unsafe for this workspace, use one of the alternatives instead.',
        ].join('\n'),
        api_sequence: [
          {
            step: 1,
            label: 'Resolve task',
            method: 'GET',
            url: `${SITE_URL}/api/agent/resolve?task=${encodeURIComponent(task)}&agent=${encodeURIComponent(agent)}&max_risk=${encodeURIComponent(constraints.max_risk || 'medium')}`,
          },
          {
            step: 2,
            label: 'Fetch selected skill profile',
            method: 'GET',
            url: selected.urls.api,
          },
          {
            step: 3,
            label: 'Fetch install handoff',
            method: 'GET',
            url: selected.urls.install_api,
          },
          {
            step: 4,
            label: 'Review audit',
            method: 'GET',
            url: selected.urls.audit,
          },
        ],
        review_checklist: [
          `Safety tier: ${selected.safety.safety_tier.label}`,
          `Safety score: ${selected.safety.score}/100 ${selected.safety.label}`,
          `Audit score: ${selected.audit.audit_score}/100 ${selected.audit.risk_label}`,
          `Trust score: ${selected.trust.score}/100 ${selected.trust.label}`,
          `Readiness: ${selected.decision.readiness_score}/100 ${selected.decision.readiness_label}`,
          ...selected.safety.policy_warnings.slice(0, 3),
          ...selected.audit.warnings.slice(0, 3),
        ],
        fallback_strategy: alternatives.slice(0, 3).map((candidate) => ({
          slug: candidate.skill.slug,
          name: candidate.skill.name,
          reason: candidate.recommendation_reasons[0] || 'Alternative task match',
          url: candidate.urls.web,
          install_api: candidate.urls.install_api,
        })),
        expected_agent_output: {
          selected_skill: 'slug and name',
          install_command: 'command or agent prompt used',
          risk_summary: 'audit, trust, and policy notes',
          next_step: 'what the agent will do after install',
        },
      }
    : null

  return {
    task,
    agent,
    constraints,
    selected,
    alternatives,
    blocked_candidates: blockedCandidates,
    agent_workflow: agentWorkflow,
    policy_decision: selected
      ? buildSafetyPolicyDecision(selected.safety)
      : {
          status: 'no_match',
          summary: 'No matching skill passed the current filters.',
        },
    agent_decision: agentDecision,
    benchmark: {
      endpoint: `${SITE_URL}/api/agent/evals`,
      note: 'Use the evals endpoint to regression-test recommendation quality before changing ranking logic.',
    },
    meta: {
      endpoint: '/api/agent/resolve',
      api_version: '1.0',
      generated_at: new Date().toISOString(),
      total_skills_searched: skills.length,
      total_candidates: candidates.length,
    },
  }
}
