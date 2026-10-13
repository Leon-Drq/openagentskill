# On-site downloads

The Skills card footer and `sort=downloads` use **site downloads**, starting on
14 October 2026. The legacy `skills.downloads` field and source-site statistics
are not reliable evidence for this metric and are never backfilled into it.

A counted download is a successful first-party file response to an authenticated,
non-anonymous account. The server reads the complete artifact, checks byte length
and SHA-256, and atomically records a receipt before returning the attachment.
The same account and Skill count once per UTC day, across versions and retries.
This measures file delivery requests, not unique people, a confirmed disk save,
successful installation or successful execution. A connection can still break
after the response starts. Counts can lag by up to five minutes.

Included paths:

- `POST /api/skills/{slug}/download`: the recorded, hash-matching SKILL.md, only
  while the listing remains public and its source/install policy allows it.
  This is the instruction file, not an export of repository dependencies.
- `POST /api/payments/download` with `Accept: application/octet-stream`: a
  private release after the existing purchase/membership entitlement checks.

Creating legacy signed URLs, reading/copying prompts or install commands, CLI
installs, previews and external-site links do not increment this metric.
Third-party-only listings show `—`, not an invented zero. A metrics outage also
shows `—`; a confirmed empty ledger shows `0`. Motion cards use the same ledger
and support download ordering in their category and paid results.

`skill_download_receipts` is private; public clients cannot read identities or
write counts. Only the service role can execute `record_skill_download`, which
deduplicates receipts and updates totals in one transaction. The directory reads
aggregate totals; SQL pagination uses the indexed `skills.site_downloads` column.
No IP addresses, emails, credentials, or downloaded file contents are stored in
the ledger. Account deletion cascades receipts but retains anonymous aggregates.

Validation: `pnpm test:downloads`, full regressions, typecheck, production build,
and a transaction/rollback SQL check for deduplication and database privileges.
Do not generate test traffic against production download endpoints: this would
be indistinguishable from a real delivery request.
