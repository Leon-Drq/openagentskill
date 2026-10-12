import { createHash } from 'node:crypto'
import type Stripe from 'stripe'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { buyer, membershipFor, paidOrders, paymentBody, paymentDb, paymentError, PaymentError, paymentJson, paymentSite, productDefinition, releases, verifyPackage } from '@/lib/payments/server'
import { checkoutConfigured, membershipPrice, paymentMode, stripeClient, stripeId } from '@/lib/payments/stripe'
import { PLAN_AMOUNTS, safeStripeRedirect, type PaidOrder } from '@/lib/payments/policy'

export const runtime = 'nodejs'
const input = z.object({ plan: z.enum(['single', 'monthly', 'yearly']), slug: z.string().max(200).optional(), locale: z.enum(['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']).default('en') }).strict()
export async function POST(request: NextRequest) {
  try {
    const parsed = input.safeParse(await paymentBody(request))
    if (!parsed.success) throw new PaymentError('invalid_body')
    const user = await buyer()
    if (!checkoutConfigured()) throw new PaymentError('checkout_unavailable', 503)
    const { plan, slug, locale } = parsed.data
    const product = plan === 'single' && slug ? productDefinition(slug) : null
    if (plan === 'single' && !product) throw new PaymentError('product_not_found', 404)
    const available = await releases(product?.slug)
    const release = available[0]
    if (!release) throw new PaymentError('package_unavailable', 409)
    await verifyPackage(release)
    const [orders, membership] = await Promise.all([paidOrders(user.id), membershipFor(user.id)])
    if (membership || (product && orders.some(row => row.plan === 'single' && row.skill_slug === product.slug))) throw new PaymentError('already_purchased', 409)
    const stripe = stripeClient(), db = paymentDb(), live = paymentMode() === true
    const priceId = plan === 'single' ? null : membershipPrice(plan)
    if (plan !== 'single') {
      if (!priceId) throw new PaymentError('checkout_unavailable', 503)
      const price = await stripe.prices.retrieve(priceId)
      if (!price.active || price.livemode !== live || price.currency !== 'usd' || price.unit_amount !== PLAN_AMOUNTS[plan]
        || price.recurring?.interval !== (plan === 'yearly' ? 'year' : 'month') || price.recurring.interval_count !== 1) throw new PaymentError('checkout_unavailable', 503)
    }
    const customerRow = await db.from('commerce_customers').select('stripe_customer_id').eq('user_id', user.id).eq('livemode', live).maybeSingle()
    if (customerRow.error) throw customerRow.error
    let customer = customerRow.data?.stripe_customer_id as string | undefined
    if (!customer) {
      const created = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id, integration: 'openagentskill' } }, { idempotencyKey: `oas-customer-${live}-${user.id}` })
      customer = created.id
      const saved = await db.from('commerce_customers').upsert({ user_id: user.id, livemode: live, stripe_customer_id: customer }, { onConflict: 'user_id,livemode' })
      if (saved.error) throw saved.error
    }
    // Check Stripe too, including subscriptions whose first webhook is delayed.
    if (plan !== 'single') {
      const existing = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 })
      if (existing.has_more || existing.data.some(row => row.metadata.integration === 'openagentskill' && !['canceled', 'incomplete_expired'].includes(row.status))) throw new PaymentError('subscription_exists', 409)
    }
    const reserved = await db.rpc('commerce_reserve_order', { p_user: user.id, p_live: live, p_plan: plan,
      p_slug: product?.slug || null, p_release: product ? release.id : null, p_amount: PLAN_AMOUNTS[plan], p_customer: customer,
      p_locale: locale, p_name: product?.name || 'OpenAgentSkill Pro', p_price: priceId })
    if (reserved.error) throw reserved.error
    const order = reserved.data as PaidOrder
    if (order.plan !== plan) throw new PaymentError('other_checkout_pending', 409)
    if (order.stripe_session_id) {
      const existing = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
      const url = safeStripeRedirect(existing.url, 'checkout')
      if (existing.status === 'open' && url) return paymentJson({ url })
      throw new PaymentError(existing.status === 'complete' ? 'payment_processing' : 'checkout_expired', 409)
    }
    // An immutable order snapshot controls price and package. No client amounts,
    // Stripe IDs, user IDs, file paths or return URLs are accepted.
    const metadata = { order_id: order.id, user_id: user.id, integration: 'openagentskill' }
    const returnPath = `/profile?tab=purchases&lang=${encodeURIComponent(order.checkout_locale)}`
    // Derived from a random order UUID so retries send identical parameters.
    const suffix = [...createHash('sha256').update(order.id).digest().subarray(0, 8)].map(value => String.fromCharCode(97 + value % 26)).join('')
    const session = await stripe.checkout.sessions.create({
      mode: plan === 'single' ? 'payment' : 'subscription', customer, client_reference_id: order.id, metadata,
      line_items: [{ quantity: 1, ...(order.stripe_price_id ? { price: order.stripe_price_id } : { price_data: { currency: 'usd', unit_amount: order.amount_cents, product_data: { name: order.product_name, metadata: { skill_slug: order.skill_slug! } } } }) }],
      ...(plan === 'single' ? { payment_intent_data: { metadata } } : { subscription_data: { metadata } }),
      success_url: `${paymentSite()}${returnPath}&checkout=processing`,
      cancel_url: `${paymentSite()}${returnPath}&checkout=canceled`,
      integration_identifier: `openagentskill-${suffix}`, locale: (order.checkout_locale === 'id' ? 'auto' : order.checkout_locale) as Stripe.Checkout.SessionCreateParams.Locale,
    }, { idempotencyKey: `oas-checkout-${order.id}` })
    const linked = await db.from('commerce_orders').update({ stripe_session_id: session.id }).eq('id', order.id).or(`stripe_session_id.is.null,stripe_session_id.eq.${session.id}`)
    if (linked.error) throw linked.error
    if (stripeId(session.customer) !== customer) throw new Error('customer_mismatch')
    const url = safeStripeRedirect(session.url, 'checkout')
    if (!url) throw new Error('invalid_checkout_url')
    return paymentJson({ url })
  } catch (error) { return paymentError(error) }
}
