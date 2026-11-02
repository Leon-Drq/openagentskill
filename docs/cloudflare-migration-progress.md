# Cloudflare migration execution

Source: `5bd3323`, branch `codex/cloudflare-migration`. Started 2026-11-02.

This branch prepares a read-only Cloudflare staging deployment. Production DNS,
Vercel deployments, billing, cron schedules, database and authentication remain
unchanged until the corresponding cutover checks pass. This is not a completed
production migration.

## Resources and build

- Account: `113e589daada01e37bfd43cfb4763aab`.
- Worker target: `openagentskill-migration`, no custom domain attached.
- D1 cache metadata database created: `openagentskill-migration-tags`, ID
  `5edf8538-ca0a-44b3-ba6b-2ce8c26e000c`. This contains cache invalidation metadata,
  not migrated business records.
- R2 target: `openagentskill-migration-cache`. Requires account activation before
  creation. ISR uses R2, a Durable Object queue and D1 tag invalidation.
- Next.js 16.3.5 and OpenNext 1.20.15. The installed adapter implements experimental
  Node middleware/proxy support; routing must be tested in workerd before cutover.
- Linux CI builds the Worker, runs regression checks and exports the tested
  artifact. Windows OpenNext packaging encounters copied symlink access errors.
- `pnpm cf:build` uses the same maintenance flags as the staging Worker, so static
  pages and runtime routes agree about the database outage.
- `pnpm cf:preview` starts the Workers runtime with local resource emulation.
- `pnpm cf:deploy:staging` targets staging only. No production deploy script or
  domain binding is enabled in this branch yet.

## Isolation

Preview blocks non-GET/HEAD requests and account, auth and API routes, excludes
search indexing, and has no cron triggers. It does not receive production secrets.
The scheduled handler preserves all twenty existing UTC schedules but activation
requires stopping the Vercel scheduler first. Failed cron requests are surfaced;
the dispatcher does not add retries to payment/publication side effects.

The apex must retain its existing 308 redirect to `www.openagentskill.com`, with
the path and query intact. Existing TXT and CAA records must survive DNS transfer.
The current authoritative nameservers are Vercel nameservers; none are changed.

## Pending before production

1. Workers Paid and R2 activation; the owner is adding a payment method.
2. Linux build and real Worker routing/cache validation, including proxy rewrites,
   localized maintenance responses, static assets, SSR and cache invalidation.
3. Transfer server configuration securely. Vercel connector lacks environment-read
   permission; the already-authenticated CLI can list production configuration.
   Do not put secrets into artifacts, logs or Git. `.env.owner.local` is not an
   infrastructure export; retain the owner publishing authorization boundary.
4. Move Vercel Blob card caching to R2, replace Vercel-only analytics, and configure
   an explicit AI provider before retiring the Vercel AI Gateway dependency.
5. Full Supabase replacement requires a lawful complete export: public data, auth
   identities/password verifiers and private Storage objects. Its normal Data API
   currently returns HTTP 402. Do not bypass provider restrictions with privileged
   SQL, remove spending limits or mistake the partial saved directory for a backup.
6. Port and validate database/auth/payment semantics, reconcile row/object counts,
   checksums, relationships and ownership. Existing PostgreSQL RPCs, RLS and
   transactions cannot be copied unchanged into SQLite/D1.
7. Validate login, orders, webhook deduplication, private downloads and owner
   publication using isolated test data. Record a consistent final export and
   single-writer cutover; do not resume two writers during rollback.
8. Activate DNS and TLS, then the replacement scheduler. Verify actual custom-domain
   responses and business flows before removing Vercel or the source database.

References: [OpenNext setup](https://opennext.js.org/cloudflare/get-started),
[caching](https://opennext.js.org/cloudflare/caching),
[custom Workers](https://opennext.js.org/cloudflare/howtos/custom-worker).
