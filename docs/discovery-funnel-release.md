# Discovery-to-use release — September 2026

## Scope

- Keep `/skills` as the existing selected, source-recorded shortlist. Add a clearly labeled full directory at `/skills?view=all`.
- Full-directory filters and 16-row pagination run in the database with a stable slug tie-breaker. No artificial 30-page cap. The count is **public registry entries**, not verified installs or an assurance of safety. MCP-only entries are omitted from visible cards, so a page can contain fewer than 16 cards. Search/advanced profile filters remain bounded shortlists and say so.
- Public publication predicates and source/review evidence are unchanged. Failed catalog queries do not cache an empty result or replace live counts with curated snapshots. Successful responses are cached for five minutes; newly published entries and counts may therefore lag briefly.
- Chinese task vocabulary adds deterministic retrieval terms, without a model API. Existing relevance gates still apply. An unknown task can legitimately have no matches. Full-text search has a bounded 3.5-second deadline (page envelope: 4 seconds), allowing source evidence to arrive before incorrectly declaring a partial response.
- Copy handoffs explain the next step and distinguish copying from installation/task success. Dependency, permission and paid-service checks are included in agent prompts; unknown conditions are not presented as free or compatible. Clipboard failure is visible and offers manual copying.
- Eight supported languages cover the new interface copy. No routes, canonical URLs, sitemap eligibility or indexability rules are changed. Query/filter variants remain `noindex, follow`; existing editorial and skill landing pages retain their current policies.

## Measurement

New events: `directory_search`, `directory_results`, `directory_skill_open`, `skill_handoff_target`, `skill_handoff_error`.

Use the existing analytics integration and consent controls. New search events contain query presence/length, not raw search text. Existing page-view URL handling is unchanged. If analytics is not configured/consented, no GA event delivery is claimed. Existing `install_copy` remains intent, not a verified installation.

Compare weekly directory-to-detail click rate, detail-to-copy rate, zero-result rate (excluding degraded reads), handoff errors and independently verified outcomes. Segment selected/catalog/search traffic. Establish a baseline before attributing growth; this release does not guarantee traffic increases.

## Verification

- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- `node scripts/check-discovery-funnel.mjs <origin>` checks live HTTP rendering, first/second/deep/final pages, no repeated adjacent slugs, filters, eight locales, Chinese retrieval, canonical and robots directives.
- The 100 vocabulary regressions are **offline phrase checks**, not 100 live installations or successful task executions.
- Browser QA: desktop/mobile, overflow, navigation, successful copy guidance and injected clipboard failure. Mock engagement writes during copy tests; do not fabricate production installation/outcome records.

## Deferred

Paid marketplace, team billing, automatic task execution, broad new content generation, new safety approvals and database migrations are outside this release. Next work should be driven by measured discovery-to-use conversion and genuine user outcomes, not more navigation items or unverified catalog volume.
