# Scenario SEO upgrade

The October 2026 keyword review changes the next release order: frontend/UI first,
Remotion video earlier, PDF recommendation corrections in parallel, and focused
Excel/Word pilots. Existing URLs, publication states and review records are retained.

## Evidence and scope

US/English third-party monthly estimates from OpenSEO: UI UX Pro Max Skill 5,400,
frontend design skill 1,600, Remotion skills 1,300, Claude SEO skill 480,
Playwright skill 320, Claude Excel skill 110 and DOCX skill 90. Missing metrics
are unknown, not zero. Academic research skills and geo skills have mixed or
unrelated intent and are not release targets.

GSC final window: September 6–October 3, 2026. In the US sample, the frontend
detail page has 498 impressions, one click and average position 9.1. The exact
frontend design skill query/page sample has one impression and position 34;
the page average must not be reported as that keyword's rank. The directory
has 17,834 impressions and 11 clicks. Samples have additional rows and are not
complete site totals. This window predates the October 6 PPT release.

## Page responsibilities

- `/best/frontend-design-skills`: compare landing design, product UI, Figma
  implementation, review and React performance. Specific names remain on source
  detail pages; `/collections/frontend-product-ui` owns the combined workflow.
- `/best/video-creation`: choose code animation, generation or editing.
  `/best/remotion-skills` owns the official skill setup and reproducible render.
- `/best/document-processing`: choose an input/output task.
  `/best/claude-code-pdf-parsing` covers extraction, tables and OCR; Canvas Design
  and generic converter libraries are excluded from that parsing shortlist.
- `/best/claude-excel-skills`: CSV cleanup and editable XLSX pilot.
  `/best/docx-skills`: supplied notes to editable Word pilot.
- Five focused guides link comparisons, examples and existing source details.
- The directory gains visible topic links and a task-focused English snippet.
  Query-variant noindex/canonical policy remains unchanged.

The new topic renderer uses exact, pinned source notes without global ranked
catalog queries. It does not invent review scores, verified badges or compatibility.
Frontend and video collections use explicit source candidates and batch lookup.
Taste Skill's checked source excludes dashboards and data tables; the comparison
reflects that boundary. Existing registry and owner publication flows are untouched.

## Examples and evidence

`public/examples/scenarios` contains original editorial fixtures: three frontend
pages and local input specifications, a Remotion React composition and actual
MP4, a synthetic CSV/XLSX cleanup and a structured-input DOCX brief. These are
not presented as comparative runs of all upstream Skills or client runtimes.
The Figma-related fixture uses a local token specification, not a claimed private
Figma export. A real Figma fidelity case needs an accessible design frame.

Fixture HTML is noindex; source inputs and production notes accompany outputs.
No external generation APIs or paid research run as part of the fixture creation.
Native Excel client behavior and comparative OCR accuracy are not established.

## Release checks

Required before release: regression suite (including task-relevance guards), lint,
typecheck, repository links and production build. Browser checks cover desktop/
mobile overflow, sample filter/empty state, source links, heading/schema/canonical
consistency and artifact availability. Inspect rendered workbook/document/video
previews and verify saved file structure before publishing.

After deployment: verify the deployed commit, all upgraded routes, canonical and
index instructions, guide/collection links, sitemap discovery and downloadable
artifact types. Observe US GSC query groups at 14/28 days; do not promise ranks or
infer a fixed uplift from third-party search volumes.
