# Cloudflare migration execution

Source: `5bd3323`, branch `codex/cloudflare-migration`. Started 2026-11-02.

This branch prepares a read-only Cloudflare staging deployment. Production DNS,
Vercel deployments, billing, cron schedules, database and authentication remain
unchanged until the corresponding cutover checks pass. This is not a completed
production migration.

## Resources and build

- Account: `113e589daada01e37bfd43cfb4763aab`.
- Read-only staging: https://openagentskill-migration.qudongqi2023.workers.dev.
  Commit `7ef7c69`, Worker version `104c276b-1e7d-41a0-9054-64f519f060c0`.
  No custom domain attached. All 11 remote routing/isolation checks pass; the
  actual homepage also loads in Chrome.
- D1 cache metadata database created: `openagentskill-migration-tags`, ID
  `5edf8538-ca0a-44b3-ba6b-2ce8c26e000c`. This contains cache invalidation metadata,
  not migrated business records.
- Workers Paid and R2 are activated. Four private R2 buckets are created:
  `openagentskill-migration-cache`, `openagentskill-migration-images`, and
  `openagentskill-migration-packages` and `openagentskill-migration-backups`.
  ISR uses R2, a Durable Object queue and D1 tag invalidation. The package and
  backup buckets have no public URL or custom domain.
- Next.js 16.4.3 and OpenNext 1.20.15. Next.js was upgraded from 16.3.5 to meet
  the adapter's patched-version requirement and the October security advisory.
  The installed adapter implements experimental
  Node middleware/proxy support; routing must be tested in workerd before cutover.
- Linux CI builds the Worker, runs regression checks and exports the tested
  artifact. Windows OpenNext packaging encounters copied symlink access errors.
- `pnpm cf:build` uses the same maintenance flags as the staging Worker, so static
  pages and runtime routes agree about the database outage.
- `pnpm cf:preview` starts the Workers runtime with local resource emulation.
- `pnpm cf:deploy:staging` targets staging only. No production deploy script or
  domain binding is enabled in this branch yet.
- Cloudflare Web Analytics is configured for `www.openagentskill.com`, site
  `34d914c5fab84e9f9062a600df2f7943`. The public beacon token is in `wrangler.jsonc`;
  the layout follows the dashboard's module-script snippet. Staging still omits
  the beacon, so validation traffic does not enter production visitor statistics.
- Four new, independent migration secrets are installed in the Worker secret
  store: cron, indexer, indexer trigger and private-download signing. Values are
  excluded from Git/logs. Existing Vercel credentials are unchanged. These do not
  authorize old PostgreSQL RPCs, whose expected hash must be handled as part of
  the replacement data layer. Schedules and writes remain disabled.
- A separate GitHub fine-grained token is installed as `GITHUB_TOKEN`. It has
  public-repository read-only access and no additional account permissions,
  expires 2027-11-02, and passed repository and code-search API checks. The
  existing deployment/production GitHub credentials are unchanged. The local
  copy and other recovered/generated credentials use Windows user encryption.
- Cache lifecycle rules expire ISR cache objects after 30 days and generated
  image cache objects after seven days. Packages and source backups have no
  expiry rule. The existing incomplete-upload cleanup rules are preserved.

## Isolation

Preview blocks non-GET/HEAD requests and account, auth and API routes, excludes
search indexing, and has no cron triggers. It does not receive production secrets.
The scheduled handler preserves all twenty existing UTC schedules but activation
requires stopping the Vercel scheduler first. Failed cron requests are surfaced;
the dispatcher does not add retries to payment/publication side effects.

The apex must retain its existing 308 redirect to `www.openagentskill.com`, with
the path and query intact. Existing TXT and CAA records must survive DNS transfer.
The current authoritative nameservers are Vercel nameservers; none are changed.
The Cloudflare Free zone is prepared with the scanned DNS records, all DNS-only.
Assigned nameservers are `anastasia.ns.cloudflare.com` and `rob.ns.cloudflare.com`.
Activation and replacing scanned IP records with verified final targets remain pending.

## Verified migration rehearsal

- Linux run `41451477946` for commit `7ef7c69` passed lint, typecheck, links, the
  complete regression suite, Cloudflare tests, build, packaging and all 11
  workerd runtime cases. The smoke harness uses `localhost`: NextURL normalizes
  loopback IPs to that hostname, otherwise OpenNext interprets rewrites as external.
- Run `41455988910` for `74a5f17` also passed the full application checks and 14
  workerd cases, including localized account isolation. PR dependency review
  separately found vulnerable transitive glob/undici versions in the migration
  tools. Same-major patched versions are now pinned by narrow pnpm overrides:
  glob 10.5.0, undici 6.29.1/7.30.1. Dependency review passed for `c63c8bf` and
  `7a2ed1c`; the next deployed artifact must still pass its complete build checks.
- Compatibility date is `2026-10-01`, supported by the installed workerd binary.
- All 234 private release files have been recovered from existing local archives
  and SHA-256/size matched to the exported release records. Three Skill text files
  were reconstructed using the original publisher's formatting and archived
  instructions/licenses. Total payload is 209,925 bytes. No release, publication
  or review record was changed. All 234 R2 objects were downloaded again and
  matched byte-for-byte by SHA-256 and size (234/234).
