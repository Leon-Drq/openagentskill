# Analytics instrumentation

GA4 is enabled only for a valid `NEXT_PUBLIC_GA_MEASUREMENT_ID` in the deployment.
The root layout mounts one tracker across locale routes. Consent remains denied
by default; events use the existing `trackAnalyticsEvent` consent gate and
revocation stops subsequent events. Advertising storage and personalization stay
denied. No extra application API, database write or paid analytics service is
introduced.

`outbound_link_click` is the uniform external navigation metric. One document
listener covers ordinary, keyboard-generated, modified and middle clicks,
including nested SVG icons. It ignores same-site apex/www links, downloads,
cancelled clicks, non-HTTP URLs and credential-bearing destinations. Event
parameters are destination hostname, intent (`github`, `social`, `docs`,
`marketplace`, `other`), `target` and bounded page placement. Link text, destination
paths, query strings and fragments are never sent. Dynamic task text and private
profile paths continue to be stripped from page location and acquisition fields.

Existing business events (`skill_outbound_github`, `partner_outbound`, etc.) remain
separate funnels; use only `outbound_link_click` when counting all external
navigations. Do not sum it with those business events or GA4's automatic `click`.
If Enhanced Measurement outbound clicks, site search, or history page views are
enabled in GA Admin, review those settings separately: they can collect raw URL,
search or history parameters independently of this custom privacy filter.
Disable the overlapping automatic features when using the custom events as the
reporting source. Repository code does not have GA Admin permission and does not
silently change collection settings there.

Directory search records query length, not content. `directory_results` includes
`zero_results` (false during degraded fetches). `directory_filter` reports changed
allowlisted keys and active filter count; it does not transmit filter values.
Existing install, submission, claim and GitHub connect events remain in their
shared components, used on desktop and mobile.

Validation: `pnpm test:growth-upgrade` covers consent, revocation, redaction,
listener cleanup, destinations, nested targets and click gestures. Deployment
verification must check the actual measurement ID and bootstrap, then the live
browser. Receiving a request is distinct from GA Realtime/DebugView ingestion;
only claim the latter after checking the authenticated GA property.
