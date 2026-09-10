# Web performance pass — 2026-09-10

## Changes

- Resolve starts on the server inside a streaming boundary. Hydration does not repeat the initial request; explicit retries use a slim `format: "web"` response.
- The default Agent API stays unchanged. Web responses retain source evidence, safety decisions, policy status, and separate review candidates; they omit duplicated machine handoffs and receipts.
- Homepage gallery and creator sections render on the server. Only small analytics/interaction islands hydrate; the full editorial catalog is not shipped for three homepage cards. Images, copy, internal links, attribution and language-aware routes remain present in HTML.
- Directory cache tiers now fit 96 / 160 / 320 / 480 / 800 / 1200-row consumers. A 750-candidate resolve no longer expands to a two-request 1200-row read. Publication filtering, ordering, deadlines and safety gates are unchanged.
- Removed a redundant resolver cache that could persist a transient directory fallback for another five minutes. The existing shared directory cache still retains successful reads and in-flight deduplication.
- Shortlist social images use Node.js, matching their compression-dependent cache implementation.

## Verification and measurements

- Baseline production homepage: 15 Next.js scripts, 1,038,597 decoded JS bytes (Brotli transfer is smaller).
- Local production build after editorial split: 13 scripts, 822,776 decoded JS bytes, approximately 21% less. Confirm again on deployed assets; this is not a measured LCP improvement.
- Baseline `logo` resolve: 465,874 decoded JSON bytes. Local web view: approximately 12.7KB. Candidate data can change between requests; compare same-version full and web responses after deployment.
- Regression suites include projection immutability, unchanged safety/source decisions, server rendering, no duplicate initial fetch, search noindex and cache budgets.
- Canonicals, hreflang, existing URLs, homepage heading/copy and indexable directory content are retained. Query result pages remain `noindex, follow`.

## Remaining measurement work

This is not proof of globally good Core Web Vitals. Read Speed Insights by mobile/desktop and geography, compare p75 LCP/INP/CLS and p95 search latency after release. Database timeout fallbacks must continue to be monitored.

A sampled `research` query executed in about 16ms in PostgreSQL, so no speculative index or schema changes were deployed. Gateway/network time, concurrent refresh load and response size are separate from SQL execution time. Shared multilingual dictionaries remain unchanged in this pass to avoid introducing translation flashes while reducing the larger editorial dependency.

No review approvals, install outcomes, credentials, billing configuration or publication policies were changed.
