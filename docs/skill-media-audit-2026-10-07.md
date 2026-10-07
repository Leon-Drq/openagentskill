# Skill media audit — 2026-10-07

Scope: read-only inventory of all **34,680 public registry records**, joined with
all **386 active external-source listings** and every configured media source.
This is a complete catalog/media join, not an exhaustive crawl of 34,680 upstream
repositories. For missing source associations, 45 individual Open Design Skill
documents were read at an immutable commit.

## Findings and repairs

- 257 external listings supplied a video that the directory adapter discarded.
  Cards now retain the source video and load it only after a click. The 22 Gallery
  video cases use the existing shared player in directory cards as well.
- 18 independently listed Skills lacked existing source previews: 12 explicitly
  reference upstream HTML slide templates, and 6 have author previews for the
  exact design template. Exact source-document bindings restore these previews
  without transferring artwork authorship or claiming a new Skill execution.
- Two author screenshots (Dating Web and Gamified App) were added from the
  already reviewed Apache-2.0 Open Design source, with hashes, licenses and
  resized WebP copies. Original assets and template attribution are preserved.
- Broken-image fallbacks cover directory, Gallery and detail previews. Videos
  retain playback when a poster fails, and expose retry/original-video links.
- External listing social metadata now includes its real preview image. Existing
  canonical, robots, pagination and publication/review decisions are retained.

## Asset checks

**722 local files + 1,782 remote image/video URLs = 2,504 assets passed.**
The remote check uses bounded range requests, verifies file signatures and
cancels response streams. GitHub's user-attachment video redirects to its
specific S3 delivery host; that host was checked and explicitly allowed, then
the one affected URL was successfully retested. A reachable video is not a
verification that every browser can decode it; browser playback is checked
separately during UI verification.

## Remaining collection work

The registry join finds 42 stored record identities with configured media
(including a historical slug that permanently redirects to the canonical Skill).
The 386 external listings are counted separately. There are **4,729 records in
visual categories without collected previews**. That is a collection backlog,
not 4,729 confirmed broken links, and does not prove the authors have no images.
Some directory categories also contain code-only tools and frameworks.

The local report `artifacts/skill-media-live-audit.json` contains category totals
and the full missing-visuals queue. No private credentials or account data are
included. New material still needs an exact Skill association and source/rights
checks; unrelated repository pictures must not be used to fill this backlog.

## Continuing checks

`pnpm media:audit` runs in required CI. The existing daily Gallery workflow also
runs `pnpm media:audit --remote` and retains the health report as an Actions
artifact. New provider/Gallery/source media is covered automatically by these
checks. This is health monitoring and coverage reporting, not permission to
execute Skills or automatically mirror arbitrary author assets.
