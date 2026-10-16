# Directory and alternatives rendering cost

## Scope and baseline

On 2026-10-16, the Vercel Production Functions dashboard (last 12 hours,
11:48–23:48 Asia/Shanghai) showed `/skills` at 40K invocations / about 3 CPU
hours, `/[locale]/[page]` at 28K / 2 hours and `/alternatives/[slug]` at 14K /
59 minutes. These are rounded route aggregates, not per-query attribution.

Direct GETs confirmed that `/skills` already HIT its existing public cache,
whereas `?sort=new`, `/zh/skills?sort=fresh`, `?page=2` and
`/zh/docs?lang=zh` returned private, no-store responses. This change addresses
those reusable browse responses rather than changing the directory UI.

## Finite browse cache

- The existing canonical directory cache remains separate and indexable.
- Six sorts, pages 1–10 and at most one facet (20 categories including motion,
  three access choices, featured or examples) share public ISR responses.
  There are at most 1,560 variants per locale / 12,480 across eight locales.
  They are generated only on demand, not during builds or by a warming cron.
- Variants use fixed, validated internal path keys and a 900-second freshness
  window. The public URL, canonical URL, query noindex policy, server-rendered
  cards, controls and original sorting semantics remain intact.
- Free text, compound filters, unknown inputs, duplicate content parameters
  and pages beyond 10 retain the existing dynamic renderer. This is a cache
  admission limit, not a browsing or search limit.
- Attribution and RSC parameters do not expand model keys. HTML and RSC keep
  Next's separate response representations; no manual shared-cache header is
  added to dynamic HTML or private routes.
- Existing `public-skill-directory` / `public-skill-stats` invalidation tags
  refresh browse data and dependent ISR pages. Owner publication already
  expires the directory tag. Background publication keeps its existing SWR
  behavior. An unhealthy model throws instead of replacing healthy snapshots.
- Redundant path-matching locale parameters on core pages get one finite
  noindex variant. Real queries still execute normally.

## Alternatives

A shared, compressed candidate projection replaces per-target quality/trust
analysis of up to 1,200 rows. Candidate evidence is calculated once per cache
refresh; each target still uses the original similarity formula and tie order.
Only ranking/display fields are retained, not full source documents. Its tag
is `public-skill-directory`, freshness 900 seconds. Metadata and page share
their target lookup. Missing targets avoid the candidate read entirely;
transient lookup/candidate failures do not become cached 404s or empty lists.

## Verification and rollback

Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, then against a
built server run `node scripts/check-browse-cache.mjs` with `BASE_URL` set to
that origin. The smoke verifies actual HITs, SSR/canonicals/robots, query and
language isolation, HTML/RSC separation, and genuine/internal 404s.
`REPORT_PATH` optionally saves the measured headers and response sizes.

Rollback the deployment or revert this change to restore request-time browse
rendering and the previous alternatives implementation. No schema, secrets,
firewall, payment, review state or CDN plan changes are needed.

Assess the net result over matched traffic windows: route CPU/invocations,
cache HIT ratio, ISR read/write units and total request volume. Cache hits
still incur CDN request/transfer usage; unrestricted searches still invoke
functions. No dollar saving or percentage is established by functional tests.
