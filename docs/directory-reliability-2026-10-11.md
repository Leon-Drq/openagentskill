# Directory availability incident — 2026-10-11

The yellow “Latest information is temporarily unavailable” notice is the
directory's incomplete-data state. It is not a membership or payment error.
Keep this state visible when a critical read really fails.

## Observed evidence

- Production `/skills?q=chatrail` returned HTTP 200 with the recovery banner,
  while the default directory, page 2, category and paid filters returned
  healthy results in the same sample. A later browser visit recovered.
- Production search logs included transport aborts, open circuits and rejected
  recovery probes during concurrent searches across languages.
- Direct public database probes succeeded: exact name returned one ChatRail
  record in 852 ms and full-text search returned one in 431 ms. A cold slug
  request took 1,940 ms. These are individual observations, not latency SLAs.
- The database was active/healthy. Cumulative query statistics showed some
  searches reaching the 3-second SQL statement timeout. No HTTP 402/quota
  events appeared in the inspected two-hour production log window.

## Contributing application defects

Exact-name/slug requests had only 2.5 seconds of transport budget, below the
3-second SQL budget before connection and response costs. Both exact and broad
search also had an outer timeout identical to the transport timeout. The page
abandoned the complete search after four seconds. Broad search shared its
circuit breaker with unrelated public reads.

Shared cache misses and background revalidation could independently invoke
the same database loaders. Existing outer search coalescing did not cover
these shared-cache callbacks or catalog counts across simultaneous pages.
Catalog/candidate failures also lacked a page-level diagnostic log.

## Fix

- Critical directory and search transport: 7 seconds; combined search guard:
  8 seconds; page and search API guard: 9 seconds. SQL statement limits remain
  unchanged. Optional page statistics retain their 1.8-second budget.
- Broad search has its own circuit. Exact lookup, catalog and unrelated public
  workloads retain separate protection. No retry storm or timeout replay.
- Coalesce identical in-flight exact, broad, candidate, catalog-count and
  catalog-page loaders inside the shared cache. Maps are bounded to 128 keys
  per loader, scoped to a warm server instance. Completed values are not kept
  in this extra layer, so shared-cache/tag invalidation still takes effect.
- Failed reads are rejected, never cached as a healthy empty list. Existing
  partial results, recovery UI and success-only default-model caching remain.
- Catalog and candidate failures now identify their stage in server logs.

## Regression coverage

- A 3.8-second healthy search survives both transport and aggregation guards.
- A 4.2-second healthy search survives the page guard.
- Eight simultaneous locale catalog misses produce one count and row read.
- Different sorts share a simultaneous count; different search limits share
  exact-name and slug reads.
- Failed concurrent reads are not cached; a following healthy read recovers.
- Shared-cache invalidation is not hidden by a second local value cache.
- Broad-search circuit failures do not disable exact search or browsing.
- Existing partial-failure, manual retry, cooldown, no-false-404, filtering,
  source identity and pagination regressions remain enabled.

## Production verification / future diagnosis

Check default and localized `/skills`, page 2, category, paid, featured and
search variants. HTTP 200 alone is insufficient: inspect the rendered
`data-directory-recovery` marker and actual results. Check a second request
and client-side navigation, including a mobile viewport.

If the banner recurs, use logs for the deployed commit and distinguish SQL
`57014`, transport aborts, HTTP 402/429, and circuit protection. Inspect actual
database latency and active queries before changing budgets again. Do not
remove the banner, cache a degraded result as healthy, disable protection, or
block search-engine traffic merely to make the symptom disappear.

These changes address demonstrated premature deadlines and duplicate work;
they do not promise availability during an upstream outage. In-flight
coalescing is per instance, not a distributed lock across all deployments.

## Production follow-up: repeated source batches

The first deployment did not fully resolve the incident: its production smoke
check still observed degraded search responses. Database edge logs for
09:59–10:05 UTC contained 17,649 requests. One identical 19-Skill source batch
alone was fetched 3,336 times (about 19% of all requests in that sample), with
median response time of 1,971.5 ms and p95 of 6,406.25 ms. Search p95 was also
about six seconds. PostgREST recorded 249 statement timeouts and 88 timeout
manager errors. A healthy point-in-time database probe was insufficient to
rule out intermittent load.

`getSkillsBySlugs` was uncached. It is used by featured/pricing filters and
curated guide pages, so the same source set was repeatedly read across queries
and locales. Successful, canonicalized batches now use a packed 5-minute
shared cache and in-flight coalescing. Caller order is restored after lookup;
publication-tag invalidation remains effective. Failed batches still return
the existing caller fallback outside the cache. Batch sizes and the four-read
concurrency limit are retained. Single-Skill metadata/body cache misses are
also coalesced.

Additional regressions exercise reordered source sets, eight concurrent
requests, shared hits, invalidation, failure recovery, missing/MCP-only rows,
preserved source evidence, large bounded batches and detail lookup misses.
