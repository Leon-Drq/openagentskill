# Cost reduction release — 2026-10-14

The owner authorized systematic cost optimization and production deployment,
and confirmed that `Lightpanda/1.0` is not their crawler.

## Evidence and scope

The running Oct 4–Nov 4 team period showed roughly $486 after the $20 credit.
The largest resources were Fluid CPU ($182), CDN requests ($131), function
invocations ($39), memory ($35), origin transfer ($35), and ISR writes ($35).
These are period-to-date amounts, not a forecast or final invoice. The project
accounted for about 91% of gross team charges and 99% of CPU usage.

The preceding 24-hour firewall sample contained about 9.35 million requests,
of which 7.77 million used `Lightpanda/1.0`. This is a traffic share, not proof
of the same share of CPU or charges. Default skill directories and contact
pages returned private/no-store; fixed language query pages also rendered on
every request. Broad source tags invalidated unrelated details on publication.

## Application changes

- Cache the eight default directories and fixed detail/report language variants
  for 15 minutes. Search/filter URLs retain request-time behavior and URL state.
- Cache contact/sponsor variants for a day, with separate canonical/noindex
  English variants. Preserve public canonicals and block direct internal URLs.
- Use on-demand ISR; do not prebuild the registry or add a database migration.
- Separate public 15-minute source reads from existing five-minute install/API
  source reads. Both expire immediately through the exact per-Skill tag when
  owner or reviewed publication updates that Skill. Unrelated details/batches
  stay cached. Limit batch tags to 100.
- Reuse complete-input report analysis for an hour; keep its actual computation
  time stable. Source/statistics changes produce a different result key. These
  snapshots do not approve submissions or authorize installation/payment.
- Hoist query-invariant ranking work outside the candidate loop.
- Batch background publication/validation/discovery: 551 to 447 configured
  cron calls/day. Preserve user submissions every five minutes, the 1,000/day
  publication ceiling, review gates, and retry headroom (2,112 slots/day).
  New candidate discovery can wait up to three hours plus queue processing.
- Give training crawlers a narrower robots policy. Search bots and user-directed
  agents retain access. Robots compliance is voluntary.

## Firewall applied separately

An exact User-Agent rule was observed in log mode, tested as a preview deny,
then published as a production deny. Rule `rule_oas_limit_unowned_lightpanda_KF2MYv`
matches `Lightpanda/1.0` in production; `rule_oas_lightpanda_preview_deny_598GmT`
matches it in preview. Tests returned 403 for that agent and 200 for normal
browsing, Googlebot and Claude-User. A User-Agent match can be evaded by changing
the declared agent; it does not claim identity verification.

[Vercel's current policy](https://vercel.com/changelog/web-application-firewall-mitigated-traffic-is-free-on-vercel)
waives CDN Requests and Fast Data Transfer for WAF-mitigated traffic. Application
403 responses alone would not provide that cost protection.

## Validation and measurement

Regression tests include cached query isolation, source/statistics refresh,
transient failure recovery, per-Skill invalidation, API cache-tier separation,
unchanged auth/payment/review boundaries, all eight locales, and crawl policy.
Deployment requires passing regression, lint, typecheck, link check and build,
followed by actual HTML/RSC, cache, canonical and internal-route smoke checks.

Local release gates passed: `pnpm test`, read-only Agent connection contracts,
`pnpm test:links`, `pnpm typecheck`, `pnpm lint` (zero errors; 25 existing warnings),
and `pnpm build` (738 static pages; new registry cache routes generate on demand).
`scripts/check-public-cache.mjs` confirmed actual HITs for eight directories,
base/Chinese details and reports, contact/sponsor and noindex query variants;
filters remained private and internal URLs returned noindex 404. Browser checks
confirmed category filtering, English-to-Chinese switching with retained filters,
and resetting a dynamic filtered directory back to its cached default.

The local build's optional database reads used labelled fallbacks because direct
Node fetches were reset by the host network. Runtime verification used Node's
existing environment proxy (`NODE_USE_ENV_PROXY=1`) and actual public data.
This is a local invocation setting, not an application/deployment change.

Compare CPU/request, invocations, ISR writes, cache hits, errors and allowed
traffic over comparable 24–48-hour production windows. A cache HIT or historical
83% traffic share is not a measured savings percentage. Existing charges remain.
The unused $10 Speed Insights Plus subscription is a separate dashboard setting;
removing an application component would not cancel its subscription.

Rollback the application by reverting this release and redeploying the previous
revision. The firewall is independent: change these two named rules deliberately
if rollback of their policy is needed. There are no schema or credential changes.
