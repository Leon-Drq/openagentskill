import { NextRequest, NextResponse } from 'next/server'
import { AGENT_TASKS } from '@/lib/agent-tasks'

function taskUrl(slug: string) {
  return `https://www.openagentskill.com/tasks/${slug}`
}

function resolveUrl(prompt: string) {
  return `https://www.openagentskill.com/api/agent/resolve?task=${encodeURIComponent(prompt)}&agent=codex&max_risk=medium`
}

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') || 'json'

  if (format === 'text') {
    const text = AGENT_TASKS.map((task, index) => (
      `${index + 1}. ${task.title} (${task.slug})
   Intent: ${task.intent}
   Agent prompt: ${task.agentPrompt}
   Page: ${taskUrl(task.slug)}
   Resolve: ${resolveUrl(task.agentPrompt)}`
    )).join('\n---\n')

    return new NextResponse(
      `OpenAgentSkill Agent Tasks
Use this catalog when an agent knows the job but not the right skill.
Tasks: ${AGENT_TASKS.length}
---
${text}`,
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Agent-Friendly': 'true',
        },
      }
    )
  }

  return NextResponse.json({
    tasks: AGENT_TASKS.map((task) => ({
      ...task,
      urls: {
        web: taskUrl(task.slug),
        api: `https://www.openagentskill.com/api/agent/tasks/${task.slug}`,
        resolve: resolveUrl(task.agentPrompt),
        text: `https://www.openagentskill.com/api/agent/tasks/${task.slug}?format=text`,
        use_case: `https://www.openagentskill.com/use-cases/${task.useCaseSlug}`,
      },
    })),
    meta: {
      endpoint: '/api/agent/tasks',
      api_version: '1.0',
      agent_friendly: true,
      generated_at: new Date().toISOString(),
    },
  })
}
