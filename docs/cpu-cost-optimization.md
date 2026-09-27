# Public-page CPU optimization

Implemented on 2026-09-27 from production commit `c7b5e61a362a435954f342bafd8402ab045f7afd` in the isolated `codex/cpu-cost-optimization` branch. The original working directory has unrelated changes and was left untouched.

## Changes

- Canonical `/skills` and localized core pages no longer read request `searchParams`. They use 300-second full-page ISR. Skill detail pages generate on demand and then reuse their rendered output.
- Query parameters that affect content rewrite to dedicated dynamic render routes. The browser keeps the original public URL. Tracking and RSC transport parameters alone do not force dynamic rendering.
- Non-English skill detail URLs use separate locale-specific ISR entries. Canonical metadata, alias redirects and query-variant noindex behavior are retained. Internal render routes are noindex and are not linked publicly.
- Directory query state is passed from the server instead of reading `useSearchParams` around the entire directory. Cached HTML includes real skill cards instead of a loading shell.
- Canonical directories reject degraded data. A failed background regeneration retains the last successful page; a cold production build cannot silently publish a degraded directory. Dynamic search retains the existing fallback experience.
- The middleware matcher excludes ordinary homepages, privacy pages and static assets. Authentication refresh and necessary redirects/404 checks remain. Large catalog modules load only for the paths that need them.
- Pure quality/trust/safety/supply calculations use a bounded 512-entry, 60-second process-local memo. The full record and agent statistics determine the key, so changed evidence invalidates immediately. Oversized inputs bypass the memo; failures are not cached. Platform hints are computed once per record.

## Validation

- `pnpm test`: full regression suite passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed; canonical directories are prerendered and detail routes support on-demand ISR.
- ESLint on changed application/configuration files: passed.
- `node scripts/check-cpu-cost-build.mjs` against a local production server on port 3217: full HTML cache HIT, actual directory cards, dynamic filtered results, canonical metadata, locale/alias redirects, tracking and RSC isolation passed.
- Browser navigation: directory renders 16 of 83 results; search for `postgres` returns 70 results with the public query URL; category navigation works.

The local repeat-request checks took approximately 14–22 ms. These are local elapsed times, not Vercel CPU measurements or a promised billing reduction. Local builds have no privileged service-role environment; the unrelated community queue reports its existing fallback warning.

## Rollout and measurement

No Cloudflare migration, database/schema changes, billing settings or Gallery workflow changes are included. Gallery candidate previews participate in publication validation and must remain enabled.

After deployment, check `x-vercel-cache` and function invocation counts for `/skills`, localized core pages and skill detail pages. Compare CPU seconds per 1,000 requests and total middleware/function invocations over comparable 24-hour traffic periods. Separate dynamic search/filter traffic from canonical cache hits, and compare error rates and ISR reads/writes as well as CPU cost. ISR is traffic-triggered, so infrequent long-tail pages can still require rendering after expiry.

Production deployment is a separate rollout step; local validation does not establish production cache behavior or savings.
