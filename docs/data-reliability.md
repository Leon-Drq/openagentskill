# Public data reliability

Public and administrative Supabase clients disable the SDK's automatic retries.
Each logical read makes one upstream request. Bounded reads keep their deadline
through JSON body transfer, and separate circuit scopes protect catalog, exact
lookup, search, audit support, sitemap and administrative workloads.

The audit ranking reads only audit records for its existing shortlist (at most
1,200 unique slugs), in batches of 80, with at most two concurrent requests and
one three-second budget. Failed or incomplete batches never enter the shared
cache. The page can still compute scores from its available public skill data.

The sitemap preserves the existing search eligibility policy. Legacy approved
records and source-pinned editorial records are queried separately and their
union is deduplicated. A complete compressed snapshot is the persistent cache
unit. Capture failures, changed counts, duplicate URLs and incomplete pages are
rejected. The index and skill shards use the same snapshot; source content dates
remain their lastmod values. Static sitemap sections are independent of the DB.

A complete public snapshot in `lib/seo/sitemap-backup.json` provides recovery
when the persistent cache is unavailable. It is served outside the live cache,
with its original generation date in `X-Sitemap-Snapshot`. It does not claim a
fresh database read. A missing or incompatible backup returns a retryable 503
rather than publishing a partial list. Live snapshots refresh every hour.

Refresh the deployment backup after a successful source capture:

```sh
node --experimental-strip-types scripts/capture-sitemap-backup.mjs
```

The read-only command verifies every advertised skill shard, generation header,
canonical URL, shard length and uniqueness before atomically replacing the file.
Commit the public backup and deploy through the normal checked release process.
If the source is unavailable or changes while capturing, the file is preserved.

Validation:

```sh
pnpm test:supabase-circuit
pnpm test:seo
pnpm typecheck
pnpm build
node scripts/check-seo.mjs https://www.openagentskill.com
```
