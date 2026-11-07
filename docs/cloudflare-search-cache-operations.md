# Search and cache cost controls

Public content uses a four-hour on-demand revalidation window. Private account,
commerce and installation responses retain their existing no-store policies.

## Name search

`0011_search_cost.sql` adds an external-content FTS5 trigram index over names.
The D1 read adapter uses it only for a positive top-level name `ilike` filter
containing a literal run of at least three Unicode characters. The original
LIKE predicate remains authoritative, including escaping and ASCII case rules.
Short patterns, nested OR and negated filters retain the existing semantics.
Candidate rowids are looked up directly; results are sorted and paginated only
after all publication and caller filters have been applied. Count and page use
the same predicates. Full-text search ranking is unchanged.

The migration also limits full-text index updates to changed indexed text.
Counters, scores and identical ingestion upserts no longer rewrite that index.
Insert/delete/text changes remain transactional with both indexes.

Run `pnpm test:cloudflare-business` and
`node scripts/check-cloudflare-business-runtime.mjs`. The shared checks compare
18 patterns against the original SQL, verify query plans and publication
filtering, and exercise updates/deletes and external-content integrity checks.

## Cached page delivery

OpenNext cache interception serves ISR hits before loading the Next page
renderer. R2 remains the shared cache and D1 remains the authoritative tag
store; this does not add another edge cache with separate invalidation rules.
Expired entries keep the existing deduplicating Durable Object queue.

Linux CI builds and previews the actual Worker, then checks HTML and Flight
responses, language routes, HEAD, preview-cookie bypass, private/mutation route
isolation and immediate tag expiry against local R2 and D1. The invalidation
test writes only to the isolated local tag store; no test endpoint is deployed.

## Rollout and rollback

1. Pass regression, typecheck, production build and native runtime checks.
2. Record the production D1 Time Travel bookmark. Apply **only** the new
   migration before deploying code that reads `skills_name_fts`. The initial
   migration imported some historical schemas without recording them in
   `d1_migrations`; do not replay all pending historical migration files.
3. Compare old and new SQL on a fixed production read-only query set. Verify
   identical ordered results and counts, and record D1 `meta.rows_read` and
   query duration. Do not publish account billing data in repository reports.
4. Deploy the tested commit; verify live search, pages, languages, sitemap,
   canonical URLs, private responses and `x-opennext-cache` hits.

An application rollback may leave the additive name index in place: the prior
code remains compatible. To remove it, first deploy code that no longer refers
to it, then use a separate reviewed migration. Never restore the entire live
database merely to roll back this index; that could discard later user writes.
Cache interception can be disabled independently in `open-next.config.ts`.

Measure CPU time, R2 writes and D1 rows per request over comparable complete
traffic windows. Longer TTL and a faster query plan are verified mechanisms,
not proof of a particular monthly savings percentage. Do not disable indexing,
payment integrity or public search recall to meet a billing target.
