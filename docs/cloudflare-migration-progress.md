# Cloudflare migration execution

Source: `5bd3323`, branch `codex/cloudflare-migration`. Started 2026-11-02.

Production now serves from Cloudflare Workers, D1 and private R2. The earlier
sections below are historical migration notes, not the current activation state.

## Production cutover — November 3, 2026 (Asia/Shanghai)

- Both `www.openagentskill.com` and `openagentskill.com` are Worker custom
  domains. The apex preserves paths and queries with a 308 redirect to `www`.
  HTTPS, Google verification, mail DNS and existing canonical URLs are retained.
  The workers.dev endpoint and preview URLs are disabled in production.
- Application commit `77d3ebad8f65e6fada393e49c29c483e253515f1` passed the complete
  Linux validation workflow, including lint, typecheck, regressions, native
  workerd/D1 authentication and business tests, production build and route smoke.
  Accepted Worker version: `50ae4858-27b4-4640-8d13-f65fd8e154ea`.
- The source was frozen at the database level across 49 tables. The final
  lossless snapshot matches every source table's count and row checksum:
  1,481,925 rows including 1,481,551 business rows across 46 tables, 70 auth users,
  70 login methods and 234 storage objects. Three skills whose contents changed
  without an updated timestamp were found by per-row checksums and reconciled.
- All final changed D1 rows were read back field by field. Foreign-key checks
  report zero violations, integrity is `ok`, FTS integrity passes and all 39
  application triggers are restored. Authentication reconciliation preserves
  legitimate QA sessions/provider updates and the most recent update timestamp.
  Historical review and publication audit states were not changed.
- The final source snapshot is privately archived in R2 and was downloaded in
  full to verify SHA-256 `ea3237668d68d0f26c57702771f93b6ffd21fbcb28e3df0bdab3f33801ea17ca`.
  Private export data and credentials remain outside Git and build artifacts.
  All 234 package objects had already passed content-hash verification in R2.
- Real GitHub login succeeds on the production domain with the existing account,
  saved skill and claimed skills. Existing purchase history loads from D1.
  A live $9.99 checkout opened successfully and was explicitly expired unpaid;
  the real Stripe expiry webhook updated D1 successfully. No charge was made.
  Successful-payment/refund handling was tested with isolated fixtures.
- Thirteen production HTTP checks, four static assets and the canonical redirect
  pass using normal DNS. SEO checks pass on 12 page variants and four sitemap
  files, retaining nine skill sitemap shards, canonical/hreflang metadata,
  structured data and the intended indexability. Search rankings are not a
  release assertion. A 235-event runtime sample had no exceptions or HTTP 5xx.
- Cloudflare has the 20 existing schedule expressions enabled. Vercel cron is
  disabled and its Git connection is removed, preventing duplicate scheduling
  and new Vercel builds.

### Remaining account-level cleanup

- Vercel's project-pause command requires a human confirmation and rejected
  non-interactive confirmation. The owner has been asked to pause the old
  `openagentskill` project; do not describe it as paused until verified.
- The old Supabase project remains frozen as a rollback source. Its paid plan
  cannot be paused, and its organization contains other projects. Deletion needs
  the owner's explicit decision; idle compute charges may continue until then.
  Do not cancel the shared organization or restore its Spend Cap blindly.
- Cloudflare's GitHub integration installation is prepared for only this
  repository but still awaits the requested permission confirmation. Manual
  production deployment works via `pnpm cf:build` and
  `pnpm cf:deploy:production`; validation runs on both main and the migration
  branch. Do not claim automatic deployments are connected yet.
- After this cutover, D1 is authoritative. Roll back application code against
  the current D1 data if needed. Returning traffic to the frozen PostgreSQL
  source requires reconciling post-cutover writes first.

On November 3 (Asia/Shanghai), the owner explicitly selected D1 for the full
database migration after evaluating a PostgreSQL/Neon alternative. See
`docs/database-migration-decision.md` for pricing assumptions and the new gated
authentication implementation. Neon is not being provisioned.

