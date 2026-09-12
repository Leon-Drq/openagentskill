# SEO discovery preview — 2026-09-12

Local preview only. No deployment, data migration, publication approval, or change to existing sitemap eligibility.

## Implemented

- Source evidence shapes the directory shortlist internally; public source-state tabs and pool diagnostics are removed. Search includes all entries. Counts describe selected results, not the whole registry. Legacy view/filter URLs remain functional.
- Recommended browsing spreads entries across repositories and prioritizes recorded sources. Explicit stars/date sorting and query relevance are preserved. This is not a new security score.
- Six repository-specific display taxonomy corrections cover Superpowers, mono-color, Guizang PPT, Frontend Slides, Vox Director and Archify. Sources are their GitHub repository descriptions. Breadcrumbs, search titles, directory labels and agent-readable category use the same mapping; original review inputs remain untouched.
- Directory search titles no longer claim all results are audited or verified.
- Detail query variants now emit matching HTML and HTTP robots directives; canonical URLs are unchanged.
- Detail source paths, repository metadata and technical scores are in a closed native disclosure. Known warnings and license terms remain visible before installation; no review decisions change. Directory filters focus on category, use case, platform and GitHub stars. Eight locales share these adjustments.

## Deliberately deferred

- Bulk index expansion: the existing legacy and source-pinned editorial lanes stay unchanged. Search visibility must remain distinct from installation permission. First measure proposed additions and removals against exported GSC landing-page data before a broad policy migration.
- Large-scale category reassignment and duplicate landing-page redirects require source/traffic evidence, not guessed keyword rules.
- Twenty weekly articles remain a quality target, not automatic permission to fabricate research, benchmarks, author endorsements or outcomes. No bulk content was generated in this preview.

## Validation

Existing regression suite plus directory source-view, sorting, taxonomy, schema and translated-label tests; TypeScript; targeted ESLint; production build; browser and HTTP checks. Local database timeouts and missing privileged queue credentials can still produce existing fallback warnings, so this is not a claim that every production integration is healthy.
