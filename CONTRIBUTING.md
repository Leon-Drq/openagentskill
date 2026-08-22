# Contributing to OpenAgentSkill

Thank you for helping make Agent Skill discovery, evaluation, and installation more useful and trustworthy.

## Choose a contribution path

- **Product or API bug:** use the [bug report form](https://github.com/Leon-Drq/openagentskill/issues/new?template=bug.yml).
- **Product proposal:** start with the [feature request form](https://github.com/Leon-Drq/openagentskill/issues/new?template=feature.yml).
- **New or incorrect Skill:** use the [web submission flow](https://www.openagentskill.com/submit) or [Skill data form](https://github.com/Leon-Drq/openagentskill/issues/new?template=skill.yml).
- **Usage question:** use [GitHub Discussions](https://github.com/Leon-Drq/openagentskill/discussions).
- **Security vulnerability:** do not open a public issue; follow [SECURITY.md](./SECURITY.md).

Look for [`good first issue`](https://github.com/Leon-Drq/openagentskill/labels/good%20first%20issue) and [`help wanted`](https://github.com/Leon-Drq/openagentskill/labels/help%20wanted) when choosing a first contribution.

## Before coding

1. Search open and closed issues and pull requests.
2. For a material feature, open an issue describing the user or agent workflow first.
3. Keep changes focused; unrelated refactors should use a separate pull request.
4. Never include production secrets, private Skill contents, user data, or access tokens.

## Development setup

Requirements: Node.js 22 and pnpm 10.28.2.

```bash
git clone https://github.com/Leon-Drq/openagentskill.git
cd openagentskill
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

The website needs Supabase configuration for live data. Pure regression and contract tests run without production credentials.

## Required checks

Run these before requesting review:

```bash
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run test:links
pnpm run build
```

For UI changes, verify the affected flow at desktop and mobile widths. For API changes, include a representative request and response. For ranking or Trust Score changes, explain expected movement and add regression evidence.

## Pull requests

1. Fork the repository and branch from `main`.
2. Use a clear [Conventional Commit](https://www.conventionalcommits.org/) title.
3. Complete the pull-request checklist and link the relevant issue.
4. Keep generated artifacts, migrations, environment changes, and deployment requirements explicit.
5. Address automated checks and review comments without rewriting unrelated code.

Maintainers may close stale, duplicate, promotional, or insufficiently reproducible submissions. A merged contribution does not guarantee that a third-party Skill will be approved, ranked, or marked safe.

## Code and content standards

- Use TypeScript for new application code.
- Follow existing Next.js App Router and component patterns.
- Keep privileged operations server-side and protected by appropriate authorization.
- Preserve the distinction between indexed, reviewed, verified, and Agent-Proven evidence.
- Do not present GitHub stars as a security signal or approval gate.
- Keep programmatic pages specific, useful, and backed by real Skill data.
- Add or update tests for behavior changes.
- Prefer primary sources for technical, security, and research claims.

## Skill metadata standards

Skill authors should provide a reproducible install path, clear task scope, supported agents, required secrets, permissions, risk notes, examples, and an explicit license. Automated bulk imports are Skill-only; generic repositories and MCP-only projects are outside the registry scope.

## Community

Participation is governed by [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md). Project decision making is described in [GOVERNANCE.md](./GOVERNANCE.md), and support routes are listed in [SUPPORT.md](./SUPPORT.md).
