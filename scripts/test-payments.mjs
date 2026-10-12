import assert from 'node:assert/strict'
import Stripe from 'stripe'
import { NextRequest } from 'next/server'
import { activeMembership, singleReleaseAllowed, validRelease, safeStripeRedirect } from '../lib/payments/policy.ts'
import { inspectPayment, inspectMembership, checkoutConfigured } from '../lib/payments/stripe.ts'
import { assertSessionOrder, processStripeEvent } from '../lib/payments/webhook.ts'
import { POST as checkoutPost } from '../app/api/payments/checkout/route.ts'
import { POST as downloadPost } from '../app/api/payments/download/route.ts'
import { POST as webhookPost } from '../app/api/payments/webhook/route.ts'

// No real credentials or network requests. Exercise the real policy and webhook
// handler with a deterministic Stripe transport and database adapter.
process.env.STRIPE_SECRET_KEY = 'sk_test_unit_fixture_not_a_key'
process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_month'
process.env.STRIPE_PRICE_PRO_YEARLY = 'price_year'
const secret = 'whsec_unit_fixture_not_a_secret'
process.env.STRIPE_WEBHOOK_SECRET = secret
const release = { id: 'release-1', skill_slug: 'launch-card-studio', version: '1.1.0', sha256: 'a'.repeat(64),
  object_path: `launch-card-studio/1.1.0/${'a'.repeat(64)}.zip`, size_bytes: 100, released_at: '2026-01-01T00:00:00Z', withdrawn: false }
const order = { id: 'order-1', user_id: 'buyer-1', skill_slug: 'launch-card-studio', plan: 'single', livemode: false, currency: 'usd', amount_cents: 499,
  status: 'pending', release_id: release.id, stripe_customer_id: 'cus_1', stripe_session_id: 'cs_1', stripe_payment_intent_id: null }
assert.ok(validRelease(release, release.skill_slug))
for (const bad of [{ withdrawn: true }, { sha256: 'x' }, { size_bytes: 0 }, { object_path: '../private.zip' }, { released_at: '2999-01-01' }]) assert.equal(validRelease({ ...release, ...bad }, release.skill_slug), false)
const owned = { ...order, status: 'paid', updates_until: '2027-01-01T00:00:00Z' }
assert.ok(singleReleaseAllowed(owned, release, 'buyer-1', false))
for (const [who, live, status] of [['buyer-2', false, 'paid'], ['buyer-1', true, 'paid'], ['buyer-1', false, 'pending'], ['buyer-1', false, 'refunded'], ['buyer-1', false, 'disputed']]) assert.equal(singleReleaseAllowed({ ...owned, status }, release, who, live), false)
const update = { ...release, id: 'release-2', released_at: '2026-10-01T00:00:00Z' }
assert.ok(singleReleaseAllowed(owned, update, 'buyer-1', false))
assert.equal(singleReleaseAllowed({ ...owned, updates_until: '2026-09-01' }, update, 'buyer-1', false), false)
assert.ok(singleReleaseAllowed({ ...owned, updates_until: '2020-01-01' }, release, 'buyer-1', false), 'original purchase remains downloadable after update window')
assert.ok(activeMembership('active', 200, true, 100000))
for (const args of [['past_due', 200, true], ['canceled', 200, true], ['trialing', 200, true], ['active', 99, true], ['active', 200, false]]) assert.equal(activeMembership(...args, 100000), false)
assert.equal(safeStripeRedirect('https://checkout.stripe.com/c/pay/cs_1', 'checkout'), 'https://checkout.stripe.com/c/pay/cs_1')
for (const url of ['javascript:alert(1)', 'https://checkout.stripe.com.evil.com', 'https://user@checkout.stripe.com', 'http://checkout.stripe.com']) assert.equal(safeStripeRedirect(url, 'checkout'), null)
assert.equal(checkoutConfigured(), false, 'checkout defaults off even with credentials')
process.env.COMMERCE_CHECKOUT_ENABLED = 'true'
delete process.env.STRIPE_BILLING_PORTAL_CONFIGURATION
assert.equal(checkoutConfigured(), false, 'checkout requires the dedicated billing portal, not the shared merchant default')
process.env.STRIPE_BILLING_PORTAL_CONFIGURATION = 'bpc_unit_fixture'
assert.equal(checkoutConfigured(), true)
delete process.env.COMMERCE_CHECKOUT_ENABLED

