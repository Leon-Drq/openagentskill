# External-platform Skill listings

External entries are owner-curated **link-only editorial records**, not GitHub
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
of automatic synchronization. The original Skill was not executed. No package,
template code, screenshots or creator media are mirrored on this site.

The RedSkill package README declares CC BY-NC 4.0 and separately mentions
share-alike. Preserve that discrepancy and the noncommercial restriction. Do not
claim MIT licensing, commercial permission, OSI approval or an author endorsement.
Do not republish code or create Gallery previews without addressing usage rights.

## Verification

`node --experimental-strip-types scripts/test-external-skills.mjs` is included in
the existing SEO regression suite. Also run the complete regression suite,
typecheck and production build. Check English/Chinese detail pages, directory
search, unknown slug 404, API read-only policy and the core sitemap after deployment.
