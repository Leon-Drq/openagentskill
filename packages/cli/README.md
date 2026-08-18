# OpenAgentSkill CLI

The official, dependency-free CLI for resolving a task, reviewing safety policy,
installing a Skill through the standard `skills` installer, and reporting a
verified install receipt.

```bash
npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.2.1/openagentskill-0.2.1.tgz search "extract tables from PDF reports"
npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.2.1/openagentskill-0.2.1.tgz resolve "extract tables from PDF reports" --agent codex
npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.2.1/openagentskill-0.2.1.tgz inspect anthropic-frontend-design
npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.2.1/openagentskill-0.2.1.tgz install anthropic-frontend-design --agent codex --dry-run
npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.2.1/openagentskill-0.2.1.tgz install anthropic-frontend-design --agent codex --yes
```

Reviewed Skills require `--yes`; blocked Skills are never executed. Set
`OPENAGENTSKILL_TELEMETRY=0` or pass `--no-telemetry` to disable anonymous
install outcome reporting.

The CLI does not execute arbitrary registry commands. It accepts only the
standard `npx skills add owner/repo` command shape returned by the install API,
passes arguments without a shell, and records success only after the installer
exits successfully.
