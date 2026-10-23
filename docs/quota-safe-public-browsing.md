# Quota-safe public browsing (2026-10-23)

## What this change does

- A confirmed `exceed_egress_quota` HTTP 402 opens a **project-origin-wide**
  10-minute Data API cooldown in each warm server process. Catalog, search,
  sitemap and admin scopes share it. One probe may test recovery after cooldown;
  concurrent/late responses cannot clear a newer quota restriction. Ordinary
  timeouts and 429s remain workload-scoped. There is no retry loop.
- Star/date/use-case rankings no longer query unrelated usage statistics.
  Successful ranking data is cached for 15 minutes. Failures throw **inside**
  the cache so they cannot overwrite a successful result with an empty list.
- Cold ranking failures can use a versioned, server-only public metadata
  snapshot. Outcome, safety and success-rate rankings do **not** infer evidence
  from that file. New-this-week still uses the real original creation date and
  the current seven-day window, not the backup date.
- The unfiltered Skills first page can show that saved selection with its cache
  time range. It shows neither a live total nor pagination through an invented
  full registry. Existing detailed filters/later pages are not reinterpreted as
  a global snapshot search. A snapshot notice does not start automatic refreshes.
- Existing URL, canonical, locale and publication/review rules are unchanged.

## Current recovery artifact — deliberately partial

`data/public-directory-saved.json` contains 1,154 unique public Skill records
from successful local public Data Cache files saved on October 19, 2026
(05:40–13:52 UTC). These timestamps are **cache write times**, not a claim that
every upstream metric was observed at precisely that instant. A fixed whitelist
excludes contacts, raw instructions, arbitrary nested metadata and credentials.
It is not the complete 36k registry, a current approval audit, or an install
authorization. Rows retain their recorded publication states without changing
reviews. Curated/fabricated fallback IDs are not accepted. Backups expire after
30 days; the site must not continue presenting ancient data as a usable backup.

The artifact is imported only by server code. Browsers receive at most the
visible cards, never a megabyte-scale directory download. It is not a replacement
for a real independent, complete database backup.

## Operating modes

Normal mode (default): use successful shared caches and normal public API reads;
on failure use labelled saved results where available. Healthy cached Skills
pages still throw during failed revalidation to retain their previous contents.

`SUPABASE_DATA_PAUSED=1` is an **optional emergency server environment switch**.
It stops Data API reads **and writes** through shared server clients without
changing Supabase plans, Spend Cap, RLS or credentials. Auth requests are not
blocked by this switch. Browser-side/direct third-party clients are not controlled
by a server variable. Do not describe it as a global network firewall.

With the switch explicitly enabled, a cold cached Skills first page can serve
the labelled saved selection. This intentionally prioritizes limited public
browsing over live functionality. Login may still work, but database-backed
actions, search beyond saved coverage and uncached details may remain unavailable.
**Do not enable on production as an implicit deployment default.** The owner
must understand the limited coverage and unavailable write functions.

An environment change needs a new Vercel deployment. It does not release the
provider's quota restriction. After the provider restores the normal Data API,
remove the switch and redeploy. Confirm live reads and writes before announcing
full service recovery. Do not disable Spend Cap or use privileged management SQL
or alternate connection paths to work around an enforced restriction.

## Refreshing the backup after normal service recovers

Run `pnpm snapshot:refresh` with the project's **public** URL and anon/publishable
key loaded in the process environment. The exporter refuses service-role keys,
uses the normal RLS-protected public view and makes only four sequential requests
of at most 480 rows each. It replaces the snapshot only after all four succeed;
HTTP 402/429/5xx, empty or malformed data leave the previous file untouched.
It does not retry or call a model API. Review the diff, test and publish normally.

This first phase does not add an automatic schedule or a new paid storage service.
Use the existing successful ingestion/release cadence to refresh the snapshot;
do not run exports while the provider is restricted. A future full public read
replica should use incremental updates and explicit removal/tombstone handling,
not repeated full-table reads on every visitor request.

For offline recovery, `scripts/export-public-directory-cache.mjs --since=<ISO>`
extracts only known public successful `.next/cache/fetch-cache` records. It cannot
recover missing entries and must not be represented as a full database restore.

## Verification

`pnpm test:supabase-circuit`, ranking-landings tests, render-cost/directory tests,
typecheck and production build cover the quota/fallback boundaries. Validate EN
and ZH rankings and first-page directory behavior with the pause switch locally.
Verify timestamps/limited-coverage copy, missing evidence, no false totals and no
new current dates. Keep the existing successful production ISR cache in mind:
deploying can cold-start page caches, so a partial backup is not an assurance that
every public detail page can survive a deployment during a provider outage.
