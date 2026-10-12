import 'server-only'
import type Stripe from 'stripe'
import { paymentDb } from './server'
import { inspectMembership, inspectPayment, paymentMode, stripeId } from './stripe'
import type { PaidOrder } from './policy'

export function assertSessionOrder(session: Stripe.Checkout.Session, order: PaidOrder) {
  if (session.metadata?.integration !== 'openagentskill' || session.metadata.order_id !== order.id
    || session.metadata.user_id !== order.user_id || session.client_reference_id !== order.id
    || session.livemode !== order.livemode || stripeId(session.customer) !== order.stripe_customer_id
    || session.currency !== order.currency || session.amount_total !== order.amount_cents
    || session.mode !== (order.plan === 'single' ? 'payment' : 'subscription')
    || (order.stripe_session_id && order.stripe_session_id !== session.id)) throw new Error('order_binding_mismatch')
}

async function syncSubscription(stripe: Stripe, subscriptionId: string, db: ReturnType<typeof paymentDb>) {
  const state = await inspectMembership(stripe, subscriptionId)
  const subscription = state.subscription
  if (subscription.metadata.integration !== 'openagentskill') return
  const { data: order, error } = await db.from('commerce_orders').select('*').eq('id', subscription.metadata.order_id).maybeSingle()
  if (error) throw error
  if (!order || order.plan === 'single' || subscription.metadata.user_id !== order.user_id
    || stripeId(subscription.customer) !== order.stripe_customer_id || subscription.livemode !== order.livemode) throw new Error('subscription_binding_mismatch')
  const result = await db.from('commerce_subscriptions').upsert({ stripe_subscription_id: subscription.id,
    user_id: order.user_id, livemode: subscription.livemode, status: subscription.status,
    current_period_end: state.periodEnd ? new Date(state.periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end, updated_at: new Date().toISOString() })
  if (result.error) throw result.error
}

async function checkout(stripe: Stripe, sessionId: string, event: Stripe.Event, db: ReturnType<typeof paymentDb>) {
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.metadata?.integration !== 'openagentskill') return
  const { data: order, error } = await db.from('commerce_orders').select('*').eq('id', session.metadata.order_id).maybeSingle()
  if (error) throw error
  if (!order) throw new Error('order_not_found')
  assertSessionOrder(session, order)
  if (session.status === 'expired') {
    const result = await db.from('commerce_orders').update({ status: 'expired' }).eq('id', order.id).eq('status', 'pending')
    if (result.error) throw result.error
    return
  }
  const subscriptionId = stripeId(session.subscription), intentId = stripeId(session.payment_intent)
  if (subscriptionId) await syncSubscription(stripe, subscriptionId, db)
  if (session.payment_status !== 'paid' || session.status !== 'complete') {
    if (event.type === 'checkout.session.async_payment_failed') {
      const failed = await db.from('commerce_orders').update({ status: 'failed' }).eq('id', order.id).eq('status', 'pending')
      if (failed.error) throw failed.error
    }
    return
  }
  if (order.plan === 'single') {
    if (!intentId) throw new Error('payment_not_found')
    const state = await inspectPayment(stripe, intentId)
    if (!state.paid) {
      if (state.reason === 'refunded' || state.reason === 'disputed') {
        const result = await db.from('commerce_orders').update({ status: state.reason, stripe_payment_intent_id: intentId }).eq('id', order.id)
        if (result.error) throw result.error
      }
      return
    }
    if (!state.intent || state.intent.metadata.order_id !== order.id || state.intent.amount_received !== order.amount_cents || state.intent.currency !== order.currency) throw new Error('payment_binding_mismatch')
  } else if (!subscriptionId) throw new Error('subscription_missing')
  const result = await db.rpc('commerce_complete_order', { p_order: order.id, p_session: session.id,
    p_intent: intentId, p_subscription: subscriptionId, p_paid_at: new Date(event.created * 1000).toISOString() })
  if (result.error) throw result.error
}

export async function processStripeEvent(stripe: Stripe, event: Stripe.Event, db = paymentDb()) {
  if (event.livemode !== paymentMode()) throw new Error('event_mode_mismatch')
  const previous = await db.from('commerce_webhook_events').select('id').eq('id', event.id).maybeSingle()
  if (previous.error) throw previous.error
  if (previous.data) return
  const object = event.data.object as { id: string }
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired'].includes(event.type)) {
    await checkout(stripe, object.id, event, db)
  } else if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'customer.subscription.paused', 'customer.subscription.resumed'].includes(event.type)) {
    await syncSubscription(stripe, object.id, db)
  } else if (['invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required'].includes(event.type)) {
    const invoice = await stripe.invoices.retrieve(object.id)
    const subscriptionId = stripeId(invoice.parent?.subscription_details?.subscription)
    if (subscriptionId) await syncSubscription(stripe, subscriptionId, db)
  } else if (['charge.refunded', 'charge.dispute.created', 'charge.dispute.closed'].includes(event.type)) {
    const chargeId = event.type === 'charge.refunded' ? event.data.object.id : stripeId((event.data.object as Stripe.Dispute).charge)
    if (!chargeId) throw new Error('charge_missing')
    const charge = await stripe.charges.retrieve(chargeId)
    const intentId = stripeId(charge.payment_intent)
    if (intentId) {
      const state = await inspectPayment(stripe, intentId)
      const intent = await stripe.paymentIntents.retrieve(intentId)
      if (intent.metadata.integration === 'openagentskill' && intent.metadata.order_id && ['refunded', 'disputed'].includes(state.reason)) {
        const result = await db.from('commerce_orders').update({ status: state.reason, stripe_payment_intent_id: intentId })
          .eq('id', intent.metadata.order_id).eq('livemode', event.livemode)
        if (result.error) throw result.error
      }
    }
    // Membership downloads always re-read the current invoice and charge;
    // refunds on subscription payments cannot survive a delayed webhook.
  }
  // Record only after all side effects commit. A failed attempt returns 5xx so
  // Stripe retries. Every effect above is idempotent; revoked orders stay revoked.
  const recorded = await db.from('commerce_webhook_events').upsert({ id: event.id, livemode: event.livemode, event_type: event.type }, { onConflict: 'id', ignoreDuplicates: true })
  if (recorded.error) throw recorded.error
}
