# Featured creators

## Design and scope

The directory helps visitors move from a creator's representative repositories to
Skill listings and real Gallery examples. It keeps `/creators`; editorial GitHub
profiles live at `/creators/github/:owner`. Existing claimed account profiles at
`/creators/:username` and the authenticated `/creator` console are unchanged.
Public attribution must never create a seller account or bind an identity.

The design retains the site's palette (paper `#F8F7F3`, ink `#171717`, secondary
`#626262`, rule `#DDDBD4`, green `#006b4f`), Georgia display, Inter body and Geist
Mono data. Two-column creator cards pair a public identity with source projects
and a genuine work preview. The homepage uses six compact cards. No new top-level
navigation item, invented project images, follower estimates or author endorsements.

## Sources and ranking

`lib/featured-creators.json` contains 20 deliberately selected individuals/teams.
The launch source check used the GitHub API: public repository, actual SKILL.md,
owner identity, commit-pinned source, repository stars and observation time.
The catalog is editorial attribution, not an approval, runtime test or license
clearance. Every profile links its GitHub source and the selection methodology.

The directory reads only public registry listings within an explicit repository
allowlist. Stars count each repository once and use the latest timestamp, including
decreases. Newer existing registry sync observations replace the dated source
snapshot. Otherwise the dated snapshot stays visibly dated. No GitHub request is
made by visitors or by the homepage. Counts are registry entries, not a claim of
unique underlying skill capabilities. All related repositories are disclosed.

Sorts: repository stars, last repository push and editorial selection. Historical
growth is not available for the full selection; it is explicitly not estimated.
Add growth only after time-aligned per-repository observations exist. Do not rank
missing observations as zero growth. No new paid API or scheduled job was added.

## Identity and failures

Listed and editor-selected are public attribution labels. Claimed requires a
verified GitHub identity matching the selected source owner AND an approved claim
for a public Skill in the selected repository set. Claims remain scoped to those
Skills, not all repositories. X identity is not inferred. Existing claimed URLs
remain reachable from the directory and sitemap.

Public reads use bounded timeouts and cached successful results. Failures do not
overwrite the cache with empty success. On a cold failure the UI explicitly shows
unavailable registry/ownership state and only the dated source catalog, without
inventing installs, Skill listings or claim status. No production writes, RLS,
auth, review scores or publication rules are changed.

## Localization and SEO

All new UI uses `creator-copy.ts` with explicit eight-language coverage and
placeholder tests. Project/account names and source code are preserved. Existing
canonical URLs remain; filtered/language-query variants are noindex/follow. New
GitHub-attribution profile URLs enter the creator sitemap and use ProfilePage with
Person or Organization matching GitHub's account type. Structured JSON escapes `<`.

## Verification

Run `test:creator-directory`, `test:localization`, the complete test suite,
typecheck, lint and production build. Browser checks cover 20 profiles, sorting,
search, empty results, ownership notices, source/Gallery links, eight languages,
mobile widths, navigation without login and the authenticated claim boundary.
Do not execute listed Skills as part of these website checks.
