# Search indexing recovery — 2026-10-09

The primary issue is a large crawlable URL graph, not 831,000 missing articles.
Search Console's report (last update 2026-10-04, inspected 2026-10-09) shows
831k excluded URLs and 51.8k indexed. Database inspection found 34,862 Skill
records, of which 8,425 meet the existing legacy search policy. Editorial
source-pinned listings and other site pages are separate.

## Evidence

| Report | Reported count | Inspected examples / interpretation |
| --- | ---: | --- |
| Excluded by noindex | 624,545 | 89 of the first 100 examples were directory search, filter, sort and pagination combinations, including locale variants. Other examples included resolver queries and intentionally excluded details. |
| Crawled, not indexed | 137,619 | 8 of the first 10 examples were badge API URLs; 2 were Skill details. This is a sample, not an estimate of the whole population. |
| Not found | 35,889 | Examples included removed `/api/agent/receipt` queries and paths such as `/start-session`, `/deploy`, `/godmode:cicd`. Do not redirect unrelated missing paths to the homepage. |
| Alternate canonical | 20,193 | Canonical duplicates are normally expected exclusions. |
| Duplicate without canonical | 8,155 | All first 10 examples were `/api/badge/…` SVG endpoints. |
| Server errors | 1,941 | Examples included install/agent APIs and Skill details. The sampled live URLs returned 200 during this audit; historical 5xx is not proof of a current outage. |
| Soft 404 | 1,506 | An independently requested nonexistent Skill returned HTTP 200 with a not-found body to both normal and Googlebot user agents. |

The homepage originally exposed 47 followed query links and the English
directory 115. Filter links retained existing search/filter state and generated
further combinations. robots.txt permitted all of them. API endpoints did not
carry a general noindex response header.

## Changes

- Googlebot/Bingbot robots rules exclude interactive directory/resolver/comparison
  query spaces while preserving canonical pages, assets, sitemaps and the existing
  AI crawler policy. Existing noindex/canonical metadata remains in place.
- Shared links add `nofollow` to facets, query-only Skill variants and machine
  endpoints. Canonical editorial/topic/detail links remain followed. Link pending
  feedback replaces the root loading fallback on public pages.
- API responses carry `X-Robots-Tag: noindex, follow`. APIs remain crawlable in this
  release so already-discovered URLs can receive the new noindex signal. This does
  not disable agent access.
- Tracking parameters (`utm_*`, `ref`, click IDs) and `_rsc` do not force detail
  pages into an uncached noindex query route. Language/content parameters retain
  their previous behavior and canonical targets.
- Remove the root loading boundary that sent 200 before database-backed missing
  document checks. Keep scoped loading for account/auth routes and accessible
  pending link feedback. Missing details now return 404 for normal and Googlebot
  requests. No extra database lookup was added to proxy.
- Reject invalid page numbers and healthy out-of-range results instead of serving
  duplicate last pages. Do not interpret an outage as a genuine missing page.
- Parse YAML scalar chomping/indent indicators and trailing whitespace correctly.
  Backfilled **829** descriptions/taglines from stored original documents. An
  atomic SQL guard verified every other source/review/publication field unchanged;
  only timestamps and derived search/taxonomy fields may update. Four documents
  literally specify `description: ">"`; these need source correction and were not
  rewritten. Before/after backups and exact applied SQL are saved locally under
  `.codex-tmp/source-summary-repair-*`.

Search eligibility, review scores, installation evidence and verified badges
were not relaxed or fabricated.

## Verification

- Complete `pnpm test` regression suite passed, including new crawl policy tests.
- Typecheck and production build passed. ESLint: 0 errors, 25 pre-existing warnings.
- `node scripts/check-crawl-policy.mjs http://localhost:3100` passed 29 HTTP checks:
  canonical/indexable pages, attribution URLs, Googlebot/normal missing documents,
  invalid/deep pagination, API noindex, robots and every sitemap shard.
- Local production-build sitemap inventory: **9,017 unique canonical URLs**,
  including **8,468 Skill URLs**; no query URLs or cross-shard duplicates.
- Missing detail status changed **200 → 404**. Out-of-range `page=999999` and
  invalid `page=-1` return 404. Page 2179 can be valid in the current full catalog;
  a large page number alone is not an error.
- Homepage/English directory followed facet links are now **0**. The remaining
  two query links are authentication links; localized navigation also retains
  language links for other pages.
- `scripts/check-crawl-policy.mjs <origin>` is a reusable read-only deployed check.

## Search Console follow-through

The existing sitemap URL stays `https://www.openagentskill.com/sitemap.xml`.
Google must recrawl/reprocess before report totals move. Robots exclusions may
increase as facet crawling decreases; that is expected, not a loss of intended
landing pages. A blocked URL cannot read a new noindex signal, which is why APIs
are deliberately not robots-blocked in this release.

Evaluate canonical sitemap pages separately from all known URLs. Inspect a sample
of eligible pages if they remain crawled-not-indexed, comparing actual source
specificity and task usefulness instead of removing quality gates. Watch crawl
requests by `/api/`, directory query, canonical detail and 5xx separately. Do not
expect all excluded URLs to become indexed or promise an indexing timeline.

Reference: [Google's faceted navigation guidance](https://developers.google.com/crawling/docs/faceted-navigation).
