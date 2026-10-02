# Small compute recovery and resource audit — 2026-10-02

The owner upgraded the existing Supabase compute instance from Micro to Small.
Live SQL confirmed `shared_buffers=512MB`, `max_connections=90`, working reads
and no waiting database locks at the initial check. This confirms recovery of
connections; it is not a claim about sustained CPU utilization or billing quotas.

## Changes and measured evidence

- Public exact-name searches previously combined an approved-only trigram index
  with a broad owner/static scan. A matching public-publication trigram index
  reduced the inspected `find-skills` query from 3,084 to 41 shared buffer
  accesses; the measured post-change execution was 0.743 ms. These are database
  plan samples, not end-to-end page speed guarantees.
- Full-text searches sometimes walked the quality index and filtered thousands
  of unrelated rows. `search_public_skills` materializes indexed matching IDs
  before the bounded quality sort, retains the public visibility predicate and
  runs as SECURITY INVOKER with a three-second statement timeout. A sample
  `video OR editing OR captions` request returned 120 rows with 3,961 buffer
  accesses and 24.263 ms execution, versus a prior 23,536-buffer plan.
- Exact slug/name reads now share five-minute caches independently. Failed
  siblings remain degraded and retry; successful siblings remain reusable.
  Wildcard-only input does not trigger a broad request. Database timeouts never
  replay the old search path; only a genuinely missing schema gets compatibility
  fallback. A public quality/star index supports the existing bounded directory.
- One sitemap generation obtains fresh count and editorial partition metadata,
  then bypasses older shard/count caches. A verified public backup contains
  8,409 canonical eligible URLs in nine shards, captured at
  `2026-10-02T13:49:55.221Z`. Failed source reads retain a complete checked
  generation. Search eligibility, canonical URLs, locales and original content
  dates are unchanged. Backup updates remain an explicit checked capture.
- The source-sync scheduler shares the existing eight-source default budget
  between claims, old indexed repositories and rotating discovery seeds. Manual
  sources retain priority, duplicates consume no slots, and independent source
  lookups run together. No increase in cron frequency or AI review budgets.
- Gallery aggregate vote counts share a 60-second cache, invalidated after a
  successful vote. Account state and personal votes stay outside that cache;
  the endpoint remains `private, no-store`. Failed reads never cache zeros.
- Bookmark reads/writes and account checks have bounded waits, visible failure
  states and explicit retries. Save retries use insert-if-absent, preserving the
  same intent after an ambiguous network failure. Internal navigation preserves
  the selected locale. Feedback tolerates blocked local storage, creates its
  anonymous ID only on submission, and recovers from rejected/timed-out fetches.
  Ownership submission and verification release their loading state on failure.
  Already verified ownership panels skip unnecessary account/claim reads.
- Three equivalent permissive public SELECT policies are combined into their
  original OR predicate. Bookmark ownership evaluates `auth.uid()` once per
  query. Visibility and ownership rules are unchanged. Two internal outcome
  refresh helpers no longer expose EXECUTE to anon/authenticated clients;
  server-side execution and existing triggers remain available.

## Validation and limits

The regression suite includes realistic outage/recovery tests for exact search,
cache isolation, fair scheduling, complete sitemap generation, feedback, account
checks and idempotent save retries. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`,
`pnpm test:links` and `pnpm build`. Release verification also checks desktop and
mobile directory interactions, skill pages, install API consistency, canonical,
robots, H1, metadata, JSON-LD, locale alternates and sitemap shards.

The security adviser still flags intentionally server-only RLS tables and
SECURITY DEFINER automation RPCs. The latter use the existing server-secret
checks or explicit public feedback contracts; removing their grants wholesale
would break the authorized automation paths. Never fabricate review approvals
or outcome scores to clear warnings. No publication or review state was changed.

The adviser reports leaked-password protection disabled. The connected tools do
not expose Auth configuration writes; enable it in Supabase Auth settings if
password sign-in is offered. The old billing/grace-period banner is independent
of compute size and must be verified in the organization's billing dashboard.
No billing or Auth configuration change is claimed by this release.

The adviser also lists unused indexes and several noncritical foreign-key
indexes. These flags are candidates, not evidence that removing or adding every
index improves this workload. Recently installed catalog indexes in particular
need observation after deployment. No speculative index removal was performed.

Migrations are additive indexes/RPC and equivalent policy/grant changes. Local
filenames match the actual versions recorded by Supabase's migration API.
Application rollback remains possible; the new search RPC is backward compatible
and no user data was rewritten.
