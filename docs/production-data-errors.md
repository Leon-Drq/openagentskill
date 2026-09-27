# Production data errors: 2026-09-27

Based on production `b6db6a3` (the already deployed public-page CPU optimization).

## Causes and fixes

`/api/events/skill` used the anonymous database role, as intended. Its INSERT
policy, however, accepted only `ai_review_approved = true`. Public skills also
include `owner_published` and `static_checked` listings, whose legitimate web
events were rejected with SQLSTATE 42501 and returned as HTTP 503.

Migration `20260927145729_align_public_skill_events.sql` aligns that policy with
the existing public listing predicate. It preserves the event allowlist,
`is_verified = false`, user binding, private raw events and existing skills RLS.
No review, approval, score, publication state, table grant or service-role access
is changed. The migration version matches the applied Supabase migration ledger.

The API still uses the anonymous RLS-checked client, canonicalizes known aliases,
bounds writes to a 3-second fetch deadline in their own circuit, does not retry
writes, and maps unavailable/private targets to 404 instead of a retryable 503.
Actual database/network failures return an uncached 503 with `Retry-After: 15`.

Post-deployment smoke also exposed a URL/database alias mismatch: the canonical
URL `last30days-skill` is stored under `mvanhorn-last30days-skill`. Known alias
families now resolve the existing public database slug before writing an event,
preferring the canonical slug when it exists. This uses the same anonymous RLS
client, without changing any skill records. Ordinary slugs still require only
one write; failed lookups never produce writes or cached false 404s.

The shared fetch circuit also allowed three slow optional/bulk reads to block
critical skill lookups and exact searches in the same warm function. Fixed
workload scopes now isolate bulk reads, single-skill lookups, exact search,
telemetry and privileged operations. Each still opens after three failures and
permits one recovery probe after 15 seconds. Caller cancellation is not counted
as a database outage; late in-flight responses cannot override a newer circuit
generation. No automatic retry loop or unbounded per-query circuit map is added.

True database outages can still return temporary errors on cold cache misses.
Existing success-only data caching and full-page ISR protections remain intact:
errors must not turn into cached false 404s or empty directories.

## Verification

- Full `pnpm test`, typecheck, lint and repository link checks.
- Circuit tests reproduce bulk-read failures while critical reads/writes remain
  available, plus timeout, cancellation, recovery-probe and late-response races.
- API tests cover validation, forced unverified payloads, aliases, RLS denials,
  network/database errors and no write retries.
- `supabase/tests/public_skill_events.sql` runs real anon/authenticated INSERT
  allow/deny checks and raw-event privacy checks in a rolled-back transaction.
- The production database policy test passed; security advisors introduced no
  new findings compared with the pre-migration baseline.
- Production build and `scripts/check-public-cache.mjs` validate that the prior
  CPU optimization still serves actual cached directory cards and keeps query
  responses isolated. A cold build with a database outage is expected to fail
  its existing empty-directory guard, not publish fallback content.

## Rollout

Apply the backwards-compatible policy migration first, then deploy the tested
application through the normal main-branch Vercel pipeline. Verify the deployed
commit, public cache smoke, previously failing detail/search paths and tagged
event writes; remove only those tagged smoke events after verification.

Rollback the application with the previous deployment if necessary. The policy
fix is compatible with that deployment and can remain in place; it does not
require rolling back publication data or changing AI review decisions.
