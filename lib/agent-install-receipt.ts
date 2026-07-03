const SITE_URL = 'https://www.openagentskill.com'

type ReceiptFeedback = {
  event_id: string
  outcome_api: string
  method: string
  expected_outcomes: readonly string[]
  json_example: Record<string, unknown>
  cli_example: string
}

type ReceiptCandidate = {
  skill: {
    slug: string
    name: string
    description: string
    category: string
    repository?: string
    github_repo?: string
  }
  urls: {
    web: string
    api: string
    audit: string
    eval: string
    install_api: string
    repository: string
  }
  install_plan: {
    command: string
    target: string
    label: string
    kind: string
    value: string
  }
  recommendation_reasons: string[]
  trust: {
    score: number
    label: string
    version: string
    autoInstall?: {
      sandboxRequired?: boolean
    }
    outcomeEvidence?: {
      label?: string
      total?: number
      successRate?: number | null
    }
  }
  trust_v5?: {
    score: number
    base_score?: number
    outcome_confidence?: number
    label: string
    version: string
    decision?: {
      install_policy: string
      auto_install_allowed: boolean
      human_review_required: boolean
      sandbox_first: boolean
      agent_action: string
      reasoning: string[]
      review_required_when: string[]
    }
    outcome_loop?: {
      version: string
      endpoint: string
      method: string
      required_after_install: boolean
      expected_outcomes: string[]
      required_fields: string[]
      quality_fields: string[]
    }
  }
  agent_proven?: {
    score: number
    label: string
    summary: string
    metrics: {
      totalOutcomes: number
      successRate: number | null
      recentSuccessRate: number | null
      recentFailureRate: number | null
      installAttempts: number
      installSuccessRate: number | null
      riskBlocked: number
      setupRequired: number
      avgOutputQuality: number | null
      productionOutcomes: number
    }
  } | null
  audit: {
    audit_score: number
    risk_label: string
    warnings: string[]
  }
  safety: {
    score: number
    label: string
    auto_install_allowed: boolean
    human_review_required: boolean
    blocked: boolean
    safety_tier: {
      tier: string
      label: string
      auto_install_policy: string
      recommended_action: string
      reasons: string[]
    }
    policy_warnings: string[]
  }
  safety_gate: {
    label: string
    auto_install_policy: string
    auto_install_allowed: boolean
    human_review_required: boolean
    blocked: boolean
    recommended_action: string
    reasons: string[]
  }
  decision: {
    headline: string
    next_steps?: string[]
  }
  machine_metadata: {
    suited_tasks: string[]
    suited_agents: string[]
    do_not_use_when: string[]
    agent_contract: {
      minimum_review_before_use: string[]
      expected_agent_output: Record<string, string>
    }
  }
  supply_profile: {
    install: {
      ready: boolean
    }
  }
}

