# Unified skills directory

The main navigation and home discovery links open `/skills`. Visual and technical skills share one directory; Featured and With examples are filters rather than separate tabs. Case previews link to the existing skill detail and showcase pages.

## Browsing and responsive layout

- The default directory uses server-side pagination across public listings, with 16 skills per page and explicit sort controls.
- Featured, search, use-case and agent discovery can use a bounded candidate set; their counts must not be presented as the registry total.
- With examples intersects the catalog with known showcase skill slugs before pagination and counting.
- Cards, desktop category navigation and mobile filter disclosures use the existing home-page palette and typography.
- Localized directory routes preserve their locale and query parameters.

## SEO and compatibility

- `/skills` remains indexable with its existing canonical URL and localized alternatives.
- Filter/query combinations use `noindex, follow` and canonicalize to the directory, avoiding duplicate parameter pages.
- Existing category, skill detail, `/showcase` and individual showcase URLs remain available. Discovery links use ordinary crawlable anchors.
- Merging the navigation does not remove case content or change publication eligibility.

## Database availability

Catalog reads have an independent circuit and an eight-second deadline. The public-listing predicate remains unchanged. Migration `20261002101342_public_catalog_sort_indexes.sql` adds five partial indexes for the supported catalog sorts without changing records, permissions or review decisions.

During a catalog outage, only an unfiltered first page can show the saved local subset. With examples applies known case membership before selecting that subset. Saved results carry a visible availability notice and never claim a live registry count. Later pages and database-only category, price or star filters must not invent results. Failed reads are not cached as successful empty catalogs.

## Release checks

Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm test:links` and `pnpm build`. Check 320/390/768/1440px layouts, mobile controls, combined filters, reset, localized content, page navigation and case anchors.

Publish through the existing checked GitHub PR and main-branch Vercel integration. Before reporting completion, verify that the primary production deployment is READY for the merged commit, the custom domain points to it, and live root, cases, pagination and legacy showcase URLs render correctly. A database outage or failed production build is an unresolved release check even when a preview succeeds.
