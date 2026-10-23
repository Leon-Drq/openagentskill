# Paused data mode and cost control

`SUPABASE_DATA_PAUSED=1` is a deliberate outage mode, not a database recovery or
an authorization grant. Keep the provider spending limit in place. Changing this
server environment variable requires a new deployment to apply to routing and
newly rendered pages.

## Request behavior

- Default Skills directories and finite browse variants use an isolated saved
  model cache (`paused-public-directory-v1`, one hour). They skip live directory,
  search augmentation, agent statistics and download-total caches. Only visible
  cards are sent to the browser. The original dates and partial coverage remain
  visible; the saved count is not the current registry total.
- Free-text/compound directory queries, queried resolve/compare/task pages,
  database-backed details, audit/eval reports and alternatives are intercepted
  before rendering. Eight prebuilt localized pages provide HTTP 503 and
  `Retry-After: 600`. Unknown slugs/queries do not create new ISR pages. Actual
  static product details remain accessible.
- Selected registry, agent data, installation/download, telemetry and cron APIs
  return small JSON 503 responses before executing their handlers. These are
  failures, never fabricated successful writes or empty successful searches.
- MCP initialization, tool listing and static Gallery tools remain available;
  data-dependent calls return a JSON-RPC error with HTTP 503 and the request ID.
- Home statistics and rankings skip live refreshes. Unknown evidence remains
  explicitly inexact/unavailable; no current safety or outcome evidence is
  inferred from saved metadata. Download totals are null while paused; normal
  mode refreshes them every 15 minutes instead of every minute.
- Authentication, payment/webhook transactions, owner publication and existing
  installation/review policies retain their original authorization rules. The
  saved metadata is never an install, download, payment or approval credential.

The lower-level Data API circuit breaker remains the final guard for callers
outside the public routing gate. This change covers the observed expensive
entry points; it is not a promise of zero database-related errors on every route.

## Cache boundaries

Temporary failures use `private, no-store`. They must not enter a healthy live
cache or persist after recovery. The maintenance HTML itself is prebuilt and
reused on the origin; do not interpret its Next.js HIT as a CDN-cached 503.
Public directory HTML still uses the existing 15-minute ISR routes. Successful
saved models do not trigger failing background data revalidations.

The snapshot retains its existing 30-day validity limit. Restore normal data
service or refresh it through `pnpm snapshot:refresh` before expiry; run the
exporter only after the normal public API recovers. Never bypass quota through
privileged SQL or remove the spending limit to obtain another snapshot.

## Verification and recovery

Regression coverage exercises real proxy responses and matching, no cookie/auth
side effects, localized static product exceptions, protocol discovery, zero
live/cache reads while paused, bounded model output, separate keyspaces and
switching back to normal data access. Run `pnpm test`, `pnpm lint`,
`pnpm typecheck` and a production build before deployment.

Check the deployed custom domain, not only the latest preview deployment:

1. `/skills`, `/zh/skills`, `/skills?sort=new`: labelled saved content, 200 and
   eventually HIT. No shared download/statistics refresh failures for these
   requests.
2. `/skills?q=video`, `/skills/federicodeponte-opendraft`, audit/eval and queried
   resolve routes: 503, Retry-After, localized maintenance page, no Set-Cookie.
3. `/api/agent/resolve` and a data-dependent MCP call: explicit 503; MCP
   initialization and Gallery discovery still work.
4. Verify normal account/payment protections with the existing tests. Do not
   make a real purchase or fabricate a production download to test maintenance.

After the provider is healthy, remove the pause flag and redeploy. Fresh route
output uses live caches again; saved models have their own keys and cannot
replace live data. Validate a real read and the deployed version before calling
the site fully recovered.

Measure at least a comparable complete 24-hour window after rollout: cost per
10,000 successful useful requests, CPU, function calls, ISR writes and cache hit
rate. Track intended maintenance 503s separately from unexpected 500s. A decline
in total traffic, successful HIT probes or lower log volume alone does not
prove a particular dollar saving. CDN requests still incur usage.
