# Automatic Skill media rollout — 2026-10-07

Published Skill identities now feed a daily media discovery queue. New entries
from the existing automatic indexer, submissions and owner publishing paths are
picked up without adding repositories to a manual source list. This release
changes media collection and presentation, not Skill approval or execution state.

## Backfill evidence

The complete public feed contained 34,681 identities. The final priority refresh
checked 360 due entries, concentrating on presentations and image generation.
It added **50 Skills with 128 previews**: 34 presentation, 15 image-generation,
and one design entry. The previews comprise 117 images and 11 animation posters.
Every asset has its exact repository, immutable revision, source path, license,
SHA-256 and original-file link. No generated illustration substitutes for an
unavailable author example.

The final 360-entry run recorded:

| Result | Entries | Meaning |
| --- | ---: | --- |
| Collected | 50 | Usable author media materialized locally |
| Not found | 231 | No suitable media in the scanned exact documents |
| Needs media review | 50 | Source association or reuse license remains unresolved |
| Error | 29 | Source fetch or resolution failed; retained in the retry queue |

These are media collection outcomes, separate from submission reviews. Absence
is not evidence that the author has no examples. Remaining categories and older
records continue through subsequent batches. Unsupported external sources and
ambiguous licenses stay visible in diagnostics instead of being misrepresented.

## Continuous operation

The existing `Daily Gallery sync` workflow runs at 01:23 UTC. Its default media
batch is 150 due records, reserving capacity for recent listings and retries.
Every generated commit passes the existing CI publication gate and an exact-SHA
production check. Authentication failures abort publication and preserve the
previous manifest. Individual errors retry the next day; missing/unresolved
sources retry after seven days; collected sources refresh after 30 days.

Media references stay server-rendered. Images have alt text, dimensions,
compressed card/detail variants and source attribution. Videos load on click.
Documentation illustrations are labeled separately and do not qualify for the
`With examples` filter. Original Skill URLs, canonical tags and indexing rules
are unchanged.

Large example sets use a POST membership query before SQL counting, sorting and
pagination. Migration `20261007040955_skill_media_directory_lookup.sql` was
applied before app deployment; the function uses invoker privileges against the
existing public directory view. A live anonymous request with 5,002 membership
values returned the expected exact count and second-page result.

## Validation

- Full repository regression suite, typecheck, lint and repository-link checks.
  Lint reports 25 existing warnings and no errors.
- Real image decoding plus native ffmpeg video, PDF and embedded-PPTX cover
  decoding using self-contained test fixtures. The initial backfill itself adds
  images/GIF posters; decoder support is not a claim of new PDF/video examples.
- Coverage audit over all 34,681 public identities, with 1,106 configured local
  media assets checked and zero local media failures. Remote assets were not
  re-probed in this local check; the existing daily remote audit remains enabled.
- Visual inspection of all 128 new previews. Brand marks, sponsor art and blank
  frames removed; desktop and 390px phone rendering checked.
- Server HTML comparison of the 50 affected detail pages against pre-release
  production metadata, plus feed pagination and example-filter checks.
- Production build, required GitHub CI and post-deploy exact-commit verification
  are required before reporting this rollout complete.

Implementation and operator commands: [Skill preview operations](./skill-previews.md).
Local verification logs and raw collection reports are retained under ignored
`artifacts/`; scheduled reports are retained as GitHub Actions artifacts.
