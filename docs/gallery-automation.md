# Daily Gallery collection

`Daily Gallery sync` runs every day at **01:23 UTC / 09:23 Asia/Shanghai** and can also be dispatched from GitHub Actions. GitHub may delay scheduled starts. Publishing uses `GALLERY_PUBLISH_TOKEN`, a fine-grained token with Contents read/write for only `Leon-Drq/openagentskill`. The built-in repository token remains read-only for GitHub source and CI reads; credentials are never sent to raw image hosts. No AI provider key is required.

## Scope and publication

`scripts/gallery/sources.json` enables specific preview directories from JimLiu/baoyu-skills, zarazhangrui/beautiful-html-templates and alchaincyf/huashu-design. Discovery covers new files in these directories, not arbitrary websites or new Skill submissions. Add a source only after checking its creator, Skill mapping and artwork rights. Repository text is data, never executable instructions. Video bundles with third-party credits are not auto-imported.

The collector resolves HEAD once per source, then reads the complete tree, license and images at that immutable commit. A changed root license, empty or truncated tree, or transport failure blocks the entire publication. Nested licenses/notices require a source-rule review. Downloads have time, byte and pixel limits; symlinks, SVG, animation, invalid images and duplicate SHA-256 content are excluded. Original images are preserved and card/preview WebP copies are generated locally. Technical validation does not establish factual accuracy, permission for third-party material or a successful Skill execution; case details state this explicitly.

Stable source/path identities preserve detail URLs and votes. Changed automatic previews update in place with immutable image URLs. Missing source files are reported and retained, never silently deleted. Human-curated examples remain historical snapshots. Up to 12 new cases and 100 image downloads are processed per run; remaining discoveries are picked up in later runs. Existing automatic cases are checked first. Requests retry transient errors up to three attempts. A failed job can be rerun without duplicate entries. Repeated same-source runs may advance the remaining discovery queue, within the per-run limit.

The workflow commits generated catalog/assets to a unique candidate branch using the scoped publisher credential. Normal push events start `CI` and `Cloudflare migration validation` on `codex/gallery-sync-*`; the waiter only accepts push runs matching that exact branch and SHA, with all real jobs successful. Skipped jobs, older failing/latest unfinished runs, another branch, manually dispatched checks, and legacy deployment events cannot publish. The built-in token needs only `contents: read` and `actions: read`. GitHub branch protection is unchanged.

Production acceptance found that successful workflow-dispatch checks still left all three protected-branch requirements expected during the built-in token's push (`41637472811`). Treat dispatch as insufficient instead of synthesizing statuses or bypassing protection. The publisher credential is used only by checkout/git for this first-party repository, not by collectors or validation jobs. Store it only as the repository Actions secret `GALLERY_PUBLISH_TOKEN`; scope it to this repository and Contents read/write, with a recorded expiry. It needs no administration, workflow-writing, or PR permissions. Missing credentials fail early. Rotate it before expiry.

Only the validated candidate is fast-forwarded to main. Concurrent main changes reject the push; never force-push, synthesize checks, or merge untested generated code. Cloudflare Workers Builds must connect only this repository's main branch, use `pnpm cf:build` and `pnpm cf:deploy:production`, and disable non-production deployments. The final check waits for the exact commit and both collection timestamps on `/api/showcase/sync-status`, then checks Gallery, a detail page, a collected Skill and images. Failed checks fail publication; successful candidate branches are deleted afterwards.

Remote media health runs separately in `.github/workflows/media-health.yml`. It continues to fail visibly and retain its full report for broken upstream provider images. A third-party image outage must not be reported as a failed Gallery publication or block checked local media. The Gallery pipeline still requires local media validation, the full regression suite, typecheck and builds before publication.

## Search and Skill previews

Automatically collected media is marked `source-preview`. Its existing case URL stays available with a self-referencing canonical and `noindex, follow`; it is excluded from the page sitemap. It is a visual reference, not an independently edited case study or a runtime result. Curated cases retain their existing URLs, indexing and source attribution. Their original images are now included in the XML image extension.

Exact, pinned Gallery relationships also enrich the corresponding Skill preview section. Existing curated/bound previews retain precedence; new Gallery-derived sections reuse at most six distinct existing images, with source/license and case links. They do not copy images into another asset store. Skill case-study cards exclude these automatic previews so the same pictures do not appear twice. Collectors never change Skill review, approval, ownership or installation state.

To promote a source preview for search, edit it into an attributable case study with a concrete task, input/output, useful source-backed explanation and honest requirements. Do not merely remove the preview marker or rewrite a filename into promotional copy. Keep prior URLs and artwork rights.

## Operations

- Run manually: `pnpm gallery:sync` (optional `GITHUB_TOKEN` for higher API limits).
- Tests: `pnpm test:gallery-sync`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- Latest published check: `/api/showcase/sync-status`; complete source report: `lib/showcase-sync.json`.
- Every run uploads `artifacts/gallery-sync-report.json` for 30 days, including failed source checks and skipped/missing/deferred items. The action summary also shows counts and source failures.
- New cases register their slug for voting lazily on the first authenticated vote using conflict-ignore insertion. Vote writes continue through the existing user-scoped RLS RPC. No Skill review, approval, score or owner-publishing state changes.
- Pause by disabling the workflow. Roll back a faulty generated commit with a normal Git revert and redeploy; assets from older revisions remain in Git history. Stop ingestion before reverting. Review licensing changes explicitly before updating pinned source-license files.

The automation writes only `lib/showcase-auto.json`, `lib/showcase-sync.json`, `public/showcase/auto-*`, `lib/skill-previews-auto.json`, `lib/skill-media-sync.json` and `public/skill-previews/auto/`. See [automatic Skill media](./automatic-skill-media-2026-10-07.md) for directory-wide collection and retry policy. It never commits fetched source code, credentials or local reports.
