import { createHash } from 'node:crypto'
import type Stripe from 'stripe'
import type { PaidOrder } from './policy'
import { recurringPlan } from './policy'

// This merchant also serves other websites. Apply our storefront branding to
// each session instead of changing the account's business/legal identity.
export function checkoutSessionParams(order: PaidOrder, site: string): Stripe.Checkout.SessionCreateParams {
  const metadata = { order_id: order.id, user_id: order.user_id, integration: 'openagentskill' }
  const motion = order.skill_slug?.startsWith('motion-')
  const returnPath = motion
    ? `${order.checkout_locale === 'zh' ? '/zh' : ''}/skills/${encodeURIComponent(order.skill_slug!)}?lang=${encodeURIComponent(order.checkout_locale)}`
    : `/profile?tab=purchases&lang=${encodeURIComponent(order.checkout_locale)}`
  // Stable across retries of the same immutable order.
  const suffix = [...createHash('sha256').update(order.id).digest().subarray(0, 8)].map(value => String.fromCharCode(97 + value % 26)).join('')
  return {
    mode: recurringPlan(order.plan) ? 'subscription' : 'payment',
    customer: order.stripe_customer_id!, client_reference_id: order.id, metadata,
    branding_settings: {
      display_name: 'OpenAgentSkill', background_color: '#F8F7F3', button_color: '#006B4F', border_style: 'rounded',
    },
    line_items: [{ quantity: 1, ...(order.stripe_price_id ? { price: order.stripe_price_id } : { price_data: {
      currency: order.currency, unit_amount: order.amount_cents,
      product_data: { name: order.product_name, metadata: order.skill_slug ? { skill_slug: order.skill_slug } : { plan: order.plan }, ...(motion ? {
        description: order.checkout_locale === 'zh' ? '付款确认后解锁原始提示词或 Skill 指令，支持阅读、复制与 TXT 下载。' : 'Unlock the original prompt or Skill instructions to read, copy and download as text.',
      } : {}) },
    } }) }],
    ...(recurringPlan(order.plan) ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
    success_url: `${site}${returnPath}&checkout=processing`,
    cancel_url: `${site}${returnPath}&checkout=canceled`,
    integration_identifier: `openagentskill-${suffix}`,
    locale: (order.checkout_locale === 'id' ? 'auto' : order.checkout_locale) as Stripe.Checkout.SessionCreateParams.Locale,
  }
}
