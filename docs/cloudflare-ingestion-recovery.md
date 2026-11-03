# Automatic ingestion after the Cloudflare cutover

The production site and data cutover completed on November 3, 2026. A separate
inspection found candidate discovery could write to D1, but validation and
publication received GitHub 403 responses. X search was unintentionally disabled.

## Confirmed causes and changes

- A protected, temporary Worker reproduced GitHub repository reads returning
  403 without User-Agent and 200 with User-Agent, using the same credential.
  Repository validation, GitHub search and X-linked repository lookup now send
  the required identity header. Classify actual rate limits using response
  headers/body, preserve Retry-After, and keep permission failures distinct.
- The radar route converted an absent query parameter (`null`) to zero, masking
  both POST options and configured defaults. Missing/empty values now remain
  absent; explicit zero still disables the budget. X request failures are
  reported as failures and stop the query window instead of looking like an
  empty successful scan. Requests have a bounded deadline.
- Production X discovery is limited to one query with ten results every 24
  hours. This consumes existing X credit; no recharge or subscription changes
  are part of the fix. Do not confuse discovery with permission to post to X.
- Three historical D1 errors lacked diagnostic information, so their exact
  provider-side cause cannot be reconstructed from the stored messages. New
  errors retain fixed categories without leaking SQL values. Reads retry
  recognized transient errors; arbitrary writes do not replay. Candidate
  enqueue uses batches of 100 and duplicate-ignore keys. Candidate claim is
  idempotent for a unique request worker ID and recovers the original lease
  after a lost acknowledgement instead of claiming a second batch.

## Validation

`scripts/test-ingestion-recovery.mjs` covers missing query parameters and POST
precedence, explicit budget zero, GitHub identity headers and 403/429
classification, X failure reporting, D1 read recovery, committed-but-lost
candidate lease/enqueue acknowledgements, no replay of ordinary mutations,
and private error redaction. Existing native D1 and full application checks
remain required before deploying. Production acceptance must verify the new
build plus actual discovery, validation, publication and an X search scan.

The original Vercel project has been paused and the old Supabase project was
deleted after a separate frozen-data and independent-backup verification.
D1 is authoritative; do not restore the source snapshot over current writes.
