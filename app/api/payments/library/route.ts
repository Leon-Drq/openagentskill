import { buyer, membershipFor, paymentDb, paymentError, paymentJson, productDefinition, releases } from '@/lib/payments/server'
import { paymentMode } from '@/lib/payments/stripe'
import { singleReleaseAllowed, type PaidOrder, type DeliveryKind } from '@/lib/payments/policy'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  try {
    const user = await buyer()
    if (paymentMode() === null) return paymentJson({ orders: [], packages: [], membership: null, billing: false, configured: false, next: null })
    const after = request.nextUrl.searchParams.get('after')
    let query = paymentDb().from('commerce_orders').select('*').eq('user_id', user.id).eq('livemode', paymentMode() === true)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(51)
    // UUID cursor resolves through the owner filter, never through an arbitrary
    // timestamp or raw PostgREST condition supplied by the client.
    if (after && /^[a-f0-9-]{36}$/.test(after)) {
      const cursor = await paymentDb().from('commerce_orders').select('created_at,id').eq('id', after).eq('user_id', user.id).maybeSingle()
      if (cursor.error) throw cursor.error
      if (cursor.data) query = query.or(`created_at.lt.${cursor.data.created_at},and(created_at.eq.${cursor.data.created_at},id.lt.${cursor.data.id})`)
    }
    const [result, available, membership, customer] = await Promise.all([query, releases(), membershipFor(user.id),
      paymentDb().from('commerce_customers').select('user_id').eq('user_id', user.id).eq('livemode', paymentMode() === true).maybeSingle()])
    if (result.error) throw result.error
    if (customer.error) throw customer.error
    const all = result.data as PaidOrder[], orders = all.slice(0, 50)
    const packages = new Map<string, { slug: string; name: string; version: string; path: string; kind: DeliveryKind }>()
    for (const release of available) {
      if (!packages.has(release.skill_slug) && (membership || orders.some(order => singleReleaseAllowed(order, release, user.id, paymentMode() === true)))) {
        const product = productDefinition(release.skill_slug)!
        packages.set(release.skill_slug, { ...product, version: release.version, kind: release.delivery_kind || 'package' })
      }
    }
    return paymentJson({ configured: true, billing: Boolean(customer.data),
      orders: orders.map(order => ({ id: order.id, name: order.skill_slug ? productDefinition(order.skill_slug)?.name || order.skill_slug : 'Pro membership',
        slug: order.skill_slug, plan: order.plan, amount: order.amount_cents, status: order.status, createdAt: order.created_at })),
      packages: [...packages.values()], membership: membership ? membership.kind === 'lifetime'
        ? { kind: 'lifetime', until: null, cancelAtPeriodEnd: false }
        : { kind: 'subscription', until: new Date(membership.periodEnd * 1000).toISOString(), cancelAtPeriodEnd: membership.subscription.cancel_at_period_end } : null,
      next: all.length > 50 ? orders[49].id : null })
  } catch (error) { return paymentError(error) }
}