const charge = { paid: true, disputed: false, refunded: false, amount: 499, amount_refunded: 0 }
const intent = { id: 'pi_1', status: 'succeeded', livemode: false, amount_received: 499, currency: 'usd', metadata: { integration: 'openagentskill', order_id: order.id }, latest_charge: charge }
const session = { id: 'cs_1', metadata: { order_id: order.id, user_id: order.user_id, integration: 'openagentskill' }, client_reference_id: order.id,
  customer: 'cus_1', currency: 'usd', amount_total: 499, mode: 'payment', livemode: false, status: 'complete', payment_status: 'paid', payment_intent: 'pi_1' }
const subscription = { id: 'sub_1', livemode: false, metadata: { integration: 'openagentskill', user_id: 'buyer-1' }, status: 'active', pause_collection: null,
  items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 3600, price: { id: 'price_month', unit_amount: 999, currency: 'usd', recurring: { interval: 'month', interval_count: 1 } } }] },
  latest_invoice: { id: 'in_1', status: 'paid', amount_paid: 999 } }
const stripe = { paymentIntents: { retrieve: async () => intent }, checkout: { sessions: { retrieve: async () => session } },
  subscriptions: { retrieve: async () => subscription }, invoicePayments: { list: async () => ({ has_more: false, data: [{ payment: { payment_intent: 'pi_1' } }] }) },
  charges: { retrieve: async () => ({ ...charge, payment_intent: 'pi_1' }) } }
assertSessionOrder(session, order)
for (const change of [{ metadata: {} }, { customer: 'cus_other' }, { currency: 'eur' }, { amount_total: 1 }, { livemode: true }, { client_reference_id: 'order-2' }, { mode: 'subscription' }]) assert.throws(() => assertSessionOrder({ ...session, ...change }, order))
assert.ok((await inspectPayment(stripe, 'pi_1')).paid)
charge.amount_refunded = 100; assert.ok((await inspectPayment(stripe, 'pi_1')).paid, 'partial refund preserves access')
charge.amount_refunded = 499; assert.equal((await inspectPayment(stripe, 'pi_1')).paid, false)
charge.amount_refunded = 0; charge.disputed = true; assert.equal((await inspectPayment(stripe, 'pi_1')).paid, false)
charge.disputed = false
intent.amount_received = 999
assert.ok((await inspectMembership(stripe, 'sub_1')).active)
subscription.status = 'past_due'; assert.equal((await inspectMembership(stripe, 'sub_1')).active, false)
subscription.status = 'active'; charge.refunded = true; assert.equal((await inspectMembership(stripe, 'sub_1')).active, false)
charge.refunded = false; subscription.items.data[0].price.id = 'price_other'; assert.equal((await inspectMembership(stripe, 'sub_1')).active, false)
subscription.items.data[0].price.id = 'price_month'
intent.amount_received = 499

