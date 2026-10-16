# OG image caching and operating costs

Implements [issue #258](https://github.com/Leon-Drq/openagentskill/issues/258).
The existing image URLs and artwork are preserved. This does not change the
Skills directory UI, crawl permissions, review states, payments or downloads.

## Request path

1. Vercel CDN serves a cached public PNG without invoking the renderer.
2. On a CDN miss, a bounded warm cache returns the PNG before any database read.
3. A cold instance reads the PNG and upload timestamp from Vercel Blob.
4. Only a miss/expired object runs the original public-data loader and Satori.
   A successful PNG is stored at the same key, then returned with cache headers.

Freshness is 7,200 seconds from generation/upload, not from the latest read.
HTTP responses use `public, max-age=0, s-maxage=<remaining>,
stale-while-revalidate=86400`. The CDN may serve stale data during background
refresh for up to a day. Changes to names, rankings and profiles are therefore
eventually reflected, not instantly purged from every social network.

`X-OG-Cache` reports the origin result (`render`, `memory`, `storage`). A CDN HIT
replays that header; use `x-vercel-cache` and `Age` to identify CDN hits. Sparse
`[og-cache]` logs record actual renders, duration (including data loading), and
storage/render failures. They contain hashed keys, not credentials or SDK errors.

## Coverage and boundaries

- Skill and creator OG/Twitter URLs share the same key and renderer.
- Rankings, shortlists and each shortlist slide use the same cache service.
- `/api/og?kind=skill&slug=...` (also `ranking`, `creator&username=...`,
  `shortlist&lane=...&slide=...`) is a controlled gateway to these same images.
- `/api/og/skill` preserves free-form previews. All rendered fields are included
  in the hashed cache key. These unbounded user variants use memory/CDN only;
  they cannot create permanent Blob objects.
- `/api/og/home`, `/opengraph-image`, `/twitter-image` are constant artwork and
  are now built as static PNGs. They need neither a runtime function nor Blob.
  Their old Edge wrappers become static Node build routes, so no Node-only SDK
  is bundled into an Edge function. `next build` must show `○` for all three.

## Storage configuration

Connect a **public** Vercel Blob store to the `openagentskill` project. The SDK
uses `BLOB_STORE_ID` with Vercel's rotating request-context OIDC credentials.
An existing `BLOB_READ_WRITE_TOKEN` also works, but is not needed on Vercel.
Keep credentials server-only; do not prefix them with `NEXT_PUBLIC_`.

- Missing credentials: no storage operations; memory/CDN and rendering work.
- `OG_STORAGE_ENABLED=0`: disable storage without disabling images.
- Preview deployments never read/write production Blob objects.
- Stable, versioned SHA-256 keys live under `og/v1/<kind>/`. TTL is **not** a
  deletion policy: expired objects are overwritten on demand, not accumulated
  in a new timestamp bucket. Old/deleted entity objects can be removed later
  by an explicit maintenance task. Bump `OG_RENDER_VERSION` when artwork changes.
- `get()` reads content and metadata in one operation, avoiding HEAD+GET billing.
  `useCache:false` avoids reading a stale Blob CDN copy after an overwrite.
  An expired/oversized object stream is cancelled before download.
- Same-instance concurrent reads/renders/writes are coalesced. Separate cold
  instances can still race and render twice; this is not a distributed lock.
  CDN request collapsing reduces that case. No new Redis dependency is added.

The cache holds at most 64 entries / 16 MiB per instance, 16 in-flight keys,
and 2 MiB per image. New keys above the concurrency limit get retryable 503s;
requests for an existing in-flight key still share its render. PNG signatures,
content type and size are checked. Errors, missing entities and unavailable
rankings never become cached 200 images.

Storage operations have a 1.5-second abort deadline and a 60-second circuit
breaker. Storage failures fall back to rendering. Writes are awaited within
that bound so serverless completion does not silently discard the upload.
Render failures return an uncached 503. Only successful PNGs are persisted.

## Verification and cost assessment

Run `pnpm test:og-social-cards`, `pnpm test`, `pnpm typecheck`, `pnpm lint`,
and `pnpm build`. Cache regressions cover concurrent single generation/write,
cold-instance storage reads, expiry, no sliding TTL, outage recovery, aborted
operations, invalid content, capacity limits, credential absence and preview
isolation. Production smoke tests should repeat a valid URL, check PNG signature
and dimensions, and observe `HIT` / increasing `Age`. Use the controlled gateway
for the same entity to verify a storage/memory hit with no extra render log.

Local production-build validation on 2026-10-16: all three homepage images
prerendered (741 static pages total); a skill OG render was reused by its Twitter
URL and gateway; returned 1200×630 PNGs; invalid paths returned uncached 404s.
Full regression suite and typecheck passed; lint had 0 errors (existing warnings).
Windows checkout line endings in one taxonomy SQL fixture were normalized only
for the local test run; no migration changes are part of this work.

The issue's assertion that OG is the largest CPU source is not established by
the available route evidence. The 2026-10-14 cost audit found substantial dynamic
directory and bot-request costs too. Homepage and legacy preview CDN hits already
worked before this change. The improvement here targets cold/expired dynamic
share cards and makes homepage images static; it is not a whole-bill guarantee.

Compare equal 24–48-hour production windows: OG request count, CDN hit ratio,
OG render count/CPU, function invocations, and **new Blob read/write/transfer
costs**. Normalize by request count and URL mix. A higher total traffic volume
can outweigh per-request savings. CDN request charges still apply to cache hits.
Do not infer dollar savings from a local latency sample or cumulative invoices.

Rollback: revert this change and redeploy, or disable Blob with the environment
switch and redeploy. Existing objects can stay without affecting rendering.

References: [Vercel cache headers](https://vercel.com/docs/caching/cache-control-headers),
[Blob SDK and consistent reads](https://vercel.com/docs/vercel-blob/using-blob-sdk),
[CDN usage](https://vercel.com/docs/manage-cdn-usage).
