import assert from 'node:assert/strict'
import Stripe from 'stripe'
import { NextRequest } from 'next/server'
import { activeMembership, singleReleaseAllowed, lifetimeOrderAllowed, validRelease, safeStripeRedirect } from '../lib/payments/policy.ts'
import { inspectPayment, inspectMembership, inspectLifetime, checkoutConfigured } from '../lib/payments/stripe.ts'
import { assertSessionOrder, processStripeEvent } from '../lib/payments/webhook.ts'
import { POST as checkoutPost } from '../app/api/payments/checkout/route.ts'
import { POST as downloadPost } from '../app/api/payments/download/route.ts'
import { POST as contentPost } from '../app/api/payments/content/route.ts'
import { POST as webhookPost } from '../app/api/payments/webhook/route.ts'
import { checkoutSessionParams } from '../lib/payments/checkout.ts'
import { productDefinition } from '../lib/payments/server.ts'
import { MOTION_ENTRIES } from '../lib/motion/catalog.ts'
import { STUDIO_SKILL } from '../lib/studio/catalog.ts'

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
for (const kind of ['prompt', 'skill-instructions']) {
  const textRelease = { ...release, delivery_kind: kind, object_path: release.object_path.replace('.zip','.txt') }
  assert.ok(validRelease(textRelease, release.skill_slug))
  assert.equal(validRelease({ ...textRelease, object_path: release.object_path }, release.skill_slug), false)
  assert.equal(validRelease({ ...textRelease, size_bytes: 1048577 }, release.skill_slug), false)
}
assert.equal(validRelease({ ...release, delivery_kind: 'anything' }, release.skill_slug), false)
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
const intent = { id: 'pi_1', customer: 'cus_1', status: 'succeeded', livemode: false, amount_received: 499, currency: 'usd', metadata: { integration: 'openagentskill', order_id: order.id, user_id: order.user_id }, latest_charge: charge }
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

const lifetime = { ...order, id: 'lifetime-1', plan: 'lifetime', skill_slug: null, release_id: null,
  amount_cents: 16900, status: 'pending', stripe_subscription_id: null, stripe_price_id: null,
  checkout_locale: 'en', product_name: 'OpenAgentSkill Pro — Lifetime' }
