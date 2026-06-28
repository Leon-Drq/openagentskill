import { NextResponse } from 'next/server'
import { AGENT_TASKS } from '@/lib/agent-tasks'
import { FEATURED_SKILL_CLUSTERS, SKILL_CLUSTERS } from '@/lib/seo/skill-clusters'

export async function GET() {
  const featuredTasks = AGENT_TASKS.slice(0, 12)
    .map((task) => `- ${task.title}: https://www.openagentskill.com/tasks/${task.slug}`)
    .join('\n')
  const featuredClusters = FEATURED_SKILL_CLUSTERS
    .map((cluster) => `- ${cluster.primaryKeyword}: https://www.openagentskill.com${cluster.path}`)
    .join('\n')

  const text = `# OpenAgentSkill

OpenAgentSkill is the decision and install layer for AI agent skills.
The GitHub auto-discovery pipeline expands the registry hourly across high-star domain workflows including finance, data, documents, security, DevOps, browser automation, RAG, research, and ML/media skills.

Use this site when an agent needs to:
- discover reusable skills for a task
- compare skill alternatives
- inspect trust, audit, and safety signals
- get an install command or agent-specific install prompt
- avoid random GitHub searching before installing third-party code

Preferred agent flow:
1. Read this file.
2. Load /api/agent/integration-kit for platform-specific Codex, Claude Code, or Cursor setup templates.
3. Choose a task from /tasks or /api/agent/tasks.
4. Call /api/agent/resolve with a natural-language task.
5. Read agent_handoff.platform_templates, agent_handoff.review_checklist, and policy_decision.
6. Fetch /api/agent/evals?slug={slug}&task={task}&format=text and follow the eval decision.
7. Fetch /api/agent/skills/{slug} for the selected skill.
8. Fetch /api/skills/{slug}/install?format=text before installing.
9. After one narrow run, POST the result to /api/agent/outcome using feedback.event_id from resolve. Include output_quality, workspace, error_type, and human_review_required when known. Use dry_run=true before wiring a new integration.

Important URLs:
- Agent entry: https://www.openagentskill.com/agent
- Agent Integration Kit: https://www.openagentskill.com/agent/integration-kit
- Agent Integration Kit API: https://www.openagentskill.com/api/agent/integration-kit
- Tasks: https://www.openagentskill.com/tasks
- Task API: https://www.openagentskill.com/api/agent/tasks
- Resolve API: https://www.openagentskill.com/api/agent/resolve
- Agent outcome API: https://www.openagentskill.com/api/agent/outcome
- Agent outcome contract: https://www.openagentskill.com/api/agent/outcome?contract=true
- Skill Eval API: https://www.openagentskill.com/api/agent/evals?slug=crawl4ai
- Resolve eval dashboard: https://www.openagentskill.com/evals/resolve
- Skill search API: https://www.openagentskill.com/api/skills/search
- Safety gate: https://www.openagentskill.com/safety
- Agent manifest: https://www.openagentskill.com/.well-known/agent-manifest.json
- OpenAPI schema: https://www.openagentskill.com/openapi.json
- GitHub auto-discovery status: https://www.openagentskill.com/api/agent/discovery

High-intent skill cluster routes:
${featuredClusters}

Featured task routes:
${featuredTasks}

Coverage:
- Skill cluster pages: ${SKILL_CLUSTERS.length}
- Task pages: ${AGENT_TASKS.length}

Install safety:
- Prefer /api/agent/resolve over raw search because it applies the OpenAgentSkill safety gate.
- Prefer agent_handoff over ad hoc page scraping because it returns platform templates, API sequence, review checklist, and blocked actions.
- Prefer /api/agent/evals?slug={slug} before installation because it returns the Trust + Eval contract, blockers, and validation plan.
- Report success, failed, not_relevant, blocked_by_risk, or setup_required to /api/agent/outcome so future rankings learn from real use. Add quality fields when possible.
- Treat safety_gate.blocked as "do not auto-install".
- Treat safety_gate.experimental as manual test only.
- Treat safety_gate.reviewed as human-review-before-install unless auto_install_policy is allow.
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