- The existing authorized source ZIP (232,762,936 bytes) is also stored in the
  private backup bucket. A full remote download matched SHA-256
  `2ac7d596d5f2d863a243d053e36a056af542e07b855f44f2521bfbe7c1b32432`.
- A local lossless SQLite rehearsal imported 86 tables and 1,480,974 records;
  per-table semantic hashes match after reading every value back. SQLite integrity
  is `ok`, 86 primary keys, 35 unique constraints and 73 foreign keys were checked,
  with zero orphan groups. The resulting file is 866,000,896 bytes. This preserves
  archive strings exactly; it is NOT the application D1 schema or a completed
  authentication migration. 127 PostgreSQL checks and application behavior still
  require explicit implementation. Private data and reports remain ignored.
- Uploading OpenNext's intermediate Linux output directly from Windows exposed
  absolute binary paths. CI now packages the already-validated Wrangler bundle,
  allowing deployment without rebundling Linux intermediate paths on Windows.
- The paid-file adapter uses a private R2 binding, validates immutable release
  paths and checks actual byte counts and SHA-256 before delivery. JSON download
  clients receive a 60-second first-party grant bound to their account. Using
  the grant checks login and current payment again; it cannot survive a refund
  or be transferred to another account. Only an actual verified file transfer
  records a download. These changes pass local payment/download regression tests
  and await the next Linux build/deployment.
- Payment mode validation no longer depends on Vercel's environment marker:
  Cloudflare defaults to live keys only. Test keys require explicit sandbox mode
  and an isolated migration/QA workers.dev commerce origin; live keys are refused
  in that sandbox mode. No live charge is created by migration tests.
- Project-scoped credential discovery checked 38 local configuration/setup files
  across the existing worktrees. Windows-encrypted database and Stripe sandbox
  credentials were recovered without printing values. The sandbox key returns
  the expected QA account. No production Stripe key was found; the authenticated
  Vercel export contains `[SENSITIVE]` placeholders. The browser's existing Google
  session and owner MFA completed Stripe login. The correct production merchant
  is selected and a dedicated restricted key is prepared with checkout/customer/
  portal write access and payment/invoice/price/subscription read access. Stripe
  additionally requires an authenticator check for key creation, after its email
  verification. That second check is pending; no production key has been created
  or installed yet and the existing Vercel key is unchanged.
- Cloudflare inference uses the fixed Workers AI model
  `@cf/deepseek-ai/deepseek-v4-flash-0731`, without a Vercel Gateway fallback.
  Official pricing checked November 2 is $0.44/M input and $1.32/M output,
  below the existing conservative reservation envelope. Provider-specific cache
  keys, durable reservation-before-call, 2048 output tokens, 30-second abort,
  no retries, bounded responses and rejection of incomplete output are tested.
  Two synthetic API probes used 20 input and 62 output tokens in total. The
  first 32-token cap truncated; the bounded follow-up returned the exact requested
  text with a normal stop. No source/user data was sent. Staging keeps
  `WORKERS_AI_ENABLED=0`; business inference still requires the replacement ledger.
- The normal source Data API still returns 402 with the recovered server key.
  The shared Supabase organization's billing cycle is October 10–November 10;
  its spending cap remains on. Five projects share the integration, so do not
  cancel the organization or Vercel Marketplace integration as a site cleanup.

## Pending before production

1. Build/deploy the private R2 delivery adapter, then validate against isolated
   test accounts and payment data once the replacement data/auth layer is ready.
2. Complete cache invalidation and business-flow validation. Public routing,
   localized maintenance responses, static assets and isolation already pass
   at the actual staging URL.
3. Transfer server configuration securely. Vercel connector lacks environment-read
   permission; the CLI export redacts production secrets. Recover original
   credentials or provision dedicated replacement credentials at each provider.
   Do not put secrets into artifacts, logs or Git. `.env.owner.local` is not an
   infrastructure export; retain the owner publishing authorization boundary.
4. R2 card-cache adapter is implemented with expiry, size and abort checks; the
   Vercel speed-insights component is removed from this branch. Bind the isolated
   image bucket and test it before production. Workers AI is implemented and
   the account/model API is verified; validate the native binding and durable
   business ledger before enabling actual reviews.
5. A prior authorized export was found locally at
   `artifacts/database-export-2026-10-30` in the original checkout. Its source ZIP
   SHA-256 matches the recorded checksum. A fresh read-only local inspection
   verified all 209 chunks, 86 tables and 1,480,974 rows against byte counts,
   SHA-256, row counts and source row hashes. It includes 36,123 skills, 70 users
   and six orders. Raw JSONL size is 774,459,426 bytes. No row exceeds D1's 2 MB
   value-byte limit; one row requires bound-parameter import because an inline
   SQL INSERT would exceed 100 KB. Maximum column count is 66 (D1 limit 100).
   This is an October 30 per-table archive, not a current transaction snapshot.
   It includes 234 Storage metadata records but no file payloads. Keep all private
   archives outside Git and build artifacts. The normal source Data API still
   returns HTTP 402. Final reconciliation and file transfer need service recovery
   or an approved backup path; do not bypass provider restrictions or remove limits.
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