## Existing production service restored — November 3 (Asia/Shanghai)

- The owner explicitly authorized temporarily disabling the shared Supabase
  organization's Spend Cap to restore the existing site. The billing UI confirms
  it is disabled. Normal source Data API reads recovered to HTTP 200 at
  2026-11-02T16:31Z. Revisit the temporary billing exception after migration or
  quota renewal; do not assume a fixed overage bill or automatically re-enable a
  cap while the source still needs above-quota service.
- Removed only the Production `SUPABASE_DATA_PAUSED` environment variable and
  rebuilt the existing production commit `5bd3323265dd049a15b3d4689e2d782fb010e004`.
  Deployment `dpl_9ZwKG7sQKXN55gTvWBS8rw9gtk9G` is READY and serves the real
  custom domain. The Cloudflare staging isolation flags remain unchanged.
- Twelve production checks passed: home, directory, English/Chinese searches,
  a live database skill detail, login/membership pages, exact registry lookup,
  purchase readiness and anonymous/signature protections. GitHub login completed
  with `connected=github`; the private workspace, saved skills and existing
  purchase records loaded in the browser. No live payment was initiated.
- The exact production commit already passed full CI; the new deployment build
  also passed. Targeted maintenance, payments and download regressions passed.
  A bounded error/fatal log query for the new deployment returned no groups.
  This is point-in-time recovery evidence, not a long-term cost measurement.
- The October 30 migration archive is still historical. Production writes have
  resumed on Supabase, so a fresh consistent export and final reconciliation are
  required before D1 becomes authoritative. Keep the single-writer cutover gate.

## Resources and build

### D1 business import and account integration — November 3 (Asia/Shanghai)

- The October 30 business archive is imported into the isolated APP_DB: 46
  business tables and 1,479,842 rows. Every table was read back in full and its
  typed semantic SHA-256 matched the local rehearsal. Foreign-key check is empty
  and quick integrity check is `ok`. This remains historical data; it is not the
  final production snapshot.
- Catalog migration 0004 is applied remotely. Eligibility has 36,104 members;
  deduplicated published directory has 36,098 rows. Search index integrity passes
  and the same `video` query matches 1,593 rows locally and remotely. Private
  inspection files and data exports remain ignored and outside build artifacts.
- Account browser/server integration now uses validated Better Auth cookies and
  first-party endpoints on the Cloudflare path. Own profile edits, bookmarks,
  votes and session renewal are implemented. Stable public handles and verified
  GitHub/X identities cannot be changed by profile edits. Profile creation is
  attached to new auth users by migration 0005.
- Private D1 service transport supports commerce reads/writes and the existing
  order transaction implementation. The actual payment webhook processor was
  tested with isolated D1 data and mocked Stripe responses: duplicate delivery,
  payment completion, refunds and delayed-success protection pass. No real
  purchase or charge was made.
- Native workerd/D1 checks pass for catalog authorization/search plus actual
  signed login, profile save, vote, bookmark, payment reservation/completion and
  session renewal. Full Cloudflare regressions and TypeScript validation pass.
- Activation flags remain disabled. Signup email delivery, final source data
  reconciliation, remaining background/publication transactions and full deployed
  business-flow checks must be completed before production DNS moves. Passing
  isolated tests is not evidence of a completed production migration.
- Telemetry migration 0006 ports atomic browser-event aggregates and the download
  receipt ledger. Corrections, deletions, UTC day boundaries, failed-batch rollback
  and execution receipt uniqueness are covered by real SQLite and native D1
  checks. Migration 0007 ports feedback aggregates, source quality scoring,
  publication counters and immutable owner-publication history. Public feedback
  can award only the existing author's fixed reward; callers cannot select the
  recipient or amount. Test/browser feedback remains excluded from execution
  download counts. Both migrations are applied only after historical import.

### Business database continuation — November 3 (Asia/Shanghai)

