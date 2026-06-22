import { NextRequest, NextResponse } from 'next/server'
import { resolveAgentSkill, type AgentResolveInput } from '@/lib/agent-resolve'

export const revalidate = 300

const RESOLVE_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
}

function parseLimit(value: string | null) {
  const parsed = Number(value || 5)
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : 5, 1), 10)
}

function textResponse(payload: Awaited<ReturnType<typeof resolveAgentSkill>>) {
  const selected = payload.selected
  const alternatives = payload.alternatives
    .map((item) => `${item.rank}. ${item.skill.name} (${item.skill.slug}) — ${item.safety.safety_tier.label}, safety ${item.safety.score}/100, audit ${item.audit.audit_score}/100`)
    .join('\n')
  const blocked = payload.blocked_candidates
    .map((item) => `${item.rank}. ${item.skill.name} (${item.skill.slug}) — ${item.safety.safety_tier.recommended_action}`)
    .join('\n')

  return new NextResponse(
    `OpenAgentSkill Resolve API
Task: ${payload.task}
Policy: ${payload.policy_decision.status}

Recommendation:
${payload.recommendation ? `Best skill: ${payload.recommendation.best_skill.name} (${payload.recommendation.best_skill.slug})
URL: ${payload.recommendation.best_skill.url}
Repository: ${payload.recommendation.best_skill.repository}
Install: ${payload.recommendation.install.command}
Install policy: ${payload.recommendation.install.policy}
Trust Score v4: ${payload.recommendation.trust_score_v4.score}/100 ${payload.recommendation.trust_score_v4.label}
Risk: ${payload.recommendation.risk.level}; ${payload.recommendation.risk.safety_tier}; ${payload.recommendation.risk.trust}
Why:
${payload.recommendation.why_recommended.map((item) => `- ${item}`).join('\n')}
Agent instruction:
${payload.recommendation.agent_instruction}
Agent contract:
- Version: ${payload.recommendation.agent_contract.version}
- Install policy: ${payload.recommendation.agent_contract.install_policy}
- Auto-install allowed: ${payload.recommendation.agent_contract.auto_install_allowed ? 'yes' : 'no'}
- Human review required: ${payload.recommendation.agent_contract.human_review_required ? 'yes' : 'no'}
- Audit URL: ${payload.recommendation.agent_contract.audit_url}
- Do not use when:
${payload.recommendation.agent_contract.do_not_use_when.slice(0, 4).map((item) => `  - ${item}`).join('\n')}` : 'No recommendation generated'}

Feedback:
Event ID: ${payload.feedback.event_id}
Outcome API: ${payload.feedback.outcome_api}
CLI: ${payload.feedback.cli_example}

Selected:
${selected ? `${selected.skill.name} (${selected.skill.slug})
Match: ${selected.match_score}
Supply: ${selected.supply_profile.track.shortLabel} / ${selected.supply_profile.scenario.label}
Maintenance: ${selected.supply_profile.maintenance.label}
Risk: ${selected.supply_profile.risk.label}
Safety: ${selected.safety.score}/100 ${selected.safety.label}
Safety tier: ${selected.safety.safety_tier.label}
Auto-install policy: ${selected.safety.safety_tier.auto_install_policy}
Audit: ${selected.audit.audit_score}/100 ${selected.audit.risk_label}
Install: ${selected.install_plan.value}
URL: ${selected.urls.web}
Why: ${selected.recommendation_reasons.join('; ')}` : 'No match'}

Agent Decision:
${payload.agent_decision ? `Recommended skill: ${payload.agent_decision.recommended_skill.name}
Install command: ${payload.agent_decision.install_command}
Safety gate: ${payload.agent_decision.safety_gate.label} (${payload.agent_decision.safety_gate.auto_install_policy})
Why recommended:
${payload.agent_decision.why_recommended.map((item) => `- ${item}`).join('\n')}
Risk summary: ${payload.agent_decision.risk_summary.level}; ${payload.agent_decision.risk_summary.safety_tier}; ${payload.agent_decision.risk_summary.safety}; ${payload.agent_decision.risk_summary.trust}
Risk notes:
${payload.agent_decision.risk_summary.notes.map((item) => `- ${item}`).join('\n')}
Next steps:
${payload.agent_decision.agent_next_steps.map((item) => `- ${item}`).join('\n')}` : 'No agent decision generated'}

Agent Workflow:
${payload.agent_workflow ? `Action: ${payload.agent_workflow.recommended_action}
Install API: ${payload.agent_workflow.install.api}
Command: ${payload.agent_workflow.install.command}
Prompt:
${payload.agent_workflow.copy_paste_prompt}

Review checklist:
${payload.agent_workflow.review_checklist.map((item) => `- ${item}`).join('\n')}` : 'No workflow generated'}

Agent Handoff:
${payload.agent_handoff ? `Version: ${payload.agent_handoff.version}
Mode: ${payload.agent_handoff.mode}
Selected skill: ${payload.agent_handoff.selected_skill.name} (${payload.agent_handoff.selected_skill.slug})
Install policy: ${payload.agent_handoff.install_plan.policy}
Auto-install allowed: ${payload.agent_handoff.install_plan.auto_install_allowed ? 'yes' : 'no'}
Human review required: ${payload.agent_handoff.install_plan.human_review_required ? 'yes' : 'no'}
Platform templates:
${payload.agent_handoff.platform_templates.map((template) => `- ${template.name}: use copy_prompt from agent_handoff.platform_templates.${template.id}`).join('\n')}
Blocked actions:
${payload.agent_handoff.blocked_actions.map((item) => `- ${item}`).join('\n')}` : 'No agent handoff generated'}

Alternatives:
${alternatives || 'No alternatives'}

Blocked for auto-install:
${blocked || 'No blocked candidates'}
`,
    {
      headers: {
        ...RESOLVE_CACHE_HEADERS,
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Agent-Friendly': 'true',
      },
    }
  )
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const task = searchParams.get('task') || ''
  const format = searchParams.get('format') || 'json'

  if (!task) {
    return NextResponse.json(
      {
        error: 'Missing required parameter: task',
        usage: 'GET /api/agent/resolve?task=review+pull+requests&agent=codex&max_risk=medium',
      },
      { status: 400 }
    )
  }

  try {
    const payload = await resolveAgentSkill({
      task,
      agent: searchParams.get('agent') || 'auto',
      limit: parseLimit(searchParams.get('limit')),
      constraints: {
        max_risk: searchParams.get('max_risk') || 'medium',
        needs_install_command: searchParams.get('needs_install_command') !== 'false',
        min_stars: Number(searchParams.get('min_stars') || 0),
      },
      live: searchParams.get('live') === 'true',
    })

    if (format === 'text') return textResponse(payload)
    return NextResponse.json(payload, { headers: RESOLVE_CACHE_HEADERS })
  } catch (error) {
    console.error('Agent resolve API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve skill' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AgentResolveInput & { format?: string }
    const payload = await resolveAgentSkill(body)

    if (body.format === 'text') return textResponse(payload)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Agent resolve API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve skill' },
      { status: 500 }
    )
  }
}
