# Public page cache and compute release

## Scope

Default English and seven localized `/skills` directories are rewritten to
on-demand ISR routes under `/cached-public/{locale}/skills`, with a 900-second
window. The eight default public models use the same window. Their public URLs,
SSR cards, canonicals, language navigation and existing directory layout remain.
No registry-wide build is performed: internal cache routes return an empty
`generateStaticParams` and generate only when requested.

Search and filters stay on the existing request-time `/skills` route. The URL
continues to own all filter state; complex and unknown parameters never enter
an unbounded shared HTML cache. Attribution and `_rsc` parameters do not enlarge
internal response keys. HTML and RSC transport remain separate framework variants.

Skill detail/audit/eval pages and finite `?lang=` variants use 900-second ISR.
Contact and sponsor content use finite locale variants with a one-day window.
Proxy blocks direct requests to `/cached-public` and `/render-query` with a
noindex 404; internal paths are absent from navigation and sitemaps. Public
metadata preserves canonical/noindex policies and actual translated content.

Public display lookups use their own 900-second cache tier; install and Agent
interfaces retain the original 300-second lookup tier and no-store responses.
Both tiers carry `public-skill:{slug}`. Publication expires that exact tag
immediately, plus the directory and affected public paths. Source batches carry
only their member tags and cap batches at 100, so an unrelated publication does
not invalidate every detail or featured batch. Directory aggregates keep their
existing roll-up tags.

Public report analysis caches complete source/statistics/options inputs for an
hour. Stored computation timestamps remain the actual calculation time and do
not change merely because a page was requested again. These display snapshots
never authorize an installation, payment, review approval or private access.

Public pages do not read sessions. Authentication, purchases, personal votes,
claims and private APIs retain their existing cookie/authentication boundaries.

## Repeated computation

Directory quality, trust, audit and supply calculations share identical
repository-only profiles. Outcome-adjusted quality remains a separate value.
A process-local memo hashes the complete record plus outcome statistics, expires
after 60 seconds, caps entries at 512 and serialized result bytes at 8 MiB, and
bypasses oversized inputs/results. Values are cloned to avoid caller mutations.
This is an optimization only, not review approval or installation authorization.
It makes no model calls and adds no distributed cache writes.

Filtered directories now project full display cards only after selecting the
combined registry/provider page window. All candidates still participate in
filtering and ranking; only expensive card decoration is limited to the at-most
16 visible cards. Provider ordering, totals and page boundaries are unchanged.
The default view-model cache adds a small bounded set of Data Cache entries;
it is separate from the process-local profile memo described above.

## Freshness and safety

Directory roll-up tags and owner publication path/tag invalidation are preserved;
individual source reads additionally use immediate per-Skill invalidation. Default models carry both `public-skill-directory`
and `public-skill-stats`, so publication and statistics invalidation also refresh
derived display data. Degraded directory models throw before the cache write:
the current request can render the labelled fallback without persisting it;
failed background revalidation retains the last good shared model.
ISR refreshes on traffic, not on a fifteen-minute timer;
data-layer revalidation, regeneration time and failures affect observed freshness.
Optional support-data timeouts can leave a conservative empty state in rendered
HTML until successful regeneration. Do not promise immediate statistics updates.
Non-curated lookup errors (including audit/eval reports) throw rather than persist a false 404. Existing
explicitly labelled curated fallback behavior is unchanged.

Source updates change the memo key. It must never be used for private permissions,
publication transitions or as evidence of a security review. Urgent takedowns
must use authorized publication/data invalidation and invalidate the affected
public path; do not merely wait for a clock TTL or change a review score.

The shared renderer still rejects empty degraded output when `requireHealthy` is
requested. Request-time directories show the explicit degraded state without
persisting it as a healthy ISR page.

## Validation

Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, then
`pnpm start --hostname localhost --port 3124` (use the same localhost hostname
for smoke requests; IP/hostname mismatches can cause Next's local proxy to
treat a rewrite as an external request and hit the internal-route guard).
Run `node scripts/check-public-cache.mjs`; set `BASE_URL` for a deployed target.
Run `node scripts/test-render-cost.mjs --benchmark` for the optional offline
view-model comparison. Its fixture timings exclude real database latency,
React HTML rendering and CDN behavior, and are not production savings estimates.
The smoke test checks directory/detail/audit/eval HIT headers, server-rendered headings/canonicals,
uncached filter variants, cached language variants, redirects and internal route blocking. Regression tests
also cover proxy matching, reserved routes, RSC handling, auth scope, LRU/TTL,
mutation isolation and identical safety/score outputs across record variants.

Browser-check category, sort, pagination, search, language switching and navigation
back to an unfiltered directory. Inspect both HTML and RSC navigation behavior.
Local builds without private environment values can use labelled data fallbacks;
the deployment build and live checks are additional gates, not equivalent to local
validation alone.

After rollout, compare production-only CPU per request, function invocations,
ISR writes, cache HIT rate, errors and SEO responses over comparable 24–48-hour
traffic windows. A cache HIT is not a measured billing reduction. Unchanged query
traffic, bots, cron, builds and other projects still cost money. Do not disable
projects or legitimate search/user-directed crawlers as part of this code change.

## Background cadence

Candidate publication batches run four times per hour (96/day) with 14 fast-track
and eight AI-review slots per run. The 1,000/day ceiling and all review gates
remain. Discovery/radar run every three hours and validation runs hourly;
user submission processing retains its five-minute cadence. Configured cron
invocations fall from 551 to 447/day. Discovery status reports the same cadence.
Newly discovered candidates can wait up to three hours plus queue processing.

Rollback by reverting the release commit and redeploying the prior revision;
there is no database migration, URL migration or new credential to undo.
