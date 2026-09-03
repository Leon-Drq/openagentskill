# OpenAgentSkill CLI

The official, dependency-free CLI for resolving a task, reviewing safety policy,
installing a Skill through the standard `skills` installer, and reporting a
verified install receipt.

```bash
npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.3.0/openagentskill-0.3.0.tgz find "extract tables from PDF reports"
npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.3.0/openagentskill-0.3.0.tgz resolve "extract tables from PDF reports" --agent codex
npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.3.0/openagentskill-0.3.0.tgz inspect anthropic-frontend-design
npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.3.0/openagentskill-0.3.0.tgz add anthropic-frontend-design --agent codex --dry-run
npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.3.0/openagentskill-0.3.0.tgz add anthropic-frontend-design --agent codex --yes
```

Reviewed Skills require `--yes`; blocked Skills are never executed. Set
`OPENAGENTSKILL_TELEMETRY=0` or pass `--no-telemetry` to disable anonymous
install outcome reporting.

The npm package manifest is ready for Trusted Publishing. Until the npm
publisher is enabled, the immutable GitHub Release URL above remains the
official executable source.

The CLI does not execute arbitrary registry commands. It accepts only the
standard `npx skills add owner/repo` command shape returned by the install API,
passes arguments without a shell, and records success only after the installer
exits successfully.
