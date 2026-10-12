import { createHash } from 'node:crypto'
import type Stripe from 'stripe'
import type { PaidOrder } from './policy'

// This merchant also serves other websites. Apply our storefront branding to
// each session instead of changing the account's business/legal identity.
export function checkoutSessionParams(order: PaidOrder, site: string): Stripe.Checkout.SessionCreateParams {
  const metadata = { order_id: order.id, user_id: order.user_id, integration: 'openagentskill' }
  const returnPath = `/profile?tab=purchases&lang=${encodeURIComponent(order.checkout_locale)}`
  // Stable across retries of the same immutable order.
  const suffix = [...createHash('sha256').update(order.id).digest().subarray(0, 8)].map(value => String.fromCharCode(97 + value % 26)).join('')
  return {
    mode: order.plan === 'single' ? 'payment' : 'subscription',
    customer: order.stripe_customer_id!, client_reference_id: order.id, metadata,
    branding_settings: {
      display_name: 'OpenAgentSkill', background_color: '#F8F7F3', button_color: '#006B4F', border_style: 'rounded',
    },
    line_items: [{ quantity: 1, ...(order.stripe_price_id ? { price: order.stripe_price_id } : { price_data: {
      currency: order.currency, unit_amount: order.amount_cents,
      product_data: { name: order.product_name, metadata: { skill_slug: order.skill_slug! } },
    } }) }],
    ...(order.plan === 'single' ? { payment_intent_data: { metadata } } : { subscription_data: { metadata } }),
    success_url: `${site}${returnPath}&checkout=processing`,
    cancel_url: `${site}${returnPath}&checkout=canceled`,
    integration_identifier: `openagentskill-${suffix}`,
    locale: (order.checkout_locale === 'id' ? 'auto' : order.checkout_locale) as Stripe.Checkout.SessionCreateParams.Locale,
  }
}
