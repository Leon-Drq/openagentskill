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
   Label each image `example`, `template`, `style`, `interface` or `input`.
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
counting and pagination. Interface-only sources and outbound source galleries do
not qualify. Missing/broken card images show a compact link to the skill guide.
Custom Diffusion is linked to its author's gallery because its research-material
license restricts commercial redistribution. VAR's separately hosted README
assets remain source links until their artwork reuse permission is established.

The current daily Gallery collector continues to handle its existing approved
sources. This registry extends the available collection format; it does not
silently enable crawling or publishing from arbitrary new repositories.

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
