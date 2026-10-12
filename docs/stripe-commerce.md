# Stripe payments and protected Skill downloads

This release adds hosted Stripe Checkout, a signed webhook, a private purchase library at `/profile?tab=purchases`, a billing portal, and short-lived private downloads. It does not sell unfinished reference previews. Community submissions and review scores are unchanged.

## Server configuration

Set these in the **openagentskill** Vercel project, never in client variables:

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Prefer a restricted server key for the intended Stripe account. Checkout Sessions, Customers and Billing Portal sessions need write access; Prices, Subscriptions, Invoices, Invoice Payments, PaymentIntents and Charges need read access. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this deployment's webhook endpoint. |
| `STRIPE_PRICE_PRO_MONTHLY` | Active USD 9.99 monthly recurring price, interval count 1. |
| `STRIPE_PRICE_PRO_YEARLY` | Active USD 79 yearly recurring price, interval count 1. |
| `STRIPE_BILLING_PORTAL_CONFIGURATION` | OpenAgentSkill's dedicated customer portal configuration; required before checkout can open. Other applications can keep their own portal settings. |
| `COMMERCE_SITE_URL` | `https://www.openagentskill.com` in production. |
| `COMMERCE_CHECKOUT_ENABLED` | Set `true` only after sandbox checkout, webhook and download verification. Set `false` to stop new purchases; existing downloads and billing remain available. |
| `SUPABASE_SECRET_KEY` | Existing server-side Supabase credential. |

Use a separate Stripe sandbox for development. Keep sandbox credentials and webhook endpoints separate from production. Production Vercel deployments reject checkout with a test key. SDK 23.0.0 and webhook API version **2026-09-30.endive** are pinned together. A CLI login authorizes setup; it does not by itself install a persistent server key.

Register `/api/payments/webhook` with snapshot payloads and these events:

```
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.paused
customer.subscription.resumed
invoice.paid
invoice.payment_failed
invoice.payment_action_required
charge.refunded
charge.dispute.created
charge.dispute.closed
```

Configure the dedicated customer portal to show invoices, update payment methods and cancel at period end. Do not enable plan changes, trials or discounts without adding and testing their entitlement rules. Payment methods use Stripe's dynamic Dashboard configuration. Automatic tax is not enabled; it requires an active tax registration and a separate explicit configuration.

## Packages

The migration creates RLS-protected commerce tables and a **private** `skill-packages` bucket. No browser role can write orders or read package objects. A finished release has an immutable version, object path, SHA-256 and size. The application only accepts known first-party product slugs, and checks that a published file exists before creating checkout.

After reviewing a completed package's output against its public preview, publish it with:

```sh
node --env-file=.env.commerce.local scripts/publish-commerce-package.mjs --slug launch-card-studio --version 1.1.0 --file /absolute/path/finished.zip --verified-output
```

This flag records the operator's responsibility; the command does not claim to visually verify an animation. It checks archive shape, known slug, withdrawal marker, private bucket, immutable version and uploaded checksum. Never use `artifacts/motion-studio-v1`: it is explicitly withdrawn. The 233 motion references are still marked `not-verified`; none become purchasable just because the payment integration is configured. A fresh faithfully reproduced package is required for each.

## Fulfillment and access

- The server chooses the USD 4.99 single purchase or configured Pro price. Client-supplied amounts, users, Stripe IDs, file paths and redirect URLs are rejected.
- A database lock reserves a pending order per buyer/product (one shared key for monthly/yearly membership). Retries reuse the same Checkout idempotency key and immutable price, title and locale. Buyers can expire an unfinished session from their library before switching billing cycles.
- Only a valid signed webhook records payment completion. The return page polls the library and never grants access. Failed processing returns 503 for Stripe retries. Events are recorded after idempotent changes complete.
- Orders bind session, customer, user, currency, amount and live/test mode. A fully refunded/disputed single order cannot be restored by a late completion event.
- Single purchases retain access to the purchased version and releases within 12 months of payment. Later updates are excluded; purchased versions remain downloadable unless withdrawn.
- Every download re-reads the actual Stripe payment or current subscription and settled invoice. Full refunds, disputes, unpaid invoices, expired/canceled subscriptions and cross-account requests fail closed. Partial refunds retain access. Disputed single orders require operator review before restoration even if the dispute is later won.
- Private URLs expire after 60 seconds. They are bearer URLs valid during that window; revocation cannot recall an already downloaded file.
- Pro orders record the initial purchase. Renewals and invoice history are available through Stripe's billing portal. The membership library includes only published packages.

## Verification

`pnpm test:payments` covers real policy/handler code using deterministic Stripe and database adapters: ownership, server price binding, mode isolation, original-version access, update cutoff, subscription expiry, refunds/disputes, async settlement, replay, partial failure retries, late events, CSRF, redirects and Stripe signature validation. `pnpm test`, typecheck, lint and production build remain required.

Before enabling production checkout, run a real sandbox purchase and inspect the webhook and private download with two accounts; test asynchronous failure, replay, full refund, subscription cancellation/renewal and expiry. Adapter tests are not a claim that a real Stripe transaction has succeeded.

### Sandbox verification, 2026-10-13

The isolated `OpenAgentSkill QA` Stripe sandbox completed hosted single-purchase and monthly-subscription checkouts. Real signed events reached the application's webhook through the official Stripe CLI. Verification used two dedicated application accounts and the private Launch Card Studio 1.1.0 ZIP, whose renderer output matches all three public SVG previews.

Verified against the actual Stripe and Supabase APIs: declined-card access denial, checkout retry idempotency, paid fulfillment, private download SHA-256, cross-account denial, full-refund revocation, older completion-event replay, billing portal creation, cancellation at period end, paid renewal with a Stripe test clock, and download revocation when the paid period ended. Asynchronous settlement/failure remains covered by the regression adapters; no real delayed-payment transaction is claimed. Production validation must not submit a real charge merely to test the integration.

The merchant selected by the owner is `qudongqi.ai` (`acct_1STM522WEAq3tdU2`). Production uses a dedicated restricted server key, webhook and portal. Launch Card Studio is the only published downloadable package at this point; the 233 motion references remain unavailable for purchase until their matching packages are completed.

### Storefront branding and catalog coverage

Every new single-purchase and Pro Checkout Session sets `branding_settings.display_name` to `OpenAgentSkill`, with the site's warm background and green button. This changes the Checkout storefront, not the shared merchant's legal identity, bank account, receipts or other applications. Previously created sessions retain their original appearance.

All 234 first-party product slugs (Launch Card Studio and the 233 motion Skills) are registered with the shared checkout, fulfillment, purchase library and private download endpoints. Regression tests cover the complete catalog's product binding and download isolation. Registering a product does not publish a file: each motion package still needs its own completed, verified release. Publishing that release enables its existing purchase actions automatically; no separate per-Skill Stripe integration is required.

On 2026-10-13, all 234 production `/api/payments/status?slug=...` responses returned HTTP 200: 1 ready package and 233 awaiting packages, with no unregistered products or endpoint errors. This audit checks integration coverage, not completion of the motion reproductions.
