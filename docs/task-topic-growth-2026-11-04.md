# Focused task-topic growth release

This release improves six existing destinations and adds one architecture guide.
It preserves existing URLs, titles, source/review permissions and translations.
The English editorial content does not claim new translated articles, successful
Skill installations or Google ranking improvements.

## Intent ownership and pilot

| Destination | Candidate query family | Change |
| --- | --- | --- |
| `/best/presentation-generation` | ppt skill, presentation skill | Output choice, one-slide brief, editability checks and troubleshooting |
| `/best/ppt-generation` | pptx skill, editable PowerPoint skill | Same handoff checks in the native-editable selection context |
| `/best/codex-presentation-decks` | codex ppt skill | Codex installation path and a bounded deck task |
| `/best/architecture-diagram-skills` | architecture diagram skill, Mermaid skill | New task-specific guide, one documented source, original diagram fixture |
| `/best/frontend-design-skills` | frontend design skill, UI UX skill, Figma to code skill | Brief, page-type decisions, responsive and interaction acceptance |
| `/best/claude-excel-skills` | claude excel skill, xlsx skill | Six-row CSV cleanup exercise using the existing downloadable workbook |
| `/best/claude-code-pdf-parsing` | claude pdf skill, PDF extraction skill | New original PDF, extracted CSV/JSON, reconciliation and OCR boundaries |

These are candidate phrases, not verified high-volume market keywords. Synonyms
share a destination. A new URL requires independent intent and substantial useful
content. Video remains a second-stage opportunity; existing video pages are kept.
Archify's existing detail overview and automatic related-topic links point to the
new architecture guide. The best-of directory and core sitemap discover it.

## Evidence and baseline

The latest full Search Console report could not be retrieved: the connected
browser failed when selecting its tab (`timeoutMs` provider error). No new query
volume, query-to-page attribution, live ranking or GA4 results are invented.
The owner screenshot shows 10 clicks / 157 impressions / average position 7.2 for
its selected scope; the period is not visible. It is not market search volume.

Previously recorded page-level data, 2026-09-09 through 2026-10-06:

| Page | Clicks | Impressions |
| --- | ---: | ---: |
| Archify detail | 464 | 36,605 |
| PPT overview | 210 | 3,121 |
| Codex PPT | 186 | 3,094 |
| Design/creative ranking | 226 | 3,938 |
| Vox Director detail | 133 | 2,775 |

These are historical whole-page totals, not individual generic-keyword demand or
evidence that this release caused traffic. Separate brand terms from discovery.

When a fresh Search Console Queries CSV is available:

```sh
node scripts/analyze-search-opportunities.mjs /private/Queries.csv .codex-tmp/opportunities.json
```

Keep the selected dates, country, device and search type beside the export. The
read-only analyzer accepts English/Chinese column names, preserves quoted commas,
rejects missing metrics and Pages exports, and surfaces relevant queries with at
least 100 observed impressions and average position 4–20. This is an initial
screen, not a ranking prediction. Suggested destinations are mappings, not joins
between unrelated query and page aggregates. Inspect query-specific pages in GSC
before consolidation or further expansion. The output never overwrites a file.

## Production and measurement

- `scripts/build-topic-growth-examples.py` creates synthetic examples without
  executing upstream Skills. PDF extraction uses ReportLab/pdfplumber; Poppler
  renders the page. The diagram serializes a fictional component list to Mermaid
  and SVG. Asset hashes and reconciliation results ship with production notes.
- Task briefs and all explanatory text are server rendered. Only the copy button
  adds client interaction. Successful copying emits `task_brief_copy` with a
  static `topic_slug`, using existing analytics consent and deduplicated growth
  attribution. The brief itself is not sent. Copying measures usage intent only.
- Existing source-check dates are preserved. Updated visible editorial dates,
  structured data and sitemap dates agree. The new architecture source was
  inspected at its pinned revision on November 4, not relabeled as the latest.
- After Google has recrawled the changed pages, compare consistent complete
  28-day periods and separate outage days, country/device, brand/non-brand and
  ranking ranges. Assess organic clicks and consenting task-brief/install-copy
  events separately from actual installation/run success. No recurring monitor
  or new GA4 property settings are created by this release.

## Acceptance

Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, production build and Cloudflare
runtime checks. `node --experimental-strip-types scripts/check-topic-growth.mjs
<origin>` checks seven destinations, canonical/robots, visible briefs, anchors,
dates and downloadable asset hashes. Keep release-specific runtime and live
results under ignored `artifacts/` so private analytics exports are not committed.
