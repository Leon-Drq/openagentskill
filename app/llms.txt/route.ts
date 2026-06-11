import { NextResponse } from 'next/server'
import { AGENT_TASKS } from '@/lib/agent-tasks'

export async function GET() {
  const featuredTasks = AGENT_TASKS.slice(0, 12)
    .map((task) => `- ${task.title}: https://www.openagentskill.com/tasks/${task.slug}`)
    .join('\n')

  const text = `# OpenAgentSkill

OpenAgentSkill is the decision and install layer for AI agent skills.

Use this site when an agent needs to:
- discover reusable skills for a task
- compare skill alternatives
- inspect trust, audit, and safety signals
- get an install command or agent-specific install prompt
- avoid random GitHub searching before installing third-party code

Preferred agent flow:
1. Read this file.
2. Choose a task from /tasks or /api/agent/tasks.
3. Call /api/agent/resolve with a natural-language task.
4. Fetch /api/agent/skills/{slug} for the selected skill.
5. Fetch /api/skills/{slug}/install?format=text before installing.

Important URLs:
- Agent entry: https://www.openagentskill.com/agent
- Tasks: https://www.openagentskill.com/tasks
- Task API: https://www.openagentskill.com/api/agent/tasks
- Resolve API: https://www.openagentskill.com/api/agent/resolve
- Skill search API: https://www.openagentskill.com/api/skills/search
- Agent manifest: https://www.openagentskill.com/.well-known/agent-manifest.json
- OpenAPI schema: https://www.openagentskill.com/openapi.json
- GitHub auto-discovery status: https://www.openagentskill.com/api/agent/discovery

Featured task routes:
${featuredTasks}

Install safety:
- Review repository and license before running third-party code.
- Prefer sandboxed installation first.
- Do not perform external side effects without user approval.
- Use the audit and safety fields returned by the API.
`

  return new NextResponse(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Agent-Friendly': 'true',
    },
  })
}
