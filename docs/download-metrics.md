# On-site downloads

Skills and collection cards show a download icon and number. The accessible
label remains “Site downloads” (“本站下载量”). The tooltip and expandable directory
note explain this owner-defined metric:

- Verified file responses from the SKILL.md and paid download routes.
- Successful copies of installation commands on this site.
- Explicit clicks (including middle-click) to a Skill's source/acquisition link.
- Agent executions reported through `/api/agent/outcome` or `/api/agent/feedback`.

Every separate operation counts, including repeats by the same account, browser
or Agent on the same day. Receipts use generated UUIDs rather than a daily actor
primary key. Counts are operations, not unique people, confirmed installations
or guaranteed successful executions. Client-reported interactions and Agent
reports do not prove human activity. Counts can lag by fifteen minutes. A healthy
empty aggregate shows `0`; an unavailable aggregate shows `—`.

## Historical evidence and Agent usage

The original 14 October 2026 ledger omitted existing events and Agent reports;
it initially contained only six source exits. The operation migration imports
recorded web command copies/source exits before the first interaction receipt.
This conservative cutoff avoids overlap with dual telemetry during the original
rollout. Prompt copies, views, legacy download estimates and source-site totals
are not imported. Previously suppressed daily repeats cannot all be recovered.

Historical and future Agent `success`/`failed` outcomes count when they represent
an execution, excluding setup/risk-blocked reports and explicitly marked QA or
dry-run records. Feedback from browser rating widgets does not count as an Agent
run. The feedback and funnel mirrors of an outcome never add another count.

Private invoker triggers write a receipt and increment totals atomically with
the authoritative outcome/feedback transaction. Each new execution counts, even
for the same Agent and Skill. The existing outcome contract still treats retries
of the same `event_id` as a correction of one execution; its source receipt key
prevents multiple logs of that execution being added together. A blocked report
later corrected to an actual execution can acquire its first receipt.

Historical receipts retain source row identifiers and timestamps. They do not
copy task text, prompts, user identities, URLs or credentials. Known test/smoke
records are excluded using the same predicate for backfill and live writes.

## Collection and access

`POST /api/skills/{slug}/download-action` accepts only `command-copy` or
`external-open` with a browser UUID. It requires same-origin JSON, a bounded
payload and a current public registry or active provider listing. Command copies
require recorded installable source evidence. The server resolves authenticated
identity itself and hashes a guest's browser ID before private ledger storage.
Only service-role RPC calls can write the action/file ledger and aggregate.

File responses require non-anonymous authentication, current listing/purchase
entitlements, complete artifact reads, byte length and SHA-256 verification.
Signed URL creation, failed clipboard writes, read-only review prompts, search
and recommendation requests do not increment the metric. Tracking never blocks
a browser clipboard action or external link.

Only aggregate counts leave the server. Account deletion removes its private
receipts while preserving totals. Download sorting merges registry and provider
counts before pagination with stable slug tie-breaking.

## Verification

Run `pnpm test:downloads`, full regressions, typecheck, lint and production build.
Run `scripts/test-download-operations.sql` against the migrated schema; the
transaction rolls back all simulated downloads, Agent executions and mirrors.
Keep browser interaction tests on mocks; do not create production counts for QA.
