# Database migration decision — November 3, 2026 (Asia/Shanghai)

The owner explicitly selected minimum ongoing cost and a complete Cloudflare
D1 migration, accepting more application changes. Neon was evaluated but is not
the selected target. No Neon project was provisioned and no source data was
uploaded to Neon. Its expired connector authorization is not a migration blocker
for the selected D1 plan.

## Cost basis

Official prices checked November 2 UTC:

| Option | Published pricing basis | Implication for this site |
| --- | --- | --- |
| Cloudflare D1 with Workers Paid | 5 GB total storage, 25 billion rows read and 50 million rows written per month included; excess storage $0.75/GB-month, reads $0.001/million and writes $1/million | Selected. Database incremental charge is zero within these account-level allowances. Workers compute is billed separately. Index maintenance also counts as writes. |
| Neon Launch | $0.106/CU-hour, $0.35/GB-month storage | Preserves PostgreSQL semantics with less rewriting. A continuously active 0.25–1 CU compute for 730 hours is $19.35–$77.38, before storage/history/extra services. Autosuspend can lower this, higher load can increase it. |
| Supabase Pro | From $25/month, first project included; 250 GB uncached egress then $0.09/GB | Current service is quota-restricted; retaining it would not meet the owner's complete Cloudflare preference. Other projects share the organization, which must not be cancelled as site cleanup. |

Sources: [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/),
[Neon pricing](https://neon.com/pricing),
[Supabase pricing](https://supabase.com/pricing).

The reported $700/month is a Vercel bill, not a measured database-only bill.
Do not subtract a database quote from it and claim proven savings. The current
lossless local archive is about 866 MB, but the final indexed D1 application size,
monthly scanned/written rows, Worker CPU, R2 operations and AI use must be measured.
Use indexed bounded queries, cached public reads and existing durable AI caps;
do not disable payment/session freshness checks to reduce cost.

## Current auth work

- Better Auth 1.7.15 is connected to a private D1-compatible binding. New routes
  are gated by `CLOUDFLARE_AUTH_ENABLED=1`, a fixed approved HTTPS origin and the
  existing read-only migration guard. The deployed staging flag remains off.
- Source user IDs and stable GitHub provider IDs are retained. Thirty-four
  bcrypt password verifiers remain usable; newly set passwords use scrypt.
  The local October 30 archive transforms into 70 users and 70 login methods,
  including 36 GitHub accounts and 64 confirmed emails, with matching read-back
  hashes and no foreign-key violations. Old sessions and provider tokens are
  deliberately not imported. Auth timestamps use UTC milliseconds; the source
  archive preserves the original microseconds.
- Server-managed secure HttpOnly cookies, database-backed rate limiting,
  verification requirements, explicit account linking and session revocation
  are implemented. A D1 trigger makes password-change session revocation atomic
  even if a later application request fails. Payment identity anchors are
  created atomically with user creation and existing order relationships stay
  intact. Presence in an identity-anchor table does not authorize a login.
- Actual HTTP-handler tests passed with the library's D1 dialect, covering
  legacy/new passwords, origin attacks, verified/unverified users, cookie
  attributes, signout, revocation and twelve concurrent attempts (five admitted,
  seven rate limited). A separate workerd run with a native local D1 binding
  passed legacy/scrypt login, session lookup, atomic revocation and concurrency.
  The runtime test sends no external email/OAuth request and uses synthetic data.
- Additional handler tests capture email in memory, verify confirmation and
  one-time password reset, and simulate GitHub's token/profile responses.
  A renamed GitHub account still resolves to its archived UUID; a different
  numeric GitHub subject cannot take over that account using the same email.
  OAuth tokens are stored encrypted. Real provider login/email delivery is
  still a separate production prerequisite.
- Applied `0002_auth.sql` to the private application D1 database. All 70 archived
  users and 70 login-method rows were imported and read back with matching
  semantic hashes. `quick_check` is `ok`; no foreign-key violations, old sessions
  or provider tokens were imported. A separate synthetic auth-handler probe
  against actual Cloudflare D1 through its authenticated API passed login,
  session lookup, concurrent rate limiting and logout. Its exact user/anchor and
  rate-limit rows were removed; the 70 users, 70 methods and six archived orders
  remain intact, with zero sessions. This remote D1 API test and the local native
  workerd binding test are distinct; neither proves real GitHub/email delivery.

This is an authentication migration foundation, not a production cutover.
Business routes and UI still use their old auth/data clients. Transactional
email, registration/profile creation, GitHub callback end-to-end verification,
ownership checks across the remaining APIs and fresh source reconciliation
remain required. Registration stays disabled until those prerequisites pass.

The source archive is dated October 30 and is not a current globally consistent
snapshot. Never activate these archived accounts/orders as the authoritative
production state without a final consistent export and single-writer cutover.

The gated implementation from `85385e6` is deployed to the read-only staging
Worker after [full CI run 41478608665](https://github.com/Leon-Drq/openagentskill/actions/runs/41478608665).
All 14 remote route checks and two explicit auth-isolation probes passed. No
production DNS, Supabase spending cap, auth provider or Vercel billing changed.