orders.set(lifetime.id, lifetime)
Object.assign(session, { metadata: { ...session.metadata, order_id: lifetime.id }, client_reference_id: lifetime.id, amount_total: 16900, payment_status: 'unpaid' })
Object.assign(intent, { amount_received: 16900, metadata: { ...intent.metadata, order_id: lifetime.id } })
Object.assign(charge, { refunded: false, amount: 16900, amount_refunded: 0 })
await processStripeEvent(stripe, { ...event, id: 'evt_lifetime_unpaid' }, db)
assert.equal(lifetime.status, 'pending', 'Lifetime waits for settled payment')
assert.equal(await inspectLifetime(stripe, lifetime, lifetime.user_id), false)
session.payment_status = 'paid'
intent.customer = 'cus_other'
await assert.rejects(processStripeEvent(stripe, { ...event, id: 'evt_lifetime_wrong_customer' }, db), /payment_binding_mismatch/)
intent.customer = 'cus_1'
await processStripeEvent(stripe, { ...event, id: 'evt_lifetime_paid', type: 'checkout.session.async_payment_succeeded' }, db)
assert.equal(lifetime.status, 'paid')
assert.ok(await inspectLifetime(stripe, lifetime, lifetime.user_id))
assert.equal(await inspectLifetime(stripe, lifetime, 'other-user'), false)
for (const invalid of [{ livemode: true }, { status: 'pending' }, { status: 'refunded' }, { status: 'disputed' }, { amount_cents: 0 }, { amount_cents: -1 }, { amount_cents: 16900.5 }, { currency: 'eur' }, { plan: 'single' }, { stripe_subscription_id: 'sub_1' }, { skill_slug: 'launch-card-studio' }, { release_id: 'release-1' }]) {
  assert.equal(lifetimeOrderAllowed({ ...lifetime, ...invalid }, lifetime.user_id, false), false)
}
intent.amount_received = 12900
assert.ok(await inspectLifetime(stripe, { ...lifetime, amount_cents: 12900 }, lifetime.user_id), 'A settled historical price remains valid when catalog prices change')
assert.equal(await inspectLifetime(stripe, lifetime, lifetime.user_id), false, 'The actual Stripe payment must still match the immutable order amount')
intent.amount_received = 16900
const lifetimeParams = checkoutSessionParams(lifetime, 'https://www.openagentskill.com')
assert.equal(lifetimeParams.mode, 'payment')
assert.equal(lifetimeParams.line_items[0].price_data.unit_amount, 16900)
assert.equal(lifetimeParams.line_items[0].price_data.product_data.metadata.plan, 'lifetime')
assert.equal(lifetimeParams.subscription_data, undefined)
assert.equal(lifetimeParams.payment_intent_data.metadata.user_id, lifetime.user_id)
assertSessionOrder(session, lifetime)
assert.throws(() => assertSessionOrder({ ...session, mode: 'subscription' }, lifetime))
charge.amount_refunded = 100
assert.ok(await inspectLifetime(stripe, lifetime, lifetime.user_id), 'Partial refunds retain access')
charge.disputed = true
assert.equal(await inspectLifetime(stripe, lifetime, lifetime.user_id), false, 'Dispute revokes lifetime before webhook arrives')
charge.disputed = false; charge.refunded = true
assert.equal(await inspectLifetime(stripe, lifetime, lifetime.user_id), false, 'Full refund revokes lifetime before webhook arrives')
await processStripeEvent(stripe, { ...event, id: 'evt_lifetime_refund', type: 'charge.refunded', data: { object: { id: 'ch_1' } } }, db)
assert.equal(lifetime.status, 'refunded')
await processStripeEvent(stripe, { ...event, id: 'evt_lifetime_late_payment' }, db)
assert.equal(lifetime.status, 'refunded', 'A late event cannot resurrect lifetime access')

const request = (path, body, origin = 'https://www.openagentskill.com') => new NextRequest(`https://www.openagentskill.com/api/payments/${path}`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) })
assert.equal((await checkoutPost(request('checkout', { plan: 'single', slug: 'launch-card-studio' }, 'https://evil.example'))).status, 403)
assert.equal((await checkoutPost(request('checkout', { plan: 'single', slug: 'launch-card-studio', amount: 1 }))).status, 400)
assert.equal((await checkoutPost(request('checkout', { plan: 'lifetime', amount: 1 }))).status, 400)
assert.equal((await checkoutPost(request('checkout', { plan: 'lifetime' }, 'https://evil.example'))).status, 403)
assert.equal((await downloadPost(request('download', { slug: '../private' }))).status, 400)
assert.equal((await downloadPost(request('download', { slug: 'launch-card-studio' }, 'https://evil.example'))).status, 403)
assert.equal((await contentPost(request('content', { slug: 'motion-stephanlivera-df17a2' }, 'https://evil.example'))).status, 403)
assert.equal((await contentPost(request('content', { slug: '../private' }))).status, 400)
assert.equal((await contentPost(request('content', { slug: 'motion-stephanlivera-df17a2', userId:'another-buyer' }))).status, 400)
assert.equal((await webhookPost(request('webhook', event))).status, 400)
const sdk = new Stripe(process.env.STRIPE_SECRET_KEY)
const payload = JSON.stringify(event)
const signature = sdk.webhooks.generateTestHeaderString({ payload, secret })
assert.equal(sdk.webhooks.constructEvent(payload, signature, secret).id, event.id)
assert.throws(() => sdk.webhooks.constructEvent(payload + ' ', signature, secret))
assert.throws(() => sdk.webhooks.constructEvent(payload, sdk.webhooks.generateTestHeaderString({ payload, secret, timestamp: 1 }), secret))

