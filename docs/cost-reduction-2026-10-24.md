# Longer public caches and scoped statistics

## Changes

| Layer | Previous interval | New fallback interval |
| --- | --- | --- |
| Public directory HTML and normal directory models | 15 minutes | 1 hour |
| Directory candidate/count/page queries | 5 minutes | 1 hour |
| Alternative candidate projection | 15 minutes | 1 hour |
| Download totals | 15 minutes, whole ledger | 1 hour, requested slugs only |
| Daily ranking snapshot | 5 minutes | 6 hours |
| Saved maintenance directory model | 1 hour | 6 hours |

Request-driven expiration is a fallback, not a background polling schedule.
Existing owner/publication and daily-ranking invalidation tags still refresh
data on subsequent requests. Dynamic query pages remain dynamic. The snapshot
age check still precedes the maintenance model lookup. Transactional endpoints,
account-specific responses, install decisions and safety evidence retain their
existing freshness and authorization rules.

Download totals now require an explicit slug list. Slugs are deduplicated and
sorted for stable keys, then batched within the existing 2,400-character query
budget and 100-row bound. Normal directory and collection views query visible
cards only. Download sorting queries the full bounded candidate set and provider
counts before merging/pagination, including motion products. Missing totals
during an outage remain unavailable; failed reads never enter the success cache.
No schema migration or production database mutation is required.

Search, its fallback, catalog pages/candidates, detail lookups, video workflow
sources and ranking snapshot readers skip live caches during the data pause.
This prevents stale-cache hits from scheduling repeated failing refreshes on
use-case and ranking pages. Recovery resumes the original live cache keyspace.

## Firewall review

Read-only Vercel CLI inspection on October 24 found the two existing Lightpanda
rules active, no unpublished draft, and platform mitigation enabled. The
overview window (October 23 04:00 to October 24 05:00 UTC) reported roughly
551,000 allowed requests, 593 denied and 68 challenged. Unknown-bot classification
alone is not sufficient evidence of abuse. `/privacy` traffic was distributed
across many clients; the busiest client's traffic also included normal static
assets. No new broad IP, browser-fingerprint, country, or AI-bot block is
justified by this sample. Existing rules are retained; there is no new paid WAF
feature or claim of traffic-related savings from this release.

## Validation and measurement

`pnpm test`, `pnpm lint`, `pnpm typecheck`, and a production build are required
before release. New executable tests cover 1,250 scoped counters, bounded URLs,
canonical keys, expiration, publication-tag invalidation, failure/recovery,
zero cache/data reads while paused, visible-only counters and download ordering
across two real rendered pages. Private/account/payment regression suites remain
in the full test run.

After deployment, check the custom domain's commit, directory cache hits and
revalidate headers, maintenance behavior and observed ranking/use-case errors.
The database remains paused. Compare matched complete traffic windows before
claiming actual monetary savings; longer TTLs and passing tests alone do not
establish a dollar amount.