export function buildAgentInstallReceipt(input: {
  task: string
  agent: string
  constraints: {
    max_risk?: string
    min_stars?: number
    needs_install_command?: boolean
  }
  generatedAt: string
  selected: ReceiptCandidate | null
  alternatives: ReceiptCandidate[]
  feedback: ReceiptFeedback
}) {
  if (!input.selected) return null

  const selected = input.selected
  const receiptId = input.feedback.event_id.replace(/^resolve_/, 'receipt_')
  const resolveQuery = new URLSearchParams({
    task: input.task,
    agent: input.agent,
    max_risk: input.constraints.max_risk || 'medium',
  })
  if (input.constraints.min_stars) resolveQuery.set('min_stars', String(input.constraints.min_stars))

  const receiptQuery = new URLSearchParams(resolveQuery)
  const reasons = [
    ...selected.recommendation_reasons,
    selected.decision.headline,
    `${selected.trust_v5?.score || selected.trust.score}/100 Trust Score`,
    selected.agent_proven ? `${selected.agent_proven.score}/100 Agent Proven Score` : null,
    `${selected.audit.audit_score}/100 audit score`,
    `${selected.safety.score}/100 safety score`,
  ].filter(Boolean).slice(0, 8)
  const riskNotes = [
    ...selected.safety.policy_warnings,
    ...selected.audit.warnings,
    ...selected.safety.safety_tier.reasons,
  ].filter(Boolean)

  return {
    version: 'openagentskill-install-receipt-v1',
    receipt_id: receiptId,
    resolve_event_id: input.feedback.event_id,
    generated_at: input.generatedAt,
    task: input.task,
    agent: input.agent,
    constraints: input.constraints,
    urls: {
      web: `${SITE_URL}/resolve?${resolveQuery.toString()}`,
      json: `${SITE_URL}/api/agent/receipt?${receiptQuery.toString()}`,
      text: `${SITE_URL}/api/agent/receipt?${receiptQuery.toString()}&format=text`,
      resolve_json: `${SITE_URL}/api/agent/resolve?${resolveQuery.toString()}`,
      resolve_text: `${SITE_URL}/api/agent/resolve?${resolveQuery.toString()}&format=text`,
    },
    selected_skill: {
      slug: selected.skill.slug,
      name: selected.skill.name,
      description: selected.skill.description,
      category: selected.skill.category,
      url: selected.urls.web,
      api_url: selected.urls.api,
      audit_url: selected.urls.audit,
      eval_url: selected.urls.eval,
      install_api_url: selected.urls.install_api,
      repository: selected.urls.repository,
    },
    install: {
      command: selected.install_plan.command,
      target: selected.install_plan.target,
      label: selected.install_plan.label,
      kind: selected.install_plan.kind,
      value: selected.install_plan.value,
      ready: selected.supply_profile.install.ready,
      policy: selected.safety.safety_tier.auto_install_policy,
      auto_install_allowed: selected.safety.auto_install_allowed,
      human_review_required: selected.safety.human_review_required,
      sandbox_first: !selected.safety.auto_install_allowed || Boolean(selected.trust.autoInstall?.sandboxRequired),
      blocked: selected.safety.blocked,
    },
    decision: {
      recommendation: selected.safety.safety_tier.recommended_action,
      why_selected: reasons,
      suited_tasks: selected.machine_metadata.suited_tasks,
      suited_agents: selected.machine_metadata.suited_agents,
    },
    trust: {
      score: selected.trust_v5?.score || selected.trust.score,
      label: selected.trust_v5?.label || selected.trust.label,
      version: selected.trust_v5?.version || selected.trust.version,
      base_score: selected.trust_v5?.base_score || selected.trust.score,
      outcome_confidence: selected.trust_v5?.outcome_confidence ?? null,
      outcome_signal: selected.trust.outcomeEvidence?.label || 'No reported agent outcomes yet',
      outcome_total: selected.trust.outcomeEvidence?.total || 0,
      outcome_success_rate: selected.trust.outcomeEvidence?.successRate ?? null,
      decision: selected.trust_v5?.decision || null,
      outcome_loop: selected.trust_v5?.outcome_loop || null,
    },
    agent_proven: selected.agent_proven
      ? {
          score: selected.agent_proven.score,
          label: selected.agent_proven.label,
          summary: selected.agent_proven.summary,
          metrics: {
            totalOutcomes: selected.agent_proven.metrics.totalOutcomes,
            successRate: selected.agent_proven.metrics.successRate,
            recentSuccessRate: selected.agent_proven.metrics.recentSuccessRate,
            recentFailureRate: selected.agent_proven.metrics.recentFailureRate,
            installAttempts: selected.agent_proven.metrics.installAttempts,
            installSuccessRate: selected.agent_proven.metrics.installSuccessRate,
            riskBlocked: selected.agent_proven.metrics.riskBlocked,
            setupRequired: selected.agent_proven.metrics.setupRequired,
            avgOutputQuality: selected.agent_proven.metrics.avgOutputQuality,
            productionOutcomes: selected.agent_proven.metrics.productionOutcomes,
          },
        }
      : null,
    risk: {
      level: selected.audit.risk_label,
      safety_tier: selected.safety.safety_tier.label,
      safety_score: selected.safety.score,
      audit_score: selected.audit.audit_score,
      notes: [...new Set(riskNotes)].slice(0, 8),
      do_not_use_when: selected.machine_metadata.do_not_use_when,
      minimum_review_before_use: selected.machine_metadata.agent_contract.minimum_review_before_use,
    },
    alternatives: input.alternatives.slice(0, 5).map((candidate) => ({
      slug: candidate.skill.slug,
      name: candidate.skill.name,
      url: candidate.urls.web,
      audit_url: candidate.urls.audit,
      install_command: candidate.install_plan.command,
      trust_score: candidate.trust.score,
      audit_score: candidate.audit.audit_score,
      safety_score: candidate.safety.score,
      reason: candidate.recommendation_reasons[0] || candidate.decision.headline,
      policy: candidate.safety.safety_tier.auto_install_policy,
    })),
    outcome_feedback: {
      event_id: input.feedback.event_id,
      endpoint: input.feedback.outcome_api,
      method: input.feedback.method,
      expected_outcomes: input.feedback.expected_outcomes,
      payload_template: input.feedback.json_example,
      dry_run_payload: {
        ...input.feedback.json_example,
        dry_run: true,
      },
      cli_example: input.feedback.cli_example,
      instruction:
      'After one narrow sandbox run, report success, failed, not_relevant, blocked_by_risk, or setup_required so Trust Score v5 and future agent rankings learn from real usage.',
    },
    next_steps: [
      `Read the audit page: ${selected.urls.audit}`,
      `Fetch the pre-install eval: ${selected.urls.eval}`,
      selected.safety.auto_install_allowed
        ? `Install in a sandbox with: ${selected.install_plan.command}`
        : `Do not auto-install yet. Ask for human review before running: ${selected.install_plan.command}`,
      'Run one narrow task with no production secrets or irreversible side effects.',
      `Report the result to ${input.feedback.outcome_api} using event_id ${input.feedback.event_id}.`,
    ],
    stable_fields: [
      'receipt_id',
      'selected_skill',
      'install',
      'trust',
      'risk',
      'alternatives',
      'outcome_feedback',
      'next_steps',
    ],
    freshness_policy: 'Re-resolve before production use or after 24 hours to refresh trust, audit, and outcome signals.',
  }
}

