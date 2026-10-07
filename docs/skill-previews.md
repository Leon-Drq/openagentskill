# Skill directory previews

The directory uses existing provider examples first, then Gallery cases, then
the explicit source-preview registry. The same source previews appear at
`/skills/[slug]#visual-previews`, with complete images, bilingual captions,
original source links, output-format notes and a copy of the source license.
These documentation images are not platform executions or review approvals.
Multiple screenshots are counted as **previews**, not independent completed cases.

`lib/skill-preview-sources.json` is the reviewed input; `lib/skill-previews.json`
is generated. Bind to an exact registry slug. Never use a fuzzy name match or
attach all examples in a monorepo to every skill. Existing Gallery cases keep
their URLs and ownership. The historical GC Minimal Zine Poster directory slug
has an explicit preview alias matching its existing permanent redirect.

To extend coverage:

1. Inspect the author's actual examples and image rights, including nested
   licenses and notices. Choose output examples, not logos or sponsor banners.
2. Add a source with its immutable commit, reviewed asset paths, SHA-256 hashes,
   pinned license hash, English/Chinese alt text, captions and format limitations.
   Label each image `example`, `template`, `style`, `interface`, `input` or `reference`.
3. Run `pnpm previews:import`. An optional `--cache-dir <directory>` reads files
   named by their SHA-256 for an offline build; the same hash/size checks apply.
   The importer downloads only raw files from pinned GitHub commits, never code
   execution. It validates the whole batch before publishing the manifest.
4. Run `pnpm test:skill-previews`, the regression suite, typecheck and production
   build. Inspect the directory and detail on desktop and mobile before release.

Originals are preserved under `public/skill-previews`; card WebP is at most
720px / 180KiB, detail WebP at most 1600px. Content-addressed filenames keep
future updates from returning stale cached images. Slides, images and documents
use `object-contain`; card actions and evidence labels do not cover the artwork.
Images retain alt text and dimensions, and detail captions/links render on the
server. Existing canonical URLs, indexing rules and structured data are retained.

Only example/template/style records join the **With examples** SQL filter before
counting and pagination. Interface/documentation-only sources and outbound source galleries do
not qualify. Missing/broken card images show a compact link to the skill guide.
Custom Diffusion is linked to its author's gallery because its research-material
license restricts commercial redistribution. VAR's separately hosted README
assets remain source links until their artwork reuse permission is established.

The daily Gallery workflow also runs the owner-authorized automatic Skill media
collector described below. The original Gallery collector retains its existing
source paths; the new collector discovers media for exact published identities.

## Reuse existing examples without losing their attribution

`lib/skill-preview-bindings.json` connects an exact registry slug to existing
Gallery case IDs. Each binding records the repository, Skill document path,
immutable revision and document SHA-256. `same-skill` requires the author's
preview for that exact template; `upstream-template` requires an explicit
upstream reference in that Skill document. A shared repository is insufficient.
The server resolves the current Gallery assets, captions and license; assets
are not duplicated. Upstream templates are labeled as references, not outputs
produced by the downstream Skill. The detail page links both the original
preview and the Skill document establishing the relationship.

Bindings automatically participate in the existing SQL `With examples` filter
before counting/pagination. New Gallery/provider media continues to flow into
cards and details through the same source adapters. Both Gallery and provider
video URLs are preserved; players attach their source only after a click, and
pause other previews when playback starts. A failed poster does not block video
playback. Failed images keep their description and frame; directory cards try
another available source before showing the compact unavailable state.

## Media health and coverage checks

- `pnpm media:audit`: inspect every configured Gallery, source preview, binding
  and active provider; verify local assets, media signatures, alt text/dimensions
  and preservation of video fields. Runs in the required regression suite.
- `pnpm media:audit --remote`: also probe every remote image/video with a bounded
  range GET, verify its file signature (an HTTP 200 HTML error is a failure),
  and cancel the response stream. No Skill code is executed. Only approved
  public hosts/redirect hosts are accepted. This runs in the existing daily
  Gallery workflow, with the full report retained as a GitHub Actions artifact.
- `pnpm media:audit --catalog <public-registry-export.json>`: optionally join
  the whole registry, check exact binding identities and produce per-category
  coverage plus a missing-visuals work queue. Input is an array of public
  `{slug, github_repo, repository, source_path, category}` records, with category
  taken from `primary_category`. Obtain it with a read-only owner export; never
  embed database credentials in the script, report or client bundle.

