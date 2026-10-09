# Public page cache and compute release

## Scope

The English and localized `/skills` directories render at request time, after
`connection()` prevents database work during the build. Their filtered and
unfiltered URLs now share the same public route segment. Data-layer caches and
existing `public-skill-directory` tags still limit repeated database reads.
Default directories also share a 300-second public view-model cache (exactly
eight locale keys), covering reads, ranking, profiles and card/JSON-LD preparation.
The wrapper still waits for a request, so builds do not query the directory.
Search and other content queries bypass this model cache. Attribution and RSC
parameters cannot grow its key space; each request constructs its own query links.
Directory HTML remains request-time, so this reduces computation but does not
eliminate directory function invocations or claim a directory CDN HIT.

Skill detail, audit and eval pages and other fixed localized pages use 300-second
ISR. The three skill routes generate on demand instead of prebuilding the registry.

The directory client receives URL state as server props rather than reading
`useSearchParams`, so its heading, cards, links and relocated search toolbar are
server-rendered. Filter links keep real hrefs, use `scroll: false` transitions
and show loading only in the right-hand results region while retaining cards.
Back/forward navigation and copied filter URLs use the same server renderer.

The existing renderers and metadata live in adjacent `content.tsx` files. Proxy
still rewrites query variants of skill details, audit/eval reports and other localized pages to
`/render-query/...` wrappers. Direct requests to those internal routes return a
noindex 404. `_rsc` transport state does not change route or indexing policy.
Reserved `/skills/new` remains untouched. Legacy `/skills/external` URLs permanently redirect to the unified directory and detail routes.

This is not a public CDN header override on an authenticated response. Public
pages do not read sessions. `/profile`, claim and points session refresh remain
intact. Query pages deliberately remain private/no-store; high-cardinality search
is not put into an unbounded HTML cache.

Proxy now matches only routes needing locale, alias, missing-page or session
logic. Other pages with `?lang=` still match to preserve Content-Language behavior.

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

Existing `public-skill-directory` data tags and owner publication path/tag
invalidation are preserved. Default models carry both `public-skill-directory`
and `public-skill-stats`, so publication and statistics invalidation also refresh
derived display data. Degraded directory models throw before the cache write:
the current request can render the labelled fallback without persisting it;
failed background revalidation retains the last good shared model.
ISR refreshes on traffic, not on a five-minute timer;
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
The smoke test checks detail/audit/eval HIT headers, server-rendered headings/canonicals,
uncached query variants, redirects and internal route blocking. Regression tests
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
projects, paid features or legitimate crawlers as part of this code change.

Rollback by reverting the release commit and redeploying the prior revision;
there is no database migration, URL migration or new credential to undo.
