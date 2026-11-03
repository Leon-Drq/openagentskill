# IndexNow delivery on Cloudflare

Publication previously sent notifications directly from each job, discarded failed
submissions, and resubmitted fixed baseline URLs daily. Delivery now uses private
D1 tables from `cloudflare/migrations/data/0010_indexnow.sql`.

- Publication records changed URLs without contacting IndexNow. Empty publication
  runs no longer notify directory/blog URLs. Fixed baseline submission is opt-in.
- An authenticated hourly cron (`20 * * * *`, UTC) drains at most 100 URLs. A shared
  D1 lease and one-hour reservation prevent concurrent isolates or manual retries
  from bypassing the cooldown. A URL updated while in flight remains pending.
- HTTP 200/202 acknowledges delivery. On 429, 5xx or a network failure, pending
  URLs remain durable. Retry delay grows from one hour to 24 hours and never
  shortens a longer `Retry-After` value (seconds or HTTP date).
- Repeated URLs coalesce. APIs, audit pages and sitemaps are excluded. Skill pages
  use the existing search eligibility policy; this does not approve reviews or
  alter any robots metadata. Recently delivered rows expire after 30 days.
- All calls use the same official endpoint. There is no alternate host/IP bypass.

`POST /api/indexnow/submit` (automation credentials required) accepts changed
`urls` or `slugs`; HTTP 202 means **queued**, not delivered. `includeBaseline:true`
is an explicit one-off option. `GET` drains due work and reports pending count,
actual provider status, delivery state and next attempt time. A retained upstream
failure returns HTTP 202 with `success:false`; persistence failure returns 503.
No request can force a send before the shared cooldown expires.

Deployment order: apply the additive D1 migration, deploy the tested Worker, then
enqueue any known failed historical notices. Do not clear the delivery table or
shorten its cooldown to test an upstream rate limit. Verify the public key file,
protected endpoint, queue state, and a single due batch. An external 429 may remain
after deployment; that is reported separately from successful queue recovery.

Validation: `pnpm test:automation-reliability`, `pnpm typecheck`, full regression
suite and Cloudflare build. The native D1 business runtime check also exercises
429 retention, cooldown, 100-URL batch acknowledgment and subsequent recovery.

Reference: https://www.indexnow.org/faq (Retry-After and changed-URL guidance).
