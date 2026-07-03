# OpenAgentSkill SDK

Tiny TypeScript client for the OpenAgentSkill agent-facing API.

It is intentionally dependency-free so an agent runtime can copy it into a project before a formal npm package is published.

```ts
import { createOpenAgentSkillClient } from './sdk/openagentskill'

const openagentskill = createOpenAgentSkillClient({
  defaultAgent: 'codex',
  defaultMaxRisk: 'medium',
})

const plan = await openagentskill.resolve('analyze stock news')

// Read plan.recommendation.trust_score_v5 before installing.
// Run the selected skill in a sandbox, then report the result.
await openagentskill.reportOutcome({
  event_id: plan.feedback.event_id,
  skill_slug: plan.recommendation.best_skill.slug,
  task: plan.task,
  agent: plan.agent,
  outcome: 'success',
  install_used: true,
  task_success: true,
  output_quality: 4,
  workspace: 'sandbox',
})
```

## Methods

- `resolve(task, options)` returns the selected skill, alternatives, install command, Trust Score v5, safety gate, and outcome feedback event.
- `resolveLockfile(task, options)` returns a compact lockfile for agent workflows.
- `receipt(task, options)` returns the durable install receipt.
- `skill(slug)` returns machine-readable skill metadata, Trust Score v5, audit, install targets, and outcome stats.
- `outcomeContract()` returns the current outcome feedback contract.
- `reportOutcome(payload)` records whether the resolved skill worked.

## Outcome Loop

Trust Score v5 expects every automated install attempt to report one of:

- `success`
- `failed`
- `not_relevant`
- `blocked_by_risk`
- `setup_required`

Use `dry_run: true` when wiring a new integration.