The report is `artifacts/skill-media-audit.json`. Remote probe failures fail the
check and remain visible in its report. Missing previews are reported separately
as **not collected**, not automatically treated as broken images or proof that
the author has no examples. This audit checks the full configured media catalog;
it does not claim to crawl every upstream repository or confer redistribution
rights. New sources still follow the attribution/import process above.

## Automatic collection for current and future Skills

`pnpm media:collect` reads the complete public registry through
`/api/skills/media-candidates`, with keyset pagination and a strict public-field
allowlist. It covers newly published Skills from every existing intake path;
unpublished submissions are excluded. No database write or owner token is needed.
The nightly `Daily Gallery sync` workflow runs it after Gallery collection,
checks the generated media, and publishes through the existing exact-commit CI
gate and production verification. Visitors never trigger crawling or decoding.

The default batch is 150 due records. One third of slots prioritize new records
created in the last seven days; one fifth prioritize due retries. Remaining
slots work through presentation, image, design, video and other categories.
Records with explicit curated previews or Gallery associations keep those.
Every subsequent run discovers newly published records, so future listings do
not require a manually edited repository allowlist. A large backlog may take
multiple runs; collection is asynchronous, not a promise of instant media.

The collector reads the exact `SKILL.md` and adjacent README files at a pinned
commit, or the root README for a repository-level entry. Nested Skill documents
never fall back to unrelated root examples. Images linked from those documents
and example directories belonging to that exact Skill are candidates. It skips
logos, badges, sponsor art, symlinks and ambiguous sibling assets. Documents are
parsed as data; no Skill code, HTML, macros or installation command is executed.

PNG/JPEG/WebP images receive compressed WebP variants. GIFs receive a still
thumbnail plus a link to the original animation. MP4/WebM files receive a real
video frame and click-to-load playback. PDF previews show the first page;
PowerPoint previews use the author's embedded thumbnail when present. HTML
demos, decks without thumbnails and off-repository images remain diagnostic
items rather than invented outputs. Image sizes, pixel counts, download bytes,
decoder timeouts and per-run output bytes are bounded.

Automatic mirroring requires a detected supported root license (MIT, Apache-2.0,
BSD-2-Clause, BSD-3-Clause, ISC, CC0-1.0 or CC-BY-4.0), matching license text,
and no overriding nested license/notice. Root NOTICE files are retained with
the license. Other sources remain in `needs-review`; this state concerns media
attribution only and never changes Skill submission reviews or installation
claims. GitHub credentials are sent only to `api.github.com`, never to raw media,
author URLs or public clients. Only same-repository pinned raw files are fetched.

Generated assets live under `public/skill-previews/auto/`, addressed by SHA-256.
`lib/skill-previews-auto.json` joins the existing server-only preview registry,
including the SQL `With examples` filter before counting and pagination.
Large example memberships use the `skill_directory_by_slugs` invoker RPC and
a POST body, preserving database counting/sorting/pagination without URL length
limits. The migration must be applied before deploying this collector. The RPC
reads the existing public directory view; it changes no review or listing state.
`lib/skill-media-sync.json` checkpoints each exact identity and its next attempt:

- `collected`: materialized previews; refresh after 30 days.
- `not-found`: no suitable preview in the scanned documents; retry after 7 days.
- `needs-review`: source association or image license is unresolved; retry after 7 days.
- `error`: fetch or decoder failure; retry after 1 day, retaining existing previews.
- `deferred`: run budget reached; retry after 1 day.

A changed source identity is retried regardless of its previous checkpoint.
Feed failures and GitHub authentication/rate-limit failures abort publication,
preserving the previous catalog. Content changes generate new asset URLs.
Automatic previews are removed when a complete public feed no longer contains
their identity or when a successful source check establishes a rights problem.
The run report is `artifacts/skill-media-collection.json`, retained by Actions
for 30 days. State counts describe collection outcomes, not runtime verification.

For a controlled backfill, pass `--catalog <public-export.json> --limit 360`.
The export must be complete (not just a category subset), since it also checks
publication eligibility. Optional `--cache-dir` is for a single local backfill;
use a fresh directory for later source refreshes. Local decoders are `ffmpeg`,
`pdftoppm`, and `python3`, overridable by `FFMPEG_BIN`, `PDFTOPPM_BIN`, and
`PYTHON_BIN`. The GitHub runner installs its decoders explicitly.
