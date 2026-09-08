# Skills directory visual release

- Compact, single-search header using the existing home-page typography and palette.
- Skill rows precede task collections and developer links; complex filters use a native disclosure.
- GitHub owner avatars, repository star counts, source evidence and snapshot labels are explicit. No new verification or safety claims.
- Stars is the default browse sort. Search defaults to relevance. Explicit sorts apply after candidate merging.
- Normalize category case, aliases and historic bracketed arrays only in the directory UI. Original records and old category URLs remain intact; exact legacy category lookup is retained alongside bounded discovery.
- Counts describe a bounded candidate shortlist, never the full registry. Full-registry pagination and expanded indexing are **not** part of this release.
- Pagination now uses crawlable links, preserving locale, query and filters. Existing canonical, robots, public paths and sitemap policies are unchanged.
- Eight-language core controls; localized `/zh/skills`, `/ja/skills`, etc. reuse the same renderer and preserve all filter/page parameters. Their existing route-level canonical, title and robots metadata remain intact. Repository titles/descriptions and editorial collection copy remain source content.
- Compare retains optional local persistence with a stable server snapshot and private-browsing fallback.

## Verification

Run the full regression suite, typecheck, lint, production build and `node scripts/check-seo.mjs <origin>`.
Test 320/390/768/1440px widths, expanded filters, category and sort selection, localized search, next/previous navigation, compare selection, reset and empty results in a real browser.
Deploy through the existing GitHub PR checks and production Vercel integration. Verify the production commit/alias and sample runtime error logs before handoff.
