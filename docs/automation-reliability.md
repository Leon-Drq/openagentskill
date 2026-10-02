# Automation recovery

Editorial X publishing and creator outreach use separate authenticated cron routes.
`/api/x/post-daily` consumes the queue at 15:30, 19:30 and 23:30 UTC;
`/api/x/post-creator-reply` runs five minutes later. The existing growth cron
builds the queue before publication. Both retain the original authorization,
review and deduplication guards. Empty queues are a successful no-op; failures
return 503 instead of being disguised as skipped work.

X background database calls use server-only credentials with an 8-second request
limit, a separate circuit and a 90-second task database deadline. X HTTP calls
have a 10-second deadline including the response body and never replay mutations.
A still-valid access token is reused; tokens are refreshed within two minutes of
expiry. No token or supplier response is included in route error responses.

A failed or ambiguous post is not automatically requeued. Its queue record carries
`reconciliation_required`; inspect X history before retrying to avoid duplicates.
Existing posted history and queue claims continue to prevent duplicate skills.

`/api/x/status` includes the last successful post, queued count, last-day output,
and `publishing.health` (ready, stale, unknown). This is independent of OAuth
connection health. The endpoint remains authenticated.

Deferred reviews preserve failure categories without changing review outcomes or
budgets. Budget/cooldown/input-envelope failures retry after a day; temporary
infrastructure failures after an hour. Retries add up to 15 minutes of jitter.
Failed model calls still retain their spending reservations. A successful model
response whose ledger write is uncertain is no longer overwritten by a failure.

The existing shared broad-search cache remains. An additional bounded warm-instance
cache coalesces exact and broad search requests for 60 seconds, including the query
and result limit in its key. Errors and partial results are never cached as healthy.

Validation: run `pnpm test`, `pnpm typecheck`, and `pnpm build`. Deployment requires
existing production server credentials; no new environment secrets or migration
are needed. Verify the authenticated status endpoint and scheduled run logs after
rollout. Never increase the supplier budget or approve deferred candidates simply
to clear the queue.
