# Retired external media listing

The scheduled [media health run](https://github.com/Leon-Drq/openagentskill/actions/runs/42359158607)
checked 3,120 assets: 3,116 passed and four Skillry image variants returned 404.
All failures belonged to `bs-grammarly-style-og` (one card and three detail images).

On November 7, the public Skillry catalog contained 619 entries and omitted this
one previously active listing. Its detail page returned HTTP 451. No reason beyond
that source response is inferred, and no replacement images or packages were fetched.
The complete directory document SHA-256 was
`2dbd5c4eb9f5b2c2b3dec2313696aada0f165d716056614b5faa1c6e90af755e`.

Move only that existing record into the snapshot archive, preserving its original
observation date, identity and evidence. Do not update the source-wide count or
import the rest of the new catalog: the public terms hash differs from the approved
policy, and the existing synchronization guard remains in place pending review.

Archived records retain their URL and saved interactions. Their detail pages show
an English/Chinese archive notice and directory link, with no acquisition prompt,
media embed or source social image. Discovery records expose `active: false`, no
acquisition URL, no video and no examples. Cards expose no preview or current offer.
Existing discovery and sitemap filters exclude archived records; details remain
`noindex, follow` with the original canonical URL.

The health workflow stays enabled and fails on any broken published asset. Its
summary now reports archived external entries separately. Retiring the listing
removes media from publication, rather than exempting a still-published broken URL.

Validation: external catalog and provider tests exercise archive rendering in both
languages, metadata, API output, search exclusion and saved-card conversion. Run
the full regression suite, lint, typecheck, production build and remote media audit
before publication; verify the archived route and API again after deployment.
