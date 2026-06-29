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
- inspect Agent Proven Score from real outcome reports before reusing a skill
- get an install command or agent-specific install prompt
- avoid random GitHub searching before installing third-party code

Preferred agent flow:
1. Read this file.
2. Load /api/agent/integration-kit for platform-specific Codex, Claude Code, or Cursor setup templates.
3. Choose a task from /tasks or /api/agent/tasks.
4. Call /api/agent/resolve with a natural-language task.
5. Read install_receipt, agent_handoff.platform_templates, agent_handoff.review_checklist, and policy_decision.
6. Fetch /api/agent/receipt?task={task}&agent={agent}&format=text when you need a compact install receipt without the full resolve payload.
7. Fetch /api/agent/evals?slug={slug}&task={task}&format=text and follow the eval decision.
8. Fetch /api/agent/skills/{slug} for the selected skill.
9. Fetch /api/skills/{slug}/install?format=text before installing.
10. After one narrow run, POST the result to /api/agent/outcome using install_receipt.outcome_feedback.event_id or feedback.event_id from resolve. Include output_quality, workspace, error_type, used_in_production, time_to_useful_ms, and human_review_required when known. Use dry_run=true before wiring a new integration.

Important URLs:
- Agent entry: https://www.openagentskill.com/agent
- Agent Integration Kit: https://www.openagentskill.com/agent/integration-kit
- Agent Integration Kit API: https://www.openagentskill.com/api/agent/integration-kit
- Tasks: https://www.openagentskill.com/tasks
- Task API: https://www.openagentskill.com/api/agent/tasks
- Resolve API: https://www.openagentskill.com/api/agent/resolve
- Install receipt API: https://www.openagentskill.com/api/agent/receipt
- Agent outcome API: https://www.openagentskill.com/api/agent/outcome
- Agent outcome contract: https://www.openagentskill.com/api/agent/outcome?contract=true
- Agent-Proven rankings: https://www.openagentskill.com/rankings/agent-proven
- Agent-Proven ranking API: https://www.openagentskill.com/api/agent/rankings?slug=agent-proven
- Best-by-success ranking API: https://www.openagentskill.com/api/agent/rankings?slug=best-by-success-rate
- Safe auto-install ranking API: https://www.openagentskill.com/api/agent/rankings?slug=safest-auto-install-skills
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
- Prefer /api/agent/receipt before installation because it gives a stable selected_skill, install policy, risk summary, alternatives, and outcome event id.
- Prefer agent_handoff over ad hoc page scraping because it returns platform templates, API sequence, review checklist, and blocked actions.
- Prefer /api/agent/evals?slug={slug} before installation because it returns the Trust + Eval contract, blockers, and validation plan.
- Report success, failed, not_relevant, blocked_by_risk, or setup_required to /api/agent/outcome so future rankings learn from real use. Add quality fields when possible.
- Prefer /rankings/agent-proven or /api/agent/rankings?slug=best-by-success-rate when an agent needs skills with real reported adoption instead of only GitHub stars.
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
