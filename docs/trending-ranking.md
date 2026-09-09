# Trending activity leaderboard

`/trending` measures interest **on OpenAgentSkill**, not global GitHub growth or installation success. `/rankings/most-starred-agent-skills` remains the repository popularity destination; `/hot` remains a separate freshness shortlist. Existing URLs are preserved.

## Data and scoring

The existing daily rankings job calls `buildTrendingSnapshot`. Its service-role-only, read-only RPC aggregates all publicly listed repositories with activity in the previous **seven completed UTC days**. It does not start from the top quality records and does not rely on the REST API's default row limit. Ordered 100-record pages are fetched until 40 non-MCP-only, distinct Skill slugs are selected. Repository subskills remain distinct; stars always belong to their source repository.

Daily caps and weights: views 30 × 1, command copies 12 × 8, comparisons 12 × 5, saves 10 × 4, repository clicks 15 × 4. Each daily sum is multiplied by `0.65 + day_position / 7 * 0.7`, where day position runs from 1 to 7. Score is `ln(1 + weighted_activity) * 16 + active_days * 4`. Ties use the slug in C collation. No lifetime fallback, GitHub star contribution, model call, or invented installation outcome is used. This dampens repeated signals; it is not a guarantee against coordinated abuse.

Raw interaction counts remain visible and are not percentages or unique people. Claim events are not ranking activity. A ranking is not an approval or safety certificate. No submission/review/ownership states are modified.

## Snapshot and failure behavior

The same `ranking_snapshots` JSON record contains the order, displayed statistics, source dates and methodology version `trending-v5-recent-activity-2026-09`. No schema column changes are required. Public page requests only read this compact cached snapshot. Aggregation failures abort publication and leave the last complete snapshot intact. A snapshot older than 36 hours is labeled stale. Legacy snapshots or failed reads show an unavailable state, not a fabricated list; valid empty snapshots and empty category filters have distinct messages.

## Release and verification

1. Apply `trending_recent_activity` (additive RPC; only `service_role` can execute it).
2. Deploy the application; run the existing authorized `/api/cron/rankings-daily` job to create the first compatible snapshot.
3. Verify `/trending`, `?lang=zh`, all other supported languages, and category filtering on desktop and mobile. A category filter narrows the current top-40 snapshot, not the whole registry.
4. Run `node scripts/test-trending.mjs`, the full regression suite, typecheck and production build.

Canonical remains `https://www.openagentskill.com/trending`; the English landing page is indexable. Filter/language-preference URLs are noindex/follow, not new localized SEO landing pages. JSON-LD uses CollectionPage, ItemList/ListItem and BreadcrumbList with only visible results. Skill links, existing related destinations and original source text are preserved. Translated UI is provided for eight locales; source repository titles/descriptions are not machine-translated.
