# Changelog

Notable project and CLI changes are documented here. The project follows [Semantic Versioning](https://semver.org/) for published CLI and SDK packages and uses GitHub Releases for downloadable artifacts.

## Unreleased

### Changed

- Reworked the repository landing page around a verifiable 30-second demo and two primary actions.
- Added community governance, support routing, structured issue forms, repository ownership, and release documentation.
- Expanded CI to cover type checking, regression tests, local documentation links, and production builds.

### Security

- Added CodeQL, dependency review, Dependabot configuration, and documented private vulnerability reporting.
- Updated Next.js, Supabase, PostCSS, and related transitive dependencies to resolve known production and development advisories.

## CLI 0.3.0 - 2026-09-04

### Added

- Added concise `find` and `add` aliases for agent-native discovery and audited installation.
- Added strict required-input validation and a machine-friendly `--version` command.
- Added npm Trusted Publishing support with provenance while retaining immutable GitHub Release artifacts.
- Published the official `find-skills` Skill for API-first discovery, safety review, and outcome reporting.

[Release](https://github.com/Leon-Drq/openagentskill/releases/tag/cli-v0.3.0)

## CLI 0.2.1 - 2026-08-18

### Changed

- Published a pinned, lightweight GitHub Release artifact for reproducible CLI execution.
- Improved install handoff performance and release documentation.

[Release](https://github.com/Leon-Drq/openagentskill/releases/tag/cli-v0.2.1)

## CLI 0.2.0 - 2026-08-18

### Added

- Agent-native discovery commands.
- Reviewed install plans and verified install outcome receipts.
- Explicit dry-run and telemetry controls.

[Release](https://github.com/Leon-Drq/openagentskill/releases/tag/cli-v0.2.0)
