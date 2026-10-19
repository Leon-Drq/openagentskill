# Skill action layout and directory recovery

## Changes

- Detail hero actions use separate primary (agent copy, example, GitHub) and
  secondary (votes, save, share) rows. Copy labels reserve both state widths;
  success does not add a visible paragraph or move the controls. Failure still
  exposes the explanation and manual copy field.
- Skills route error boundaries retain the shared header/footer and localized
  recovery UI. Next 16.3 `retry()` re-fetches the server tree without changing
  filters, language or URL. The existing 60-second cooldown and single automatic
  retry remain; no polling loop or additional healthy-page requests are added.
- A cold ISR request with neither live data nor a last-good cached page still
  returns a real HTTP 500. Route recovery UI covers client navigation and
  request-time rendering, not every cold ISR failure. A production-mode fault
  test confirms no empty catalog is cached and the same URL recovers to 200
  with 16 real rows after the outage ends. This repair does not promise that a
  total database outage can never cause a 500 response.
- The public directory view materializes eligible source identity keys and
  duplicate IDs once per query. The old ordered plan compared each page row
  against a materialized full directory. The view remains `security_invoker`;
  RLS, public approval gates, MCP exclusions, case-sensitive paths, nullable
  source identities and oldest-source canonical IDs remain unchanged.
- ISR still rejects degraded data. A failed refresh cannot cache an empty or
  curated fallback as the complete catalog or replace a last-good page.

## Evidence and validation

- A production request to `/skills?lang=en&sort=new` returned 500 with the log
  `Public directory data unavailable; do not cache the fallback`. Read failures
  and statement timeouts preceded the renderer failure. Later probes recovered
  before this release, confirming the outage was intermittent.
- Before applying the view migration, an exact two-way ID comparison found
  **35,779** canonical public database rows in both definitions, **0 differences**.
  These are database-directory rows, not the site's combined provider count.
- Read-only Postgres fixtures cover duplicate casing, distinct paths, null
  paths/repos/timestamps, tied timestamps, rejected/pending and MCP-only rows.
  Run `node scripts/test-directory-resilience.mjs --sql` to print the fixture.
- Anonymous-role queries with RLS enabled succeed under a 3-second statement
  budget after migration. Warm probes are subsecond, but they are not a load
  test or evidence of a guaranteed percentage cost saving.
- Full regression suite, typecheck, scoped lint and production build pass.
  The build retains existing optional agent-summary timeout and missing local
  privileged-key warnings; these are not hidden by the directory repair.
- Local browser fault injection (not shipped) confirms the localized boundary
  and successful retry to 16 real cards at the unchanged Chinese page-9 URL.
- Existing URL structure, canonicals, metadata, publication state and review
  scores are untouched. This does not guarantee future search rankings.

## Deployment and recovery

Migration `20261019134149_directory_rls_safe_deduplication` is applied to the
existing production project. It only replaces the view, with bounded lock and
statement timeouts; it does not rewrite records or persist a catalog snapshot.
Its local filename matches the recorded managed-migration version.

If a query-plan regression is found, restore the previous view definition from
the view section of `20261018143659_skill_product_metadata.sql` in a new reviewed
migration. Do not change review states, weaken RLS, or purge all site caches.
