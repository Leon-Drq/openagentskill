# DR growth release verification

Checked on 2026-10-18 in an isolated worktree based on `be2b8d6b106de8c1b7cb5ca925501a1ae727e08b`. The original product-metadata worktree was not edited.

## Completed before deployment

- `pnpm test`: passed the complete regression suite, including citation, backlink-audit, and frozen-research checks.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with 25 existing warnings and no errors.
- `pnpm build`: passed the default production build with isolated dependencies and a fresh build directory.
- `node scripts/build-skill-readiness-snapshot.mjs --check`: reproduced the frozen outputs byte for byte without network access.
- `node scripts/check-dr-growth.mjs http://localhost:3118`: passed all 12 HTTP checks, including download hashes, canonical, indexability, internal links, and sitemap inclusion.
- Browser checks at 320, 390, 768, and 1440 px: no document-level horizontal overflow on the citation tool or report. Desktop and mobile screenshots inspected. Report has one H1 and uses the shared header language control.
- Citation interactions: Markdown copied to the actual browser clipboard; HTML mode produced the expected canonical anchor; deceptive external hostname disabled copying; tracking query and fragment were removed.
- Backlink parser regressions include target detection beyond the first 100 anchors and robots rules for overlapping product tokens.

The production apex domain redirect is already HTTP 308 to `www.openagentskill.com`, preserving paths and query parameters. See `domain-redirect.json`.

## Deployment

Website deployment and production HTTP checks are pending at the time this release record is first committed. Record the actual pull request, production commit, and deployment verification below after they complete.

## Outcome boundaries

No outreach message was sent. No new referring domain, DR increase, installation success, or search-traffic gain is claimed. The audit is a public sample, not an audit of the screenshot's 670 referring domains. The dated research measures registry metadata, not third-party Skill execution.