export type AgentInstallReceipt = NonNullable<ReturnType<typeof buildAgentInstallReceipt>>

export function formatAgentInstallReceiptText(receipt: AgentInstallReceipt) {
  return [
    'OpenAgentSkill Install Receipt',
    `Version: ${receipt.version}`,
    `Receipt ID: ${receipt.receipt_id}`,
    `Resolve event: ${receipt.resolve_event_id}`,
    `Generated: ${receipt.generated_at}`,
    '',
    `Task: ${receipt.task}`,
    `Agent: ${receipt.agent}`,
    '',
    `Selected skill: ${receipt.selected_skill.name} (${receipt.selected_skill.slug})`,
    `URL: ${receipt.selected_skill.url}`,
    `Repository: ${receipt.selected_skill.repository}`,
    `Audit: ${receipt.selected_skill.audit_url}`,
    `Eval: ${receipt.selected_skill.eval_url}`,
    '',
    `Install: ${receipt.install.command}`,
    `Install policy: ${receipt.install.policy}`,
    `Auto-install allowed: ${receipt.install.auto_install_allowed ? 'yes' : 'no'}`,
    `Human review required: ${receipt.install.human_review_required ? 'yes' : 'no'}`,
    `Sandbox first: ${receipt.install.sandbox_first ? 'yes' : 'no'}`,
    '',
    `Trust: ${receipt.trust.score}/100 ${receipt.trust.label}`,
    `Agent Proven: ${receipt.agent_proven ? `${receipt.agent_proven.score}/100 ${receipt.agent_proven.label}` : 'No data'}`,
    `Audit: ${receipt.risk.audit_score}/100 ${receipt.risk.level}`,
    `Safety: ${receipt.risk.safety_score}/100 ${receipt.risk.safety_tier}`,
    `Outcome signal: ${receipt.trust.outcome_signal}`,
    '',
    'Why selected:',
    ...receipt.decision.why_selected.map((item) => `- ${item}`),
    '',
    'Do not use when:',
    ...(receipt.risk.do_not_use_when.length
      ? receipt.risk.do_not_use_when.map((item) => `- ${item}`)
      : ['- No explicit do-not-use metadata provided. Review the audit before production use.']),
    '',
    'Alternatives:',
    ...(receipt.alternatives.length
      ? receipt.alternatives.map((item) => `- ${item.name} (${item.slug}): ${item.install_command}`)
      : ['- No alternatives returned by this resolve request.']),
    '',
    'Outcome feedback:',
    `Endpoint: ${receipt.outcome_feedback.method} ${receipt.outcome_feedback.endpoint}`,
    `Event ID: ${receipt.outcome_feedback.event_id}`,
    `CLI: ${receipt.outcome_feedback.cli_example}`,
    '',
    'Next steps:',
    ...receipt.next_steps.map((item, index) => `${index + 1}. ${item}`),
  ].join('\n')
}
