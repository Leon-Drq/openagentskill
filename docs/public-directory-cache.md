# Public directory response cache

Anonymous HTML reads of `/skills?...` and supported locale equivalents can reuse
a complete, healthy rendered directory response for up to four hours. This
avoids repeating Next rendering and its underlying cache/data access for a hit.
The response is stored in the Workers Cache API, not in R2. Cache API storage is
local to a Cloudflare location; cold locations and new query variants still need
a render. This is not a global cache-hit or monthly-cost guarantee.

`PUBLIC_DIRECTORY_EDGE_CACHE=1` enables the wrapper in `cloudflare/worker.mjs`.
Setting it to `0` and deploying disables it without data changes. Preview,
read-only migration and paused-data environments bypass it.

## Representation and freshness

- Only bounded, allowlisted directory query strings are eligible. Query keys
  are sorted; values, locale, host, Accept, Accept-Language and User-Agent remain
  distinct. The origin sees only those keyed request headers.
- Cookies, authorization, conditional/range requests, Flight/prefetch/action
  headers, locale redirects and unknown query parameters bypass the wrapper.
  Accounts, payment endpoints and all other routes keep their existing behavior.
- Admission requires a complete 200 HTML document and the successful directory
  renderer's inert `data-oas-directory-cache="ready"` template. Saved fallback,
  paused/degraded data, errors, redirects, Set-Cookie, unexpected Vary and bodies
  larger than 1.5 MB are not stored. Concurrent misses share only admitted public
  responses; personalized/error responses are rendered independently.
- Every hit reads the authoritative, indexed Next tag invalidation records in
  D1. Tag/path changes select a new key; a failed check bypasses the cache. A
  second revision check prevents storing an entry invalidated during rendering.
  Existing Next data freshness semantics still apply: a soft revalidation can
  serve stale data during revalidation; use the existing hard invalidation for
  edits requiring immediate expiry.
- Each build has its own cache namespace, generated from Next's BUILD_ID after
  `pnpm cf:build`. Old HTML cannot reference a new build's chunks. Each stored
  entry also carries an explicit age check, with a maximum of 14,400 seconds.
- The client receives `private, no-store` so downstream copies cannot bypass
  the invalidation check. Only the internal Cache API copy has a four-hour TTL.
  `X-OAS-Directory-Cache` reports HIT, MISS or COALESCED. Canonical and robots
  metadata come unchanged from the original page.

## Verification and rollout

`pnpm test:cost-reduction` checks the wrapper and renderer opt-in. The native
check (`node scripts/check-public-directory-cache-runtime.mjs`) runs the same
invalidation/isolation/expiry suite against workerd's Cache API and local D1.
Cloudflare migration CI also builds Next/OpenNext, packages both Worker configs
and exercises the production application in the Workers runtime.

Migration `0012_lookup_cost.sql` adds non-unique repository, GitHub repository
and source-hash lookup indexes. Existing partial uniqueness/publication rules
are unchanged. On imported databases with incomplete migration history, apply
only this migration after verifying the existing schema; do not replay old
migrations. Capture a D1 Time Travel bookmark first and record the migration
after successful application. Index rollback can drop these four indexes only;
restoring the whole database is unnecessary and could discard newer writes.

After deployment, check repeated anonymous requests for HIT and identical body,
locale/canonical/robots correctness, and cookie/Flight/private-route bypass.
Compare CPU for the same request set and D1 rows read for the same lookup set.
Use subsequent full-day CPU, R2 operation and D1 metrics to assess overall cost;
do not extrapolate a warm-hit microbenchmark into a whole-site savings claim.