- Added the 41 remaining business tables in `0003_business.sql`, preserving
  explicit source CHECK, primary/unique and foreign-key constraints. Commerce
  remains in its existing five tables; account ownership references the same
  identity anchors. A closed schema converter refuses unknown PostgreSQL types,
  defaults and expressions instead of silently dropping them. This schema does
  not claim to replace PostgreSQL business triggers/RPCs or row authorization.
- The private typed local rehearsal imported all 46 business tables and
  1,479,842 historical rows. Every converted row was read back with matching
  per-table semantic hashes; integrity is `ok` and foreign-key violations are
  zero. Integers outside JavaScript's safe range are refused; JSON/text arrays,
  embedded NUL text, binary values and six-digit UTC timestamps are handled
  explicitly. This is still the October 30 archive, not a fresh cutover snapshot.
- Added FTS5 search, catalog indexes and a directory view retaining publication,
  MCP-only exclusion and oldest-source deduplication. The local archive produces
  36,098 public directory entries, with an independent in-memory deduplication
  comparison. Catalog identity edits remove eligibility until the write adapter
  updates it atomically; production writes are not enabled by this change.
- Added a server-only D1 read transport behind `CLOUDFLARE_DATA_ENABLED=1`.
  Existing query builders can read D1 without an outbound Supabase request.
  Publication and authenticated ownership predicates are applied independently
  of caller filters. Private tables and all mutations/unported RPCs fail closed.
  There is no generic browser SQL endpoint. The feature flag is not yet enabled.
- Local tests use the actual query builder and SQLite/D1 dialect, including
  private-table rejection, cross-account reads, search, arrays/JSON, pagination,
  counts, injection attempts and long repository identities beyond D1's 50-byte
  LIKE limit. A separate native workerd/D1 test passed all ten checks. Full Linux
  validation and remote data read-back remain required before deployment.


- Account: `113e589daada01e37bfd43cfb4763aab`.
- Read-only staging: https://openagentskill-migration.qudongqi2023.workers.dev.
  Commit `85385e6`, Worker version `3f80d04e-1329-47f8-9af3-a0a727d3aecf`.
  No custom domain attached. All 14 remote routing/isolation checks pass; the
  actual homepage also loads in Chrome.
- D1 cache metadata database created: `openagentskill-migration-tags`, ID
  `5edf8538-ca0a-44b3-ba6b-2ce8c26e000c`. This contains cache invalidation metadata,
  not migrated business records.
- A separate private AI budget database, `openagentskill-migration-analysis`
  (`01039261-9108-4742-9899-2c3253ed28ee`), has its first schema migration applied.
  It uses atomic conditional reservations and integer microdollars, retaining
  the rolling 100-call/$2 caps, failure cooldown and seven-day cache. Real D1
  concurrent tests verified one reservation for 12 identical requests and the
  shared spend ceiling under 30 different concurrent requests. Those synthetic
  rows were removed. One completed native-binding inference probe remains in
  the ledger with its $0.005 reservation; actual inference audit is retained.
  No production reviews were rewritten.
