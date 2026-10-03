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

Required external fields include provider/identifier, source attribution, stable
source link, observed version, license restrictions, explicit owner reason
and false review/runtime/auto-install flags. Runtime validation rejects unknown
fields, duplicate slugs/identifiers/source URLs/non-null checksums and non-HTTPS or signed URLs. RedSkill records require the observed bundle checksum; link-only Skillry records require a null bundle checksum and public-page evidence. Do not
infer ownership certification from a supplied author name or a package checksum.

## Discovery and boundaries

- `/skills` lists these entries in the same 16-card grid, category/search/price filters and pagination. Source previews qualify for the With examples filter.
- `/skills/[slug]` presents original editorial descriptions, source attribution and case previews.
- Legacy `/skills/external` and `/skills/external/[slug]` permanently redirect to the unified URLs. No external-platform directory remains.
- Repository score/compatibility filters exclude entries without measured evidence. Provider rows have no invented GitHub stars, compatibility or security approval.
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

## Skillry weekly catalog

The owner expanded the scope to every public Skillry Skill with `downloadCount > 10`,
including Free and paid products. On 2026-10-03 the owner confirmed that the partner
agreement permits catalog descriptions and example display. The initial directory
snapshot contains 385 eligible products: 42 Free and 343 paid.

`pnpm skillry:sync` reads two bounded public documents: the terms and the complete
SSR directory. The TypeScript parser reads literal data only, never executes source
JavaScript. `scripts/skillry/policy.json` records scope, permission and the reviewed
terms hash. Source failure, unknown data, a changed terms document, or a large catalog
shrink aborts publication. No per-product crawler runs during browsing, no AI review
calls are made, and packages/media are not copied. Directory descriptions are our own
summaries; source tag vocabulary and public preview URLs retain source attribution.

`lib/skills/skillry-snapshot.json` stores observed downloads, USD price, Featured flag,
output, source document hash and public examples. Product versions are separate,
dated observations in `skillry-editorial.json`; unknown versions stay null. English
product names remain primary; Chinese aliases are shown separately when precise.
Unchanged facts preserve the snapshot; pricing evidence renews at least every 30 days.
Only new interaction identities produce `artifacts/skillry-new-identities.sql`.
Before publication, use `supabase migration new` and apply that reviewed additive SQL;
never edit submission reviews or users' engagement to publish a provider entry.

The local thread heartbeat **Skillry 每周目录更新** checks weekly, tests changed data,
synchronizes GitHub and verifies the resulting production deployment. A failed check
retains the last good release. This heartbeat needs the configured Codex host and
connectors available; it is not a request-time application job.

At most eight source entries prefix the first page, followed by registry results
and remaining source entries. This keeps the mixed directory useful at larger scale.
Free/paid and Featured filters apply to both sources. Source download counts are
explicitly identified as Skillry's; repository metrics and our own votes are unchanged.
Public video sources attach only after a play click. Old slugs leave discovery when
removed or below the threshold, but archived details and saved interactions remain.

Independently edited details enter the sitemap. Brief automatically assembled entries
remain accessible with `noindex, follow`, their own canonical URL and related links
until they receive independent editorial content. This avoids indexing hundreds of
near-identical style summaries. Archived entries also remain outside the sitemap.

Skillry's public terms at https://skillry.dev/terms permit personal/internal business
use and commercial generated outputs subject to third-party rights, but restrict
package redistribution unless separate package terms expressly allow it. These are
link-only entries with original EN/ZH editorial copy. No source descriptions,
provider media or packages are mirrored; no Skill code is executed. Public preview URLs are embedded directly, labeled Source example · Skillry, and linked to the original product page.
Skillry is attributed as the publisher, not an identified individual author.

`external-outbound.ts` applies the owner-provided `via=openagentskill` parameter
to outbound Skillry links, including product deep links, while preserving clean
source evidence and our canonical detail URLs. Outbound links use `rel=sponsored`
with `noopener noreferrer`. This configuration adds no scripts, cookies or
database queries.

## Unified community interactions

`provider_skill_catalog` allowlists owner-curated slugs for interaction storage only. `provider_skill_engagement` stores each authenticated user’s vote and saved state with user-scoped RLS. It does not insert records into `skills`, alter review gates or modify repository voting foreign keys. Atomic upserts preserve votes when saving and saves when voting. Aggregate counts are server-only, cached for 60 seconds and requested in the existing page-level batch. Provider saves appear alongside registry bookmarks in the profile.
