# Public discovery reliability and payload release — 2026-09-12

## Scope

- Keep the existing URLs, locale routes, redirects, canonical and sitemap eligibility rules.
- Hide diagnostic-heavy detail data behind a user-facing source disclosure; keep license and risk warnings visible before installation.
- Preserve source/review/publication permissions and the distinction between saved data and live evidence.
- Share presentation-category corrections between skill details, discovery, machine-readable metadata and ranking snapshots.
- Cache successful evidence/category/detail-support reads only. Request-local timeouts never overwrite successful cached data with empty lists or zeroes. Independent detail support reads have independent caches.
- Retain either healthy search branch when its sibling fails, report degradation, and never present an unknown empty response as a definitive no-match result.
- Apply recorded-source, category-alias and star filters before limiting directory candidates. The recommendation pool is still bounded; this is not unrestricted full-registry pagination.
- Move the full Gallery catalogue out of client imports. Curated pages receive only their visible cards and compact counts; top-rated mode receives only filtered card summaries so live voting can update ordering. Source prompts and production notes remain available on the individual detail page and agent API.

## Release checks

Run the package regression suite, TypeScript, production build, and:

```sh
node scripts/check-seo.mjs http://127.0.0.1:3124
node scripts/check-public-performance.mjs http://127.0.0.1:3124
```

Repeat against the production domain after deployment. Test Gallery filtering, pagination and preview playback in the browser, in narrow and wide layouts. Voting requires the existing server credentials; missing local credentials must not be solved by weakening production permissions.

## Limits and follow-up

- Decoded JS and gzip estimates are payload measurements, not Lighthouse scores or real-user LCP/INP. Speed Insights remains enabled for field data.
- Next.js may send HTTP 200 before a missing skill resolves. These streamed missing pages explicitly emit noindex; the conflicting inherited index directive is removed. A universal early existence probe was not added because it would introduce an extra database round trip on every cold detail visit.
- Broader multilingual bundle splitting, database-wide category aggregation and full-registry filtered pagination need separate schema/data-contract work. They are not claimed as completed in this release.
- Do not globally cache user-specific responses or remove security review evidence for performance. Existing search rankings and traffic cannot be guaranteed, even when technical SEO checks pass.