- The private application database `openagentskill-migration-data`
  (`06665221-3754-4024-b6e5-6c6fa4026ba2`, WNAM) now has its first commerce schema.
  Its `APP_DB` binding is deployed to the read-only Worker; application routes
  still use their existing data/auth layer and are not switched to this database.
  The archive rehearsal contains 70 identity IDs, 234 release records, two
  customer mappings, six orders and 30 processed webhook records, 342 rows in
  total. These are October 30 records, not a current production snapshot.
  Every transformed row was read back from actual D1 with matching semantic
  hashes; foreign-key checks report zero violations and `quick_check` is `ok`.
  Identity rows contain only IDs and confer no authentication or access rights.
  No passwords, active sessions, emails or private auth attributes were imported.
  That statement describes the initial commerce rehearsal. The subsequent
  `0002_auth.sql` migration now also contains 70 archived user records and 70
  login-method records, including preserved password verifiers and stable GitHub
  IDs. Their private D1 read-back hashes match, foreign-key checks are clean and
  `quick_check` passes. A synthetic remote login/session/rate-limit/logout probe
  passed and was cleaned up without changing archived rows. No source sessions
  or provider tokens were imported. Auth activation stays disabled pending the
  remaining integration and current source-data reconciliation.
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
- `pnpm cf:preview` starts the Workers runtime with local cache emulation; the
  AI binding requires Cloudflare authentication, even while the app keeps AI off.
  Public CI uses the credential-free config described below.
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
- A new independent `OWNER_PUBLISH_TOKEN` is installed for the future Cloudflare
  owner endpoint, bringing staging to six migration-only secrets. The original
  `.env.owner.local` was not read, copied, exported or changed. Updating the owner
  client belongs to cutover; no publication was performed by this migration.
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

- Linux run `41478608665` for `85385e6` passed lint, typecheck, repository links,
  all application and Cloudflare regressions, isolated native D1/workerd auth
  checks, production build, portable packaging and 14 runtime routing cases.
  Dependency review, CodeQL and ordinary CI passed. The exact artifact is now
  deployed, with 423 cache entries populated. All 14 remote cases passed, plus
  GET `/api/auth/get-session` and POST `/api/auth/sign-in/email` both returned
  private/no-store 503 responses without cookies. All six migration-only secrets
  remain installed; `CLOUDFLARE_AUTH_ENABLED=0` and the read-only guard remain set.
  The compressed Worker is about 8.1 MiB; track bundle growth against the paid
  Worker upload limit as the remaining migration is implemented.
- Linux run `41471971932` for `df5a861` passed the complete migration workflow:
  lint, typecheck, links, application regressions, Cloudflare tests, production
  build, portable packaging and 14 workerd cases. PR dependency review, CodeQL
  and ordinary application CI also passed. The exact artifact is now deployed
  with `APP_DB` bound; 423 cache entries were populated, all 14 remote checks
  passed, and all six migration-only secrets remain installed. The new order
  primitive is not yet wired into payment routes. Production payment/OAuth
  credentials stay in encrypted local storage until their integration is ready.
- Linux run `41462806365` for deployed commit `8fb04a8` passed lint, typecheck,
  links, all regression suites, Cloudflare tests, production build, Worker
  packaging and all 14 workerd cases. Dependency review and CodeQL also passed.
  The exact portable artifact was deployed without rebundling on Windows;
  423 cache entries were populated. All 14 cases passed against the real
  staging URL, and Chrome confirmed the homepage and dated pause notice.
  All six migration secrets survived deployment. Runtime bindings include
  private R2, D1, AI and the self-reference service; paid/review writes and
  schedules remain off. A project-local Corepack pnpm shim was used for OpenNext
  cache population because the desktop's fallback pnpm wrapper attempted to
  reinstall dependencies. It changes no global installation or user settings.
- Linux run `41451477946` for commit `7ef7c69` passed lint, typecheck, links, the
  complete regression suite, Cloudflare tests, build, packaging and all 11
  workerd runtime cases. The smoke harness uses `localhost`: NextURL normalizes
  loopback IPs to that hostname, otherwise OpenNext interprets rewrites as external.
