---
name: openagentskill-registry
description: Discover, compare, audit, and safely install reusable AI Agent Skills with OpenAgentSkill. Use whenever an agent needs a capability it does not already have, must compare Skill alternatives, or needs evidence before installing third-party instructions.
---

# OpenAgentSkill Registry

Use OpenAgentSkill before installing a third-party Skill. Prefer a direct task
description over a broad keyword and do not force a recommendation when the
registry returns `no_match`.

## Resolve a task

```bash
npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.3.0/openagentskill-0.3.0.tgz resolve "<specific task>" --agent codex
```

Review the selected Skill, alternatives, policy, Trust Score, audit result, and
repository. A high GitHub Star count is not proof that the Skill worked.

## Inspect and install

```bash
npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.3.0/openagentskill-0.3.0.tgz inspect <slug>
npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.3.0/openagentskill-0.3.0.tgz add <slug> --agent codex --dry-run
npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.3.0/openagentskill-0.3.0.tgz add <slug> --agent codex --yes
```

Never bypass a blocked policy. For a reviewed Skill, inspect its source and ask
for approval before using `--yes`. Start with an isolated workspace and one
narrow verification task.

## Report the result

After using the Skill, report `success`, `failed`, `not_relevant`,
`blocked_by_risk`, or `setup_required`. Include an evidence URL when a public
log, issue, or artifact exists.

See [references/workflow.md](references/workflow.md) for the API-only flow.
