import { NextRequest, NextResponse } from 'next/server'
import { getAgentTaskBySlug, selectSkillsForTask } from '@/lib/agent-tasks'
import { getAllSkills } from '@/lib/db/skills'
import { toRegistrySkill } from '@/lib/registry'

function resolveUrl(prompt: string) {
  return `https://www.openagentskill.com/api/agent/resolve?task=${encodeURIComponent(prompt)}&agent=codex&max_risk=medium`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const format = request.nextUrl.searchParams.get('format') || 'json'
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 5), 1), 10)
  const task = getAgentTaskBySlug(slug)

  if (!task) {
    return NextResponse.json({ error: `Task not found: ${slug}` }, { status: 404 })
  }

  const skills = await getAllSkills('quality').catch(() => [])
  const ranked = selectSkillsForTask(skills, task, limit)

  if (format === 'text') {
    const skillText = ranked.map(({ skill, score }, index) => {
      const item = toRegistrySkill(skill)
      return `${index + 1}. ${item.name} (${item.slug})
   Match score: ${Math.round(score)}
   ${item.description}
   Trust: ${item.trust.score}/100 ${item.trust.label}
   Audit: ${item.audit.audit_score}/100 ${item.audit.risk_label}
   Install: ${item.install}
   Detail: ${item.urls.web}
   Install API: ${item.urls.install_api}`
    }).join('\n---\n')

    return new NextResponse(
      `OpenAgentSkill Task
Task: ${task.title}
Intent: ${task.intent}
Agent prompt: ${task.agentPrompt}

Success criteria:
${task.successCriteria.map((item) => `- ${item}`).join('\n')}

Do not use when:
${task.avoidWhen.map((item) => `- ${item}`).join('\n')}

Resolve API:
${resolveUrl(task.agentPrompt)}

Ranked skills:
${skillText || 'No strong matches yet.'}`,
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Agent-Friendly': 'true',
        },
      }
    )
  }

  return NextResponse.json({
    task,
    ranked_skills: ranked.map(({ skill, score }, index) => ({
      rank: index + 1,
      match_score: Math.round(score * 10) / 10,
      ...toRegistrySkill(skill),
    })),
    urls: {
      web: `https://www.openagentskill.com/tasks/${task.slug}`,
      resolve: resolveUrl(task.agentPrompt),
      use_case: `https://www.openagentskill.com/use-cases/${task.useCaseSlug}`,
    },
    meta: {
      endpoint: `/api/agent/tasks/${task.slug}`,
      api_version: '1.0',
      agent_friendly: true,
      generated_at: new Date().toISOString(),
    },
  })
}
