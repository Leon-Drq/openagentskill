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
