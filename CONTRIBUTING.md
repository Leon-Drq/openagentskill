# Contributing to OpenAgentSkill

OpenAgentSkill is an open discovery, audit, and recommendation layer for AI agent skills. Contributions should make the catalog more useful, more accurate, or easier for agents and builders to consume.

## How to Contribute

### Submit or Fix a Skill

- Submit a skill through [openagentskill.com/submit](https://www.openagentskill.com/submit) when possible.
- Open an issue if a listed skill has stale metadata, wrong category, broken install instructions, or missing audit context.
- Automated bulk imports are skill-only. MCP servers and Model Context Protocol repos are intentionally excluded.

### For Skill Authors

- Make the install command explicit and reproducible.
- Include a `README.md` or `SKILL.md` with the task scenario, supported agents, required secrets, risk notes, and examples.
- Add a clear license.
- Keep dependency and shell behavior easy to inspect.
- Link back to the OpenAgentSkill listing when your skill is indexed.
- Add Trust and Audit badges after the listing exists:

```md
[![OpenAgentSkill Trust](https://www.openagentskill.com/api/badge/YOUR-SLUG?metric=trust&label=Trust)](https://www.openagentskill.com/skills/YOUR-SLUG)
[![OpenAgentSkill Audit](https://www.openagentskill.com/api/badge/YOUR-SLUG?metric=audit&label=Audit)](https://www.openagentskill.com/skills/YOUR-SLUG/audit)
```

### Report Bugs

- Check whether the bug is already reported.
- Include the affected page or API route.
- Include steps to reproduce, expected behavior, actual behavior, and screenshots when relevant.

### Suggesting Features

- Explain the user or agent workflow the feature improves.
- Include example skills, queries, or pages when possible.
- Prefer concrete changes to ranking, audit, search, submission, API, or SEO behavior.

### Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes with clear commit messages
4. Ensure code follows existing patterns and style
5. Test your changes locally
6. Submit a pull request with a clear description

## Development Setup

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run linting
pnpm run lint

# Build production bundle
pnpm run build
```

For UI changes, also check the affected pages on desktop and mobile widths.

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New features
- `fix:` — Bug fixes
- `docs:` — Documentation changes
- `style:` — Code style changes (formatting, etc.)
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

## Code Style

- Use TypeScript for all new code
- Follow existing component patterns
- Use Tailwind CSS for styling
- Keep components small and focused
- Keep privileged routes protected by server-side secrets
- Never expose service-role Supabase keys or X OAuth secrets to the browser
- Keep SEO pages useful and specific; avoid thin copied content

## Questions?

Feel free to open an issue or reach out to the maintainers.
