import 'server-only'
import Stripe from 'stripe'
import { activeMembership, PLAN_AMOUNTS } from './policy'

export function paymentMode() {
  const key = process.env.STRIPE_SECRET_KEY || ''
  if (/^(rk|sk)_live_/.test(key)) return true
  if (/^(rk|sk)_test_/.test(key)) return false
  return null
}
export function stripeClient() {
  if (paymentMode() === null) throw new Error('stripe_not_configured')
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-09-30.endive', maxNetworkRetries: 2, timeout: 15000,
    appInfo: { name: 'OpenAgentSkill', url: 'https://www.openagentskill.com' },
  })
}
export function checkoutConfigured() {
  return process.env.COMMERCE_CHECKOUT_ENABLED === 'true' && paymentMode() !== null
    && Boolean(process.env.STRIPE_WEBHOOK_SECRET)
    && (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV !== 'production' || paymentMode() === true)
}
export const stripeId = (value: string | { id: string } | null | undefined) => typeof value === 'string' ? value : value?.id || null
export const membershipPrice = (plan: 'monthly' | 'yearly') => process.env[plan === 'yearly' ? 'STRIPE_PRICE_PRO_YEARLY' : 'STRIPE_PRICE_PRO_MONTHLY'] || null

// Re-read payment state before delivery. A delayed refund/dispute webhook must
// never extend access, even if a local entitlement still says "paid".
export async function inspectPayment(stripe: Stripe, intentId: string) {
  const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ['latest_charge'] })
  const charge = intent.latest_charge
  if (intent.livemode !== paymentMode()) throw new Error('payment_mode_mismatch')
  if (!charge || typeof charge === 'string' || intent.status !== 'succeeded' || !charge.paid) return { paid: false, reason: 'pending' as const }
  if (charge.disputed) return { paid: false, reason: 'disputed' as const }
  // A partial goodwill refund keeps the purchase; a full refund revokes it.
  if (charge.refunded || charge.amount_refunded >= charge.amount) return { paid: false, reason: 'refunded' as const }
  return { paid: true, reason: 'paid' as const, intent }
}

export async function inspectMembership(stripe: Stripe, subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['latest_invoice'] })
  const item = subscription.items.data[0]
  const invoice = subscription.latest_invoice
  const price = item?.price
  const plan = price?.recurring?.interval === 'year' ? 'yearly' : 'monthly'
  const eligible = subscription.livemode === paymentMode() && subscription.metadata.integration === 'openagentskill'
    && subscription.items.data.length === 1 && price?.id === membershipPrice(plan)
    && price?.currency === 'usd' && price?.unit_amount === PLAN_AMOUNTS[plan]
    && price.recurring?.interval_count === 1 && !subscription.pause_collection
  let paid = false
  if (eligible && invoice && typeof invoice !== 'string' && invoice.status === 'paid' && invoice.amount_paid > 0) {
    const payments = await stripe.invoicePayments.list({ invoice: invoice.id, status: 'paid', limit: 100 })
    const intents = payments.data.map(payment => stripeId(payment.payment.payment_intent)).filter((id): id is string => Boolean(id))
    // Our Checkout never grants free trials, credit-only invoices or invoices
    // marked paid out of band. Only settled Stripe payments grant access.
    const settled = await Promise.all(intents.map(id => inspectPayment(stripe, id)))
    paid = !payments.has_more && intents.length > 0 && settled.every(result => result.paid)
      && settled.reduce((sum, result) => sum + (result.intent?.amount_received || 0), 0) >= invoice.amount_paid
  }
  return { subscription, periodEnd: item?.current_period_end || 0,
    active: Boolean(eligible && activeMembership(subscription.status, item?.current_period_end || 0, paid)) }
}
