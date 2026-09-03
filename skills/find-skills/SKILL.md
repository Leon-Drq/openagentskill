---
name: find-skills
description: Find, compare, audit, and safely install reusable AI agent skills from OpenAgentSkill. Use when a user asks for a skill, plugin, reusable agent workflow, or the best tool for a task.
license: MIT
compatibility: Requires internet access to www.openagentskill.com. Installation commands require Node.js 20+.
metadata:
  author: OpenAgentSkill
  homepage: https://www.openagentskill.com/resolve
---

# Find Skills with OpenAgentSkill

Turn the user's task into an evidence-backed shortlist. Do not recommend a
skill only because its repository is popular.

## Workflow

1. Resolve the task with the public endpoint:

   `GET https://www.openagentskill.com/api/agent/resolve?task=<encoded-task>&agent=<agent-name>`

2. Read `selected`, `recommendation_lanes`, `policy_decision`, and at least
   three entries from `alternatives` when they exist.
3. Before installing, open the selected Skill's `urls.audit` and inspect its
   repository source, license, permissions, setup requirements, and freshness.
4. Use `install_plan.command` only when the policy allows it. If human review
   is required, present the risks and ask for approval. Never install a blocked
   Skill.
5. Run one narrow verification task in a sandbox or low-risk workspace.
6. Report the result to the returned feedback endpoint with its unique
   `event_id`. Report success only when installation and the verification task
   both succeeded.

## CLI

The official release can perform the same workflow:

`npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.3.0/openagentskill-0.3.0.tgz find "<task>"`

Use `resolve` for the complete decision object and `add <slug> --dry-run`
before a reviewed install. Anonymous telemetry can be disabled with
`--no-telemetry` or `OPENAGENTSKILL_TELEMETRY=0`.

## Decision rules

- Prefer task fit, safety, verified outcomes, and maintenance over raw stars.
- Treat repository stars as a project-level popularity signal, not proof that
  every nested Skill has equivalent adoption.
- If no candidate fits, say so and use the agent's native tools instead of
  forcing an unrelated recommendation.
