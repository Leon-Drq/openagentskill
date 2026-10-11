# Skills directory recovery — 2026-10-11

## Observed incident

The owner's open `/skills` tab showed the amber unavailable notice, an unknown
count and 16 saved cards. A fresh production request and a bounded Supabase
public read were healthy. Reloading that same browser tab restored 35,296
entries and removed the notice. The existing client had no retry control or
automatic recovery after a degraded server response.

The previous day's build logs recorded `exceed_egress_quota` (see
`resource-pages-upgrade-2026-10-10.md`). That is evidence of an upstream incident,
not proof of the exact error behind every subsequent degraded response. At this
investigation's start the Data API returned HTTP 200. No billing or spend-cap
settings were changed, and this code cannot remove a provider quota restriction.

## Fix

- A degraded directory offers a localized retry control in all eight languages.
  Refresh preserves the current route, filters and scroll. Healthy pages render
  no recovery controls and schedule no recovery requests.
- A degraded page tries automatically once after 65 seconds, while online and
  visible. If it was offline or hidden, the attempt waits until it returns.
  Manual retry consumes that automatic attempt. Repeated manual clicks have a
  60-second cooldown; a failed refresh retains the honest fallback notice.
- Supabase HTTP 402 and 429 no longer reset the circuit as successful responses.
  They immediately pause that workload. Quota errors wait at least 60 seconds;
  rate limits wait at least 15 seconds. Numeric/date `Retry-After` values are
  honored up to five minutes. One probe can recover the circuit afterward.
  Existing scope isolation, permission-error behavior and cancellation handling
  remain intact.

## Verification

- Full regression suite, typecheck and lint (0 errors; 25 existing warnings).
- Circuit regressions exercise 402/429, response-body preservation, numeric/date
  Retry-After, invalid/oversized hints, delayed old responses, continued failure
  and recovery after cooldown.
- A local-only fetch fixture simulated HTTP 402 without changing production
  data, credentials or billing. A failed manual retry retained the notice and
  disabled repeat clicks. Removing the fixture restored the Chinese
  `category=design-creative` page automatically to 3,118 entries with its filters
  intact. 320 px and 390 px checks showed no horizontal overflow.
- Production build passed (706 generated pages). Local build logs still include
  existing optional privileged-data warnings and bounded background query
  timeouts; the build completed successfully. Post-deployment checks are required
  before considering the release complete.
