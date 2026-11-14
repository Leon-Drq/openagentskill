# Search runtime cost controls

Public display pages and discovery data retain a four-hour refresh window;
static Skill preview images retain their one-week cache. Install/action lookups
keep their existing short freshness window and publication invalidation tags.

## Retrieval and rendering

Broad OR search reuses a tagged, four-hour top-200 shortlist for each sanitized
search term, rather than persisting a separate shortlist for every sentence.
The union is deduplicated and ordered by the original SQL quality/slug ordering
before applying the requested limit and registry scope predicate. Each term's
top 200 contains all candidates needed for a union limit of at most 200.
Exact-name, typo and repository identity lookup behavior remains independent.
Missing matches and failed queries do not create persistent R2 entries.

Directory source profiles are evaluated lazily: a selected quality/trust/safety
filter still evaluates the actual profile, while ordinary filtering and sorting
can select visible records before computing their full audit/supply data. Hidden
collection sections are not computed for search result pages.

## Interactive search rate

`SEARCH_COST_GUARD=1` enables the production `DIRECTORY_SEARCH_LIMITER` binding.
It allows 30 expensive directory requests per source per minute, per Cloudflare
location. Expensive means nonempty free text or at least two active filter
facets. Locale, query and user-agent changes share the same allowance. The key
is a hash of Cloudflare's connecting address; no addresses or search text are
stored by application code. Cloudflare's limiter is approximate and local to a
location, so this is not a strict global billing cap.

Excess requests receive HTTP 429 with `Retry-After: 60` and `private, no-store`
before invoking Next or D1. Canonical directories, single-category browsing,
Skill details, editorial pages, APIs, accounts, checkout and webhooks are outside
this limiter. Binding failures fail open. Setting `SEARCH_COST_GUARD=0` disables
the guard on the next deployment; it does not alter data.

Robots rules ask automated search crawlers to use canonical pages and sitemaps,
and avoid the directory query graph. User-directed ChatGPT/Claude browsing keeps
its existing robots rules. Robots rules are advisory and are not access control.

## Publication and verification

Automatic Gallery/media collection publishes on Tuesdays and Fridays, with
manual workflow dispatch still available. Source ingestion and user submissions
retain their existing schedules. This reduces full-build cache turnover without
sharing HTML across incompatible build IDs.

Run `pnpm test`, `pnpm typecheck`, `pnpm lint` and production/Cloudflare builds.
The search cost tests cover OR union equivalence, null ordering, ties, lazy real
profile evaluation, rate-limit scope, response semantics and failure recovery.
After deployment compare identical uncached search requests, visible result
identities, canonical/robots metadata and privacy behavior. Use complete-day
CPU, R2 operations and D1 metrics to establish actual cost reduction; individual
request benchmarks do not establish a monthly bill or a 90% whole-site saving.
