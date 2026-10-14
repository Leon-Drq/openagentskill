# On-site downloads

The Skills card footer and `sort=downloads` show the owner's **site download
 actions** metric, starting on 14 October 2026. It includes:

- Verified file responses from the existing SKILL.md and paid download routes.
- Successful copies of an installation command on this site.
- Explicit clicks (including middle-click) to a Skill's repository, documentation
  or source-platform acquisition link, including external catalog entries.

These actions share one receipt per account/Skill/UTC day. Guests' command
copies and outbound clicks count per browser identifier/Skill/UTC day. The
existing browser identifier is hashed on the server before ledger storage.
Logging in, clearing browser storage, different browsers or multiple accounts
can affect deduplication; this is not a count of unique people.

The label remains “Site downloads” (“本站下载量”). The visible expandable note and
counter tooltip explain that copies and source clicks are included. These are
acquisition actions, not verified downloads on the external site, confirmed disk
saves, successful installations or successful executions. No legacy estimates
or source-site totals are backfilled. Existing recorded file receipts remain.
Counts can lag by up to five minutes. A healthy empty aggregate shows `0` for
registry and provider entries; an unavailable aggregate shows `—`.

## Collection and access

`POST /api/skills/{slug}/download-action` accepts only `command-copy` or
`external-open` with a browser UUID. It requires same-origin JSON, a bounded
payload and a current public registry or active provider listing. Command copies
also require recorded installable source evidence. The server resolves account
identity from authenticated session data, never from the supplied body. It calls
the service-only `record_skill_download_action` function. Public clients cannot
read the private receipt ledger or write aggregate counts directly.

File responses still require authenticated, non-anonymous accounts, fresh
listing or purchase entitlement checks, a full artifact read, byte length and
SHA-256 verification. The original `record_skill_download` function shares the
same receipt primary key and remains backward compatible. Existing signed URL
creation, views, general site links, failed clipboard writes, read-only review
prompts and installation reports do not independently increment this metric.
Tracking is best-effort and never blocks a clipboard action or external link.
Client-reported interaction events are not proof of human activity.

Only aggregate counts leave the server. The ledger contains no commands, URLs,
IP addresses, email addresses or file contents. Account deletion cascades its
receipts while preserving anonymous totals. Catalog download sorting merges
registry and provider counts before pagination, with stable slug tie-breaking.

## Verification

Run `pnpm test:downloads`, full regressions, typecheck and production build.
Exercise database deduplication across file/copy/external actions and service
privileges in a transaction, then roll it back. Keep UI interaction tests on
local mocked endpoints; never create artificial production download counts.
