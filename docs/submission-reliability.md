# Community submission receipts and recovery

Community submissions remain anonymous and zero-star eligible. Optional GitHub/X
handles are **self-declared submitter accounts**, not proof of repository ownership.
Repository authors are taken from source metadata. Authenticated Supabase user IDs,
when available, are stored only in private `validation_result.submitter`; they are
not returned by the receipt endpoint or treated as creator verification. Older
records may contain auto-filled repository owners, so they cannot reliably measure
unique human submitters.

## Durable lifecycle

- The public submit API validates the selected SKILL.md and pins an immutable commit,
  then saves the private submission row before fetching the full package for review.
- `after()` starts processing promptly. `/api/cron/skill-submissions` recovers work
  every five minutes after deployment. It requires the existing server-only cron or
  indexer secret and service-role database access. No schema migration is needed.
- A compare-and-swap on status and `updated_at` claims a ten-minute lease. Review
  updates also require the matching lease. At most three processing attempts are
  allowed; expired jobs are retried, not immediately looped.
- Incomplete recovery, exhausted retries or old records lacking an immutable commit
  move to human review (`listed`), **not approval**. Prior findings are retained.
  Rejected, quarantined and terminal submissions are never automatically reopened.
- Package hashing/completeness, static analysis, risk triage and model budget gates
  still apply. Static publication remains `static_checked`, never `AI Reviewed`.
- `listed` means pending/manual community queue, not a published Skill directory
  entry. Receipt and community links only point to publicly eligible Skill rows.

The cron handles up to three jobs per invocation, with bounded retries. Inspect its
`results` and `waitingManual` count in existing runtime logs. `manual_review` or
`retry_scheduled` emits a warning. A deployed cron and first-party credentials are
required before this recovery is active; a local build alone does not repair old
production jobs. Resolve genuine findings through the normal review workflow,
never by overwriting review scores or approval flags with ad-hoc SQL.

## Receipts and sharing

The browser generates a cryptographically random receipt capability before sending
each item. The server derives a stable row ID and stores only its SHA-256 token
hash. Retrying an uncertain save with the same token returns the same receipt and
does not consume another submission or model review. Different token/repository
combinations cannot use that receipt to overwrite an existing row.

The browser keeps at most 20 receipts and 50 pending request keys on the device.
The active receipt also survives refresh in the current session. Clearing browser
storage removes that local history; the copied private tracking link remains usable.
Treat the link like a private capability. It uses a fragment that the shared head
captures and strips before analytics loads; status reads send the token in an
Authorization header. Legacy API query-token URLs remain supported for old clients.

The success modal celebrates **receipt acceptance**, not safety approval. Sharing
opens an X composer only after a user click; it does not publish a post. Pending
copy says “submitted for review” and links to `/submit`. Only server-confirmed public
entries share a Skill detail URL. Receipt tokens and private links are never in
sharing copy. Quarantined/rejected entries have no share prompt.

## Verification

```sh
node scripts/test-submission-flow.mjs
node scripts/test-submission-pagination.mjs
node node_modules/next/dist/bin/next typegen
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
```

Run the existing full regression suite too. For browser verification, start the
production build locally on port 3123, install/use Playwright in the test environment,
and run `node scripts/test-submission-browser.mjs`. `PLAYWRIGHT_MODULE_PATH` can point
to an already installed Playwright package; `SUBMISSION_TEST_URL` must be localhost.
All browser submission APIs are mocked in memory, external browser traffic is
blocked, and screenshots go into ignored `.codex-tmp/submission-qa/`. No production
submission, AI call, repository code execution or X post is performed by these tests.
