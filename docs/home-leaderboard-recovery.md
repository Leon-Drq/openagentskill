# Homepage leaderboard recovery

The homepage showed an empty leaderboard after deployment even though the
production history API returned 30-item snapshots for November 8 and 9, 2026.
The latest-snapshot API also returned the November 9 snapshot. The scheduled
writer and D1 data were working.

Cloudflare builds intentionally run without production database credentials.
Their prerendered homepages contained the empty fallback, but OpenNext uploaded
those pages as fresh R2 ISR entries. The four-hour page lifetime then applied to
the empty HTML, and another deployment could seed it again. Changing the image
cache lifetime cannot fix this independent page-cache problem.

## Recovery contract

- The server-rendered homepage marks a populated snapshot or live directory
  ranking as `data-oas-home-cache="ready"`. Empty or historical fallbacks use
  `fallback`.
- The R2 adapter wrapper treats fallback home HTML/RSC as a cache miss, including
  build-uploaded entries. It never writes a failed refresh over a successful
  homepage. Healthy entries and all unrelated cache types pass through unchanged.
- Missing snapshot rows reject inside the data cache. The public caller still
  receives null, but a subsequent successful read can recover immediately.
- If the snapshot is missing or empty, the homepage reuses the bounded,
  four-hour-cached most-starred ranking selection. It does not query trending or
  substitute a trending population under a most-starred heading.
- Saved-directory data keeps its historical label and date. Complete failure
  shows an honest temporary-unavailability message and a directory link.

Successful homepage and ranking reads remain cached for four hours. Static
preview images retain their separate one-week cache policy. This change adds no
client polling, new scheduled job, database migration, or per-visitor catalog scan.

## Verification

`node scripts/test-home-leaderboard.mjs` covers seeded-empty recovery, cache
passthrough, retained healthy HTML/RSC, same-ranking fallback and maintenance.
It runs as part of `pnpm test:performance` and `pnpm test`.

The Linux Cloudflare preview check starts with an empty local database, renders
the fallback, inserts a local ranking snapshot, and verifies immediate recovery
plus HTML/Flight cache hits across the eight homepage languages. It uses no
production database or credentials.

For production verification, compare the homepage's ten leaderboard links with
the latest `most-starred-agent-skills` history snapshot, check both English and
localized pages, then confirm repeat requests have `x-opennext-cache: HIT`.
