import { NextRequest, NextResponse } from 'next/server'
import { resolveAgentSkill, type AgentResolveInput } from '@/lib/agent-resolve'

function parseLimit(value: string | null) {
  const parsed = Number(value || 5)
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : 5, 1), 10)
}

function textResponse(payload: Awaited<ReturnType<typeof resolveAgentSkill>>) {
  const selected = payload.selected
  const alternatives = payload.alternatives
    .map((item) => `${item.rank}. ${item.skill.name} (${item.skill.slug}) — safety ${item.safety.score}/100, audit ${item.audit.audit_score}/100`)
    .join('\n')

  return new NextResponse(
    `OpenAgentSkill Resolve API
Task: ${payload.task}
Policy: ${payload.policy_decision.status}

Selected:
${selected ? `${selected.skill.name} (${selected.skill.slug})
Match: ${selected.match_score}
Safety: ${selected.safety.score}/100 ${selected.safety.label}
Audit: ${selected.audit.audit_score}/100 ${selected.audit.risk_label}
Install: ${selected.install_plan.value}
URL: ${selected.urls.web}
Why: ${selected.recommendation_reasons.join('; ')}` : 'No match'}

Agent Workflow:
${payload.agent_workflow ? `Action: ${payload.agent_workflow.recommended_action}
Install API: ${payload.agent_workflow.install.api}
Command: ${payload.agent_workflow.install.command}
Prompt:
${payload.agent_workflow.copy_paste_prompt}

Review checklist:
${payload.agent_workflow.review_checklist.map((item) => `- ${item}`).join('\n')}` : 'No workflow generated'}

Alternatives:
${alternatives || 'No alternatives'}
`,
    {
      headers: {
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
    })

    if (format === 'text') return textResponse(payload)
    return NextResponse.json(payload)
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