// Every first-party paid Skill uses the same checkout and private-delivery
// contract. These are synthetic releases, never actual published packages.
const products = [STUDIO_SKILL.slug, ...MOTION_ENTRIES.map(entry => entry.id)]
assert.equal(new Set(products).size, products.length)
assert.equal(productDefinition('unregistered-paid-skill'), null)
for (const slug of products) {
  const product = productDefinition(slug)
  assert.ok(product?.name, `Paid product must be registered: ${slug}`)
  const delivery_kind = MOTION_ENTRIES.find(e=>e.id===slug)?.deliveryKind || 'package'
  const productRelease = { ...release, delivery_kind, id: `release-${slug}`, skill_slug: slug, object_path: `${slug}/1.1.0/${release.sha256}.${delivery_kind==='package'?'zip':'txt'}` }
  const productOrder = { ...owned, id: `order-${slug}`, skill_slug: slug, release_id: productRelease.id,
    product_name: product.name, checkout_locale: 'zh', stripe_price_id: null }
  const params = checkoutSessionParams(productOrder, 'https://www.openagentskill.com')
  assert.equal(params.branding_settings.display_name, 'OpenAgentSkill')
  assert.equal(params.branding_settings.button_color, '#006B4F')
  assert.equal(params.customer, productOrder.stripe_customer_id)
  assert.equal(params.mode, 'payment')
  assert.equal(params.line_items[0].price_data.unit_amount, 499)
  assert.equal(params.line_items[0].price_data.product_data.name, product.name)
  assert.equal(params.line_items[0].price_data.product_data.metadata.skill_slug, slug)
  assert.equal(params.payment_intent_data.metadata.order_id, productOrder.id)
  if (slug.startsWith('motion-')) {
    assert.ok(params.success_url.includes(`/zh/skills/${slug}?`), 'Motion payment returns directly to copyable content')
    assert.ok(params.line_items[0].price_data.product_data.description.includes('TXT'))
  }
  assert.match(params.integration_identifier, /^openagentskill-[a-z]{8}$/)
  assert.deepEqual(params, checkoutSessionParams(productOrder, 'https://www.openagentskill.com'), 'retry parameters must be stable')
  assert.ok(singleReleaseAllowed(productOrder, productRelease, 'buyer-1', false), `Paid download must support ${slug}`)
  assert.equal(singleReleaseAllowed({ ...productOrder, status: 'pending' }, productRelease, 'buyer-1', false), false)
  assert.equal(singleReleaseAllowed(productOrder, { ...productRelease, withdrawn: true }, 'buyer-1', false), false)
  assert.equal(singleReleaseAllowed(productOrder, productRelease, 'buyer-2', false), false)
  assert.equal(singleReleaseAllowed({ ...productOrder, skill_slug: 'a-different-skill' }, productRelease, 'buyer-1', false), false)
}
for (const [plan, amount, price] of [['monthly', 999, 'price_month'], ['yearly', 7900, 'price_year']]) {
  const params = checkoutSessionParams({ ...owned, plan, amount_cents: amount, product_name: 'OpenAgentSkill Pro',
    skill_slug: null, stripe_price_id: price, checkout_locale: 'en' }, 'https://www.openagentskill.com')
  assert.equal(params.branding_settings.display_name, 'OpenAgentSkill')
  assert.equal(params.mode, 'subscription')
  assert.deepEqual(params.line_items, [{ quantity: 1, price }])
  assert.equal(params.subscription_data.metadata.user_id, 'buyer-1')
  assert.equal(params.payment_intent_data, undefined)
}
console.log(`Paid catalog: all ${products.length} products support branded Checkout and isolated downloads; both Pro billing cycles use the same storefront.`)
console.log('Payments: ownership, release/update rights, mode separation, server amount binding, async settlement, duplicate/retried/stale webhooks, refunds, membership expiry, CSRF, URL allowlist and Stripe signatures passed.')
