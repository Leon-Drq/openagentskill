# External-platform Skill listings

External entries are owner-curated **external editorial records**, not GitHub
SkillRecords. The first entry is `redskill-curtain-branch-swallow` by 流白Livo,
published at the explicit request of the site owner. Its source is the author post
provided by the owner: https://xhslink.cn/o/2WbYk12a1h4.

## Publication interface

Use the typed `ExternalSkillSchema` and `EXTERNAL_SKILLS` catalog in
`lib/skills/external-catalog.ts`. This is a Git-reviewed publication interface,
not a new public submission endpoint. A maintainer adds or updates one explicit
entry, runs regression tests/typecheck/build, and publishes through the existing
GitHub pull-request and production deployment workflow. Git history preserves the
request reason, source, license and listing-time version. Removing an entry from
the current catalog unpublishes it on the next deployment without erasing history.

GitHub repository publications continue to use the CLI in
[owner-publishing.md](owner-publishing.md). Community submissions, owner tokens,
Supabase review records and rejected submissions are not changed by this lane.

Required external fields include provider/identifier, author attribution, stable
source link, version, bundle checksum, license restrictions, explicit owner reason
and false review/runtime/auto-install flags. Runtime validation rejects unknown
fields, duplicate slugs/identifiers/checksums and non-HTTPS or signed URLs. Do not
infer ownership certification from a supplied author name or a package checksum.

## Discovery and boundaries

- `/skills/external` lists and searches external entries.
- `/skills/external/[slug]` presents original editorial descriptions and source links.
- `/skills?q=...` shows matching external entries in a separate labeled section;
  the GitHub compatibility/score filters and counts do not apply to that section.
- `GET /api/external-skills/[slug]` returns read-only discovery metadata with
  `auto_install_allowed=false`, `human_review_required=true`, and no install command.
  Other HTTP methods have no implementation. No secrets or package content are returned.
- Core sitemap includes canonical external pages. Query/language variants point
  to the canonical English URL and are noindex. Chinese UI/copy is provided;
  other language selections currently use English body copy marked `lang=en`.
- External entries are not passed to Resolve, GitHub rankings, GitHub skill counts,
  reviewed/Installable datasets, creator verification or auto-posting jobs.

No remote API is called on page loads; there is no added model/API cost. RedSkill
version `1.0.0` and bundle SHA-256 are observations at listing time, not a promise
of automatic synchronization. No package or template code is mirrored on this site.
Optional runtime recordings require explicit publication permission and scoped evidence;
they do not change the false AI-review, general runtime-verification or auto-install flags.

## Authorized runtime recording: p5-animation

On 2026-09-11 the owner confirmed they had obtained permission to publicly display
the recording and that this use is noncommercial. This records the owner's
statement, not an independent verification of a license grant or author endorsement.
Original CC BY-NC restrictions and the README license discrepancy remain visible.

The installed 1.0.0 bundle was exercised locally using its three templates with
default parameter substitution. A browser harness supplied pointer interactions,
reset branch growth and triggered the swallow flock. It recorded real canvas
output (rain 8s, branches 8s, swallows 5s), not an AI-generated approximation.
Environment: Windows 10, Chrome 152, p5.js 1.11.11. Recorded at
2026-09-11T07:15:53.653Z. Runtime report: rain 3→484 frames, branch 2→482 frames,
swallow 2→268 frames; all three reported zero errors during this run. This does
not establish installer, other-agent, other-parameter or security compatibility.

The 21s silent H.264 MP4 is 1280×720 at 30fps, 3,817,967 bytes. SHA-256:
`b58b7d7a40c1d1d9cbbd374b10e27ae80b1ddcc3eb66de42959f8bbff63ccf6f`.
`public/media/external/p5-animation` contains this recording, an extracted poster,
EN/ZH descriptive captions and attribution. No source template is distributed.
The player uses native controls, inline playback, a fixed aspect ratio and
`preload="none"`; no autoplay or client-side model calls are added. VideoObject
metadata describes the actual recording; existing canonical routes are retained.

The RedSkill package README declares CC BY-NC 4.0 and separately mentions
share-alike. Preserve that discrepancy and the noncommercial restriction. Do not
claim MIT licensing, commercial permission, OSI approval or an author endorsement.
Do not republish code or create Gallery previews without addressing usage rights.

## Verification

`node --experimental-strip-types scripts/test-external-skills.mjs` is included in
the existing SEO regression suite. Also run the complete regression suite,
typecheck and production build. Check English/Chinese detail pages, directory
search, unknown slug 404, API read-only policy and the core sitemap after deployment.
