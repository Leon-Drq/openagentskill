# Read-only public site

The public site runs from a frozen, sanitized export of published D1 records.
Normal visits, searches, filters and media views use Workers Static Assets.
They do not initialize Next.js, query D1, use R2, run AI, write counters, or
refresh ISR. Search runs in the browser after downloading the versioned index.
It supports the existing deterministic Chinese task expansions.

English and Chinese keep their established public detail URLs. Original,
genuinely translated editorial articles retain their eight language versions.
Other legacy language routes temporarily redirect to available English pages.
Untranslated editorial text stays labeled as original text and does not
advertise translation alternates; existing authored translations retain theirs.
Missing archive pages return temporary 503 responses, rather than fabricated
content or permanent 404s. New checkout, login, submissions and write APIs stay
closed. A fixed snapshot does not claim real-time stars, rankings or outcomes.

The normal application and the reader share the header frame, brand mark and
design palette. The reader also uses the existing taxonomy, preview licensing,
example attribution, pricing records, editorial guides and PPT source content.
Existing publication states stay distinct; owner/static publication is never
upgraded to AI approval or runtime verification during export.

## Explicit refresh and build

`pnpm readonly:refresh --remote` reads public allowlisted fields with the
authorized Cloudflare CLI login or `CLOUDFLARE_API_TOKEN`. It uses the saved
active configuration only to identify the first-party account/database. It
never exports account identities, contact addresses, orders or entitlements.
It does not execute repositories or use the owner publishing endpoint.

The export is versioned in `data/readonly/`: integrity-checked, stable gzip
shards and a manifest with the actual capture time. Details link to their
source for full instructions. Articles are limited to the latest 500 database
posts plus maintained static articles; there is no claim of archive completeness.
No scheduled refresh or ingestion is enabled. A manual refresh must be
reviewed and committed before publication.
Owner publication still writes the production registry; it does not update
this frozen reader until that explicit refresh and build.

`pnpm readonly:build` creates `.readonly` and a private build report. Each
build starts in a fresh staging tree and retains its previous tree for local
recovery, so removed publications cannot survive as stale HTML files.
It enforces the 100,000-file/25 MiB static-asset limits. Sample builds
(`--sample`) are for local checks and are refused by the deploy command.

Run `pnpm test:readonly`, `node scripts/check-readonly-runtime.mjs`, the full
regression suite, typecheck and production build before publishing. The native
check exercises the actual Workers asset router, API rejection, search shards,
and cache rules. Verify search, filters, detail links, copy controls, example
attribution and responsive layout in a browser too.

## Deployment and costs

`wrangler.production.jsonc` matches `wrangler.readonly.jsonc`. Neither binds
application D1, R2, AI, email or another service. Cron triggers are empty. The
retained queue class clears existing alarms without revalidating. Production
secrets and all databases/buckets are retained independently of these bindings.

`pnpm cf:build` builds the reader. `pnpm cf:deploy:production` uses Wrangler
directly after checking the source commit, snapshot integrity and non-sample
build report. It deliberately does not call OpenNext's cache-populating deploy
command. Automatic builds therefore cannot resume the full application.
`pnpm cf:build --full-app` builds the archived application and the reader for
regression/recovery checks; it does not deploy either one.

HTML uses five-minute browser caching. Versioned search/CSS/JS and example
media use one week; gallery HTML does not inherit the media TTL. Snapshot
capture dates are visible, and actual source modification dates are retained
in sitemaps. The public status file uses no-store.

The intended steady-state budget is approximately $5–10/month for this site,
including the account's $5 Workers minimum. This is an estimate, not a hard
cap: unmatched/legacy requests still invoke a small Worker. Other account
projects, accrued usage and temporary old-cache storage are separate. Compare
post-release CPU, D1 reads, R2 operations and total charges over complete days.
Do not claim a measured whole-bill saving from functional checks alone.

## Recovery

To pause all public reading again, explicitly deploy `wrangler.paused.jsonc`
and change the automatic configuration accordingly. To restore the full app,
follow `docs/temporary-pause.md`, including restoring cache lifecycle settings
before the active app's bindings and twenty cron rules. Restoring the active
app also restores its cost characteristics; this reader does not repair every
cost issue in that archived architecture.