const events = new Map(), orders = new Map([[order.id, order]])
let failRecord = false, fulfillments = 0
const db = {
  from(table) {
    let op = 'select', value, filters = []
    const rows = table === 'commerce_orders' ? orders : events
    const execute = () => {
      if (op === 'upsert') {
        if (failRecord) return { data: null, error: new Error('database temporarily unavailable') }
        rows.set(value.id, value); return { data: value, error: null }
      }
      const row = [...rows.values()].find(row => filters.every(([key, val]) => row[key] === val))
      if (op === 'update' && row) Object.assign(row, value)
      return { data: row || null, error: null }
    }
    const query = { select() { return query }, eq(key, val) { filters.push([key, val]); return query }, maybeSingle() { return Promise.resolve(execute()) },
      update(next) { op = 'update'; value = next; return query }, upsert(next) { op = 'upsert'; value = next; return query }, then(resolve) { return Promise.resolve(execute()).then(resolve) } }
    return query
  },
  async rpc(name, args) {
    assert.equal(name, 'commerce_complete_order')
    const row = orders.get(args.p_order)
    if (!['refunded', 'disputed'].includes(row.status)) {
      if (row.status !== 'paid') fulfillments++
      Object.assign(row, { status: 'paid', stripe_payment_intent_id: args.p_intent, paid_at: row.paid_at || args.p_paid_at })
    }
    return { error: null }
  },
}
const event = { id: 'evt_1', type: 'checkout.session.completed', livemode: false, created: Math.floor(Date.now() / 1000), data: { object: { id: 'cs_1' } } }
session.payment_status = 'unpaid'
await processStripeEvent(stripe, event, db)
assert.equal(order.status, 'pending', 'unsettled async payment does not deliver')
session.payment_status = 'paid'
await processStripeEvent(stripe, { ...event, id: 'evt_2', type: 'checkout.session.async_payment_succeeded' }, db)
assert.equal(order.status, 'paid')
await processStripeEvent(stripe, { ...event, id: 'evt_2', type: 'checkout.session.async_payment_succeeded' }, db)
assert.equal(fulfillments, 1, 'duplicate webhook grants once')
failRecord = true
await assert.rejects(processStripeEvent(stripe, { ...event, id: 'evt_3' }, db))
failRecord = false
await processStripeEvent(stripe, { ...event, id: 'evt_3' }, db)
assert.equal(fulfillments, 1, 'retry after partial processing is idempotent')
charge.refunded = true
await processStripeEvent(stripe, { ...event, id: 'evt_refund', type: 'charge.refunded', data: { object: { id: 'ch_1' } } }, db)
assert.equal(order.status, 'refunded')
await processStripeEvent(stripe, { ...event, id: 'evt_stale' }, db)
assert.equal(order.status, 'refunded', 'late payment event cannot restore a refunded purchase')
await assert.rejects(processStripeEvent(stripe, { ...event, id: 'evt_live', livemode: true }, db))

const request = (path, body, origin = 'https://www.openagentskill.com') => new NextRequest(`https://www.openagentskill.com/api/payments/${path}`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) })
assert.equal((await checkoutPost(request('checkout', { plan: 'single', slug: 'launch-card-studio' }, 'https://evil.example'))).status, 403)
assert.equal((await checkoutPost(request('checkout', { plan: 'single', slug: 'launch-card-studio', amount: 1 }))).status, 400)
assert.equal((await downloadPost(request('download', { slug: '../private' }))).status, 400)
assert.equal((await downloadPost(request('download', { slug: 'launch-card-studio' }, 'https://evil.example'))).status, 403)
assert.equal((await webhookPost(request('webhook', event))).status, 400)
const sdk = new Stripe(process.env.STRIPE_SECRET_KEY)
const payload = JSON.stringify(event)
const signature = sdk.webhooks.generateTestHeaderString({ payload, secret })
assert.equal(sdk.webhooks.constructEvent(payload, signature, secret).id, event.id)
assert.throws(() => sdk.webhooks.constructEvent(payload + ' ', signature, secret))
assert.throws(() => sdk.webhooks.constructEvent(payload, sdk.webhooks.generateTestHeaderString({ payload, secret, timestamp: 1 }), secret))
console.log('Payments: ownership, release/update rights, mode separation, server amount binding, async settlement, duplicate/retried/stale webhooks, refunds, membership expiry, CSRF, URL allowlist and Stripe signatures passed.')