- Run `41455988910` for `74a5f17` also passed the full application checks and 14
  workerd cases, including localized account isolation. PR dependency review
  separately found vulnerable transitive glob/undici versions in the migration
  tools. Same-major patched versions are now pinned by narrow pnpm overrides:
  glob 10.5.0, undici 6.29.1/7.30.1. Dependency review passed for `c63c8bf` and
  `7a2ed1c`, and the final deployed `8fb04a8` passed both dependency review and
  its complete build checks.
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
  records a download. Payment/download regression tests pass. A private remote
  Worker preview also verified the actual R2 binding with one archived release
  of each delivery kind (package, prompt, skill instructions): all matched
  size/hash, and invalid size, invalid hash and withdrawn releases were blocked.
  It returned only check results, never file contents; no order/download records
  were created. The temporary preview was stopped after verification.
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
  additionally required an authenticator check for key creation, after its email
  verification. The owner completed that check. The dedicated restricted live
  key was created and captured directly into Windows user-encrypted storage,
  without appearing in logs, Git, build artifacts or chat. Ten read-only Stripe
  API checks passed, including invoice-payment access, both existing membership
  prices and the billing portal. The existing Vercel key is unchanged. The live
  key is prepared locally, not installed into the read-only staging Worker.
  The existing production webhook signing secret was also captured into encrypted
  storage without rotating it or creating a duplicate endpoint. Its 15 subscribed
  events and API version match the application handler. No charge or new checkout
  session was created. Verified nonsecret production configuration is:
  `STRIPE_PRICE_PRO_MONTHLY=price_1UPlbc2WEAq3tdU2mq3pTRe4` ($9.99/month),
  `STRIPE_PRICE_PRO_YEARLY=price_1UPlbe2WEAq3tdU2qbQTaizf` ($79/year), and
  `STRIPE_BILLING_PORTAL_CONFIGURATION=bpc_1UPlbq2WEAq3tdU2OKJdYW9Z`.
- The D1 order-transaction adapter implements atomic reservation and completion.
  Real D1 tests confirmed that 12 concurrent checkout reservations share one
  order, membership plans share a reservation, and a late completion cannot
  reactivate a refunded order. Synthetic rows were removed by their own IDs;
  archived business records were preserved. Local tests additionally cover
  ownership/payment-mode isolation, payment uniqueness, immutable payment binding,
  paid-lifetime deduplication, expiry, transaction rollback, invalid inputs and
  calendar-month clamping for February 29. The local typed rehearsal preserves
  microsecond timestamps and refuses unsafe number/boolean conversion.
  This is a server-private primitive, not an exposed data API or a complete
  payment migration: route reads/writes, login and webhook orchestration still
  require integration and end-to-end validation before cutover.
