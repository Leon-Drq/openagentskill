# Motion Studio — reference workflows and original starters

## Publication scope

`/studio/motion` and `/zh/studio/motion` introduce a first-party preview collection.
The source snapshot contains **233** public Prompt Motion entries, captured on
2026-10-12. All 233 have an independently authored workflow package and an
individual detail page. They are organized into **12** visual families. Each
package includes a `SKILL.md`, a JSON brief, a local renderer, subject-adaptation
notes, a parameter guide, and generated SVG/HTML sample outputs.

These are **starter workflows**, not 233 recreated reference films or 233
independently art-directed finished animations. Related workflows share an
original family study. Every page identifies this scope beside its preview.
True 3D, character narratives, factual explainers and footage-based productions
need subject-specific assets and production beyond the geometric starter.

The site has a searchable, paginated gallery, family filters, explicit sample
play/still/replay controls, downloadable sample outputs, related workflows,
creator/source attribution, and links to the original third-party Skill when
the source entry supplies one. The shared navigation and footer link to the
collection. Existing Skills directory layout and review states are unchanged.

## Source and ownership

The source gallery's footer says videos and prompts belong to their creators.
The research script fetches public HTML without executing scripts or downloading
remote media. Full research HTML remains in ignored local artifacts. The public
catalog stores reference titles, tags, author handles and links; original prompts,
videos, music and repository code are not redistributed or presented as ours.

OpenAgentSkill authored the starter renderer and workflow instructions. The
published SVG files are actual outputs of that renderer. The download is a
sample output, not the private Skill package. No user-submission API, owner
publication audit or review score is modified by these website pages. This is
a first-party preview release, not an AI-approved registry publication.

## Commercial state

Package access and payment remain disabled. No live Offer, paid inventory count,
purchase, entitlement or verified Agent installation is claimed. Membership
links point to the existing planned-pricing page; this release adds no price.
Full packages and their renderer source live in the ignored owner workspace
`artifacts/motion-studio-v1`, outside the public repository and web asset tree.
Selling access requires the separate payment and protected-delivery release
described in `docs/first-party-skill-commerce-proposal-2026-10-11.zh-CN.md`.

Only English and Chinese versions are published. They have reciprocal hreflang,
self-canonical URLs and 468 sitemap entries. Other languages retain the normal
fallback language behavior and do not advertise nonexistent translations.

## Verification

- `pnpm test:motion-studio`: catalog/source coverage, IDs, source hashes, filters,
  both language paths, canonical/hreflang/sitemap and 466 script-free SVG assets.
- Local package checks exercise the actual renderer, reproducibility, parameter
  validation, Unicode escaping and refusal to overwrite existing output folders.
- Browser checks cover the gallery and detail in English/Chinese at 320, 390,
  768 and 1440 pixels, search, filtering, pagination, playback and XML parsing of
  every published sample. Contact sheets inspect all visual families.
- HyperFrames checks inspect actual generated HTML. Its contrast/layout results
  have limited coverage inside vector graphics; visual review is also required.
- Repository regression tests, typecheck, link checks and production build must
  pass before deployment. Release evidence belongs in the final handoff.

## Local acceptance results

- All 233 packaged renderers executed independently; generated outputs match
  the published samples. All 233 Skill frontmatter validations passed.
- 699 sampled frame text-bound checks passed (1.5, 4 and 7.5 seconds per package).
- All 12 visual families passed HyperFrames 0.8.145 lint, runtime, layout and
  contrast checks with no findings after small-label contrast corrections.
- The 16 responsive browser checks and all 466 browser SVG parses passed.
- Full repository regression tests, typecheck, repository links and production
  build passed. ESLint reports no errors; 25 existing warnings remain.
- Owner archive: `artifacts/motion-studio-v1/openagentskill-motion-studio-1.0.0.zip`
  (3,249,391 bytes). SHA-256:
  `ed39ce93dd1c26f6f198a0284112893d7bd87dc02d66f31cfbe485cb1317389b`.
