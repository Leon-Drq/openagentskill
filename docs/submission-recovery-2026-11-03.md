# Community submission recovery after the Cloudflare cutover

A November 1 report said both repository and SKILL.md links for
`hnewcity/agent-speedup-estimator` failed validation without a receipt. On
November 3, all three current repository/directory/document links passed
production discovery at immutable commit `cca6862c867705509cf194b4ebcbf873bd80a3e4`,
but public source lookup found no listing. Earlier GitHub identity-header
failures are documented in `cloudflare-ingestion-recovery.md`; the individual
historical request has no retained diagnostic evidence, so its exact cause is
not established by this report.

A recovery through the ordinary community submission API returned HTTP 202.
Its authenticated receipt endpoint returned 503. The receipt reader still
requested an embedded `skills (...)` PostgREST relationship, which the D1 query
adapter deliberately rejects. It now reads the submission row, authenticates
the receipt, and only then loads its linked Skill by ID. Public listing gates
and private receipt headers remain required. Missing/wrong receipts return 404;
pending or nonpublic listings do not receive a public Skill link.

Source discovery also used to suppress all document-fetch errors as missing
SKILL.md files. Only actual missing documents and oversized documents are now
skipped; GitHub permission, throttling, timeout and service failures stop
discovery and remain retryable. API failures redact provider bodies and database
messages. GitHub throttling is a service 503 with Retry-After, separate from a
visitor's daily 429 limit. The form explains the stage, retains input and gives
localized recovery guidance in all eight languages. A discovery check does not
create a submission receipt.

Regression coverage includes the real D1 service transport and receipt route,
durable nested Skill intake, idempotent receipt retries, pending/public/private
listing states, authentication before related reads, and private failure
responses. Source tests cover 403/429/500/timeouts versus missing and oversized
documents. Browser fixtures cover retained input, upstream throttling and
temporary failures before the existing desktop/mobile submission/receipt flow.

The affected project is recovered through the existing reviewed submission API.
This is not an owner publication or a review override. No rejected review,
approval score, identity claim or execution result is changed. Receipt secrets
stay private; no source code from the submitted repository is executed and no
message is sent to its author.

Live receipt verification then revealed a second D1 migration issue: reviews
remained `processing` after completion. Writes normalize timestamps to six
fractional digits, while query filters compared the original three-digit
`Date.toISOString()` lease literally. The conditional completion update matched
no rows. Timestamp filter values now use the same validated normalization as
writes; different worker leases still do not match. A regression runs the actual
submission worker, review policy and D1 transport through a deterministic manual
review, proving that the terminal state is saved and will not be reviewed again.
No production submission counter, approval or score is edited to recover it.

The affected immutable package includes two CPU data JSON files larger than the
existing 120,000-byte review limit. Incomplete package coverage requires human
review under the existing policy. Restoring queue completion must not turn this
into automatic approval or claim that the Skill has been executed.
