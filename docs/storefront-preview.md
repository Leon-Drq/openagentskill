# Workflow store frontend preview

## Scope

Local frontend upgrade alongside the existing registry. Routes under `/marketplace`
are gated by `NEXT_PUBLIC_STOREFRONT_PREVIEW=true` and all inherit `noindex,nofollow`.
Do not enable this flag for a production deployment. Public skill URLs, canonical
metadata, structured data, sitemap, localization and ISR remain unchanged.

The design keeps the existing paper, ink and green palette (#f8f7f3, #20231f,
#006b4f, #dddbd4, #e8eee3), Inter body and Georgia display type. Original interface
illustrations show the concept without claiming third-party outputs as products.

## Routes and flows

- `/marketplace?lang=zh`: collection; category, access, search and price sorting.
- `/marketplace/workflows/studio-portfolio?lang=zh`: preview, costs and acquisition.
- `/marketplace/checkout/studio-portfolio?lang=zh`: explicit simulated checkout.
- `/marketplace/success?order=DEMO-…&lang=zh`: validates the local demo order.
- `/marketplace/library?lang=zh`: acquired samples, saved items, demo orders.
- `/marketplace/publish?lang=zh`: validated local listing draft and live card preview.

English and Chinese preview copy is included. Other existing site locales are
untouched. Product prose is rendered in initial HTML, and navigation uses links.
The preview's All skills link opens the live registry in a separate tab; the
prototype stays open and does not depend on local access to the registry database.

## Boundaries

Every product and price is a first-party concept fixture, not a live offer.
No third-party registry listing is repriced, gated or published. No database,
Stripe, review, auth or production entitlement is mutated. Demo state uses its
own localStorage namespace; parsing is defensive and unavailable storage falls
back to the session. Native dialogs provide keyboard focus containment and Escape.
The downloaded ZIP contains only a clearly marked sample README and SKILL.md.

Paid and free-plus-paid full editions require the explicit simulated checkout;
Basic acquisitions create no order. Repeated acquisition is idempotent. An invalid
success URL does not create a success state. Changing language preserves filters.

## Production integration still required

Replace concept fixtures with verified offers and seller authorization; add
server-owned prices, authenticated orders, Stripe Checkout/webhook verification,
server-side entitlements and private package delivery. Browser state is never a
payment or download security boundary. Finalize license, update and refund terms
before enabling real purchases. Extend the new copy to all supported locales.

Do not reuse these preview prices in JSON-LD or the agent registry. Keep public
product content cacheable and fetch account entitlements separately when the real
store ships. Pricing filters belong to authoritative offer data, not GitHub
visibility or license guesses. Existing directory totals must remain meaningful.

## Local verification (2026-09-28)

Run with `NEXT_PUBLIC_STOREFRONT_PREVIEW=true pnpm dev --port 3011` (set the
environment variable using the syntax appropriate for your shell).

- Full existing regression suite, new storefront tests, typecheck, changed-file
  lint, repository links and HTTP noindex/SSR checks passed.
- `next build --experimental-build-mode compile` passed for the complete app.
- Full `pnpm build` did not pass: existing localized registry prerendering hit
  the `Public directory temporarily unavailable` guard. Reducing build workers
  did not resolve it. Direct public Supabase access timed out in this local
  environment; the configured local proxy could read a row in about 3 seconds,
  but a proxy-enabled build still exceeded the directory deadline. No
  empty-directory guard or production query timeout was
  changed to make the preview pass. Full build verification is still required
  before a future deployment; compile mode alone is not a deployable build.
- Browser checks cover price filters, empty search, paid demo checkout, saved
  workflows, library persistence, the setup dialog, copy and mobile layout.
- ZIP output was independently opened using System.IO.Compression.ZipFile.
