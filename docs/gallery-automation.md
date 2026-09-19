# Daily Gallery collection

`Daily Gallery sync` runs every day at **01:23 UTC / 09:23 Asia/Shanghai** and can also be dispatched from GitHub Actions. GitHub may delay scheduled starts. No personal token or AI provider key is required. It uses the built-in repository token for GitHub API reads, CI status reads and the final commit; credentials are never sent to raw image hosts.

## Scope and publication

`scripts/gallery/sources.json` enables specific preview directories from JimLiu/baoyu-skills, zarazhangrui/beautiful-html-templates and alchaincyf/huashu-design. Discovery covers new files in these directories, not arbitrary websites or new Skill submissions. Add a source only after checking its creator, Skill mapping and artwork rights. Repository text is data, never executable instructions. Video bundles with third-party credits are not auto-imported.

The collector resolves HEAD once per source, then reads the complete tree, license and images at that immutable commit. A changed root license, empty or truncated tree, or transport failure blocks the entire publication. Nested licenses/notices require a source-rule review. Downloads have time, byte and pixel limits; symlinks, SVG, animation, invalid images and duplicate SHA-256 content are excluded. Original images are preserved and card/preview WebP copies are generated locally. Technical validation does not establish factual accuracy, permission for third-party material or a successful Skill execution; case details state this explicitly.

Stable source/path identities preserve detail URLs and votes. Changed automatic previews update in place with immutable image URLs. Missing source files are reported and retained, never silently deleted. Human-curated examples remain historical snapshots. Up to 12 new cases and 100 image downloads are processed per run; remaining discoveries are picked up in later runs. Existing automatic cases are checked first. Requests retry transient errors up to three attempts. A failed job can be rerun without duplicate entries. Repeated same-source runs may advance the remaining discovery queue, within the per-run limit.

The workflow commits the generated catalog/assets to a unique candidate branch, waits for Vercel’s external GitHub App to trigger the existing CI workflow on that exact commit via deployment_status, and waits for all regression tests, typecheck, lint and a production build. Only a successful commit is then fast-forwarded to main, respecting the three required GitHub Actions checks. Pushes made with GITHUB_TOKEN do not trigger other Actions workflows, and workflow_dispatch checks do not satisfy protected-branch requirements. Only a successful Vercel preview for a Gallery candidate branch activates the required checks; unrelated deployment events use separate, non-required check names. Non-fast-forward pushes fail rather than forcing or merging untested code. Successful candidate branches are deleted after production verification; failed branches remain available for diagnosis. Vercel's GitHub integration deploys main. A final check waits for the exact commit and collection timestamp on `/api/showcase/sync-status`, then checks the Gallery, a detail page and its thumbnail. Failed checks fail the workflow; the previously deployed site remains available on build failure. See GitHub Actions for failure notifications and Vercel for build logs. GitHub may disable schedules in public repositories after 60 days of inactivity; the daily successful catalog status commit normally keeps this repository active.

## Operations

- Run manually: `pnpm gallery:sync` (optional `GITHUB_TOKEN` for higher API limits).
- Tests: `pnpm test:gallery-sync`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- Latest published check: `/api/showcase/sync-status`; complete source report: `lib/showcase-sync.json`.
- Every run uploads `artifacts/gallery-sync-report.json` for 30 days, including failed source checks and skipped/missing/deferred items. The action summary also shows counts and source failures.
- New cases register their slug for voting lazily on the first authenticated vote using conflict-ignore insertion. Vote writes continue through the existing user-scoped RLS RPC. No Skill review, approval, score or owner-publishing state changes.
- Pause by disabling the workflow. Roll back a faulty generated commit with a normal Git revert and redeploy; assets from older revisions remain in Git history. Stop ingestion before reverting. Review licensing changes explicitly before updating pinned source-license files.

The automation writes only `lib/showcase-auto.json`, `lib/showcase-sync.json` and `public/showcase/auto-*`. It never commits fetched source code, credentials or local reports.
