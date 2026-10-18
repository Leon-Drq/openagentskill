import { NextRequest } from 'next/server'
import { buyer, membershipFor, paidOrders, paymentError, PaymentError, paymentJson, productDefinition, releases } from '@/lib/payments/server'
import { checkoutConfigured, membershipPrice, paymentMode } from '@/lib/payments/stripe'
import { singleReleaseAllowed } from '@/lib/payments/policy'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug') || undefined
    if (slug && !productDefinition(slug)) throw new PaymentError('product_not_found', 404)
    // A missing key is a deployment state, not an authentication failure.
    if (paymentMode() === null) return paymentJson({ ready: false, membershipReady: false, owned: false, reason: 'checkout_unavailable' })
    const available = await releases(slug)
    const ready = checkoutConfigured() && available.length > 0
    let user
    try { user = await buyer() } catch (error) {
      if (!(error instanceof PaymentError) || error.status !== 401) throw error
    }
    const orders = user ? await paidOrders(user.id) : []
    const membership = user ? await membershipFor(user.id) : null
    return paymentJson({ ready, membershipReady: ready && Boolean(membershipPrice('monthly') && membershipPrice('yearly')),
      signedIn: Boolean(user), membership: membership?.kind || null,
      owned: Boolean(available.length && (membership || orders.some(order => available.some(release => singleReleaseAllowed(order, release, user!.id, paymentMode() === true))))),
      reason: available.length ? 'checkout_unavailable' : 'package_unavailable' })
  } catch (error) { return paymentError(error) }
}