- Auth inventory from the authorized archive contains 34 password accounts
  (bcrypt cost 10), 36 GitHub accounts, 64 confirmed emails and six unconfirmed
  emails, with no anonymous/deleted/banned accounts or duplicate normalized
  emails. All 70 have profile rows. These counts do not make the auth migration
  complete; no password verifiers or existing sessions were loaded into D1.
  The existing GitHub OAuth application (`3830141`, public client ID
  `Ov23liPXVXYpDfcfw3yI`) retains its Supabase callback and original secret.
  Two exact, non-wildcard callbacks were added for the future auth adapter:
  `https://www.openagentskill.com/api/auth/callback/github` and
  `https://openagentskill-migration.qudongqi2023.workers.dev/api/auth/callback/github`.
  A separate client secret was generated and saved with Windows user encryption;
  it is not yet installed in the Worker. Existing user tokens were not revoked.
  The gated Better Auth callback route, password verification, account mapping,
  session lifecycle and email-confirmation/reset logic are now implemented and
  covered by isolated handler tests. Native workerd/D1 tests and a remote D1 API
  probe pass. A dedicated auth signing/encryption secret is stored with Windows
  user encryption, not installed into the read-only Worker. Frontend/business
  route integration, actual GitHub login and delivered email still need end-to-end
  validation before activation.
  Cloudflare Email Sending can provide transactional auth email, but its
  [domain setup requires Cloudflare DNS](https://developers.cloudflare.com/email-service/get-started/send-emails/);
  that prerequisite is not activated yet. No email was sent by this preparation.
- Cloudflare inference uses the fixed Workers AI model
  `@cf/deepseek-ai/deepseek-v4-flash-0731`, without a Vercel Gateway fallback.
  Official pricing checked November 2 is $0.44/M input and $1.32/M output,
  below the existing conservative reservation envelope. Provider-specific cache
  keys, durable reservation-before-call, 2048 output tokens, 30-second abort,
  no retries, bounded responses and rejection of incomplete output are tested.
  Two synthetic API probes used 20 input and 62 output tokens in total. The
  first 32-token cap truncated; the bounded follow-up returned the exact requested
  text with a normal stop. A third probe used the actual Worker AI binding,
  application adapter and D1 reservation/completion path, returning the expected
  text with 10 input and 39 output tokens. Its audit record is retained. No
  source/user data was sent. Staging keeps `WORKERS_AI_ENABLED=0`.
  Wrangler 4.152 requires a remote AI binding; `ai.remote=false` cannot create a
  local simulator. The actual config now explicitly uses `remote=true`. Public
  runtime CI therefore derives a temporary config without the disabled AI
  binding, asserting both AI-off and read-only flags first. Real AI binding
  verification is separate; public CI requires no account credentials or paid
  inference. Before production activation, stop the old
  writer and reconcile the preceding 24 hours of reservations (or wait a full
  24-hour blackout); an empty ledger must not reset an existing daily budget.
- Before the recovery above, the normal source Data API returned 402 with the recovered server key.
  A fresh normal public read also returned 402 at 2026-11-02T16:12Z. Authoritative
  DNS still reports `ns1.vercel-dns.com` and `ns2.vercel-dns.com`.
  The shared Supabase organization's billing cycle is October 10–November 10;
  its spending cap was on before the owner-authorized recovery. Five projects share the integration, so do not
  cancel the organization or Vercel Marketplace integration as a site cleanup.

## Pending before production

1. Validate the deployed private R2 delivery adapter against isolated test
   accounts and payment data once the replacement data/auth layer is ready.
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
   image bucket and test it before production. Workers AI, its native binding
   and D1 budget ledger are verified. Port the surrounding review/publication
   transactions and reconcile the prior 24-hour budget before enabling reviews.
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
   archives outside Git and build artifacts. The normal source Data API has now
   recovered. Final reconciliation still needs a fresh consistent export; do not
   treat the historical per-table archive as current production state.
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
[custom Workers](https://opennext.js.org/cloudflare/howtos/custom-worker),
[D1 atomic batches](https://developers.cloudflare.com/d1/worker-api/d1-database/),
[D1 consistency checks](https://developers.cloudflare.com/d1/sql-api/sql-statements/).

D1 outcome transport and migration 0008 now preserve result correction, aggregate scoring, verified installs and download receipt idempotency. Native D1 and SQLite rollback tests pass. Deployed read-only 2a4522b uncovered JSON text projections in the actual directory; fixed in the adapter with parameter-safe paths and regression coverage. Robots is routed through the Worker before static assets to preserve preview noindex. Authoritative DNS moved to Cloudflare with Vercel website targets preserved; zone active. Production application/data cutover, fresh data reconciliation and remaining background RPCs are still pending.

Cloudflare zone activation confirmed externally (NS, Google verification TXT, Vercel A targets; current production HTTP 200/308 preserved). Email Sending onboarded for openagentskill.com and reports Enabled / DNS Configured; no real messages sent. Auth mail binding, verification signup flow and fail-closed configuration tests pass; activation flags remain disabled. Migrated indexer run logging/listing, exclusive candidate leases, GitHub metadata refresh, quality refresh, coverage and UTC trending RPCs; native D1 checks pass. Source secret-guarded RPCs retain constant-time server-secret validation.

Migration 0009 adds bounded optimistic D1 write assertions and the existing canonical-source INSERT guard. Trusted Skill writes now atomically update taxonomy and directory membership with retry protection against concurrent edits, while retaining static-review truth. Restored server CRUD used by submissions/claims/newsletter/audits/rankings, without exposing service privilege publicly. Source indexing and version history RPCs now preserve secret checks, first-publication activity, shallow JSON merges including nulls, and rollback. SQLite and native D1 tests pass; production writes remain gated.
