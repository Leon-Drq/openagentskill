export type PurchasePlan = 'single' | 'monthly' | 'yearly' | 'lifetime'
export const PAYMENT_CURRENCY = 'usd'
export const PLAN_AMOUNTS = { single: 499, monthly: 999, yearly: 7900, lifetime: 16900 } as const
export function recurringPlan(plan: PurchasePlan): plan is 'monthly' | 'yearly' {
  return plan === 'monthly' || plan === 'yearly'
}

export function lifetimeOrderAllowed(order: PaidOrder, userId: string, livemode: boolean) {
  return order.user_id === userId && order.livemode === livemode && order.plan === 'lifetime'
    && order.status === 'paid' && order.skill_slug === null && order.release_id === null
    // Honor the immutable purchase price if the founding offer changes later.
    // Delivery also verifies the Stripe payment against this order snapshot.
    && order.currency === PAYMENT_CURRENCY && Number.isSafeInteger(order.amount_cents) && order.amount_cents > 0
    && Boolean(order.stripe_payment_intent_id) && order.stripe_subscription_id === null
}
export const DOWNLOAD_TTL_SECONDS = 60
export const PACKAGE_BUCKET = 'skill-packages'
export type DeliveryKind = 'package' | 'prompt' | 'skill-instructions'
export const TEXT_MAX_BYTES = 1024 * 1024

export interface PaidOrder {
  id: string
  user_id: string
  skill_slug: string | null
  plan: PurchasePlan
  livemode: boolean
  amount_cents: number
  currency: string
  checkout_locale: string
  product_name: string
  stripe_price_id: string | null
  status: 'pending' | 'paid' | 'expired' | 'failed' | 'refunded' | 'disputed'
  release_id: string | null
  stripe_session_id: string | null
  stripe_payment_intent_id: string | null
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  paid_at: string | null
  updates_until: string | null
  created_at: string
}
export interface PackageRelease {
  delivery_kind?: DeliveryKind
  id: string
  skill_slug: string
  version: string
  object_path: string
  sha256: string
  size_bytes: number
  released_at: string
  withdrawn: boolean
}

export function validRelease(release: PackageRelease, slug: string) {
  const kind = release.delivery_kind ?? 'package'
  return !release.withdrawn && release.skill_slug === slug
    && ['package', 'prompt', 'skill-instructions'].includes(kind)
    && /^[a-z0-9][a-z0-9-]{0,199}$/.test(slug)
    && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,49}$/.test(release.version)
    && release.object_path === `${slug}/${release.version}/${release.sha256}.${kind === 'package' ? 'zip' : 'txt'}`
    && /^[a-f0-9]{64}$/.test(release.sha256)
    && Number.isSafeInteger(release.size_bytes) && release.size_bytes > 0
    && (kind === 'package' || release.size_bytes <= TEXT_MAX_BYTES)
    && Number.isFinite(Date.parse(release.released_at)) && Date.parse(release.released_at) <= Date.now()
}

export function singleReleaseAllowed(order: PaidOrder, release: PackageRelease, userId: string, livemode: boolean) {
  return order.user_id === userId && order.livemode === livemode && order.plan === 'single'
    && order.status === 'paid' && validRelease(release, order.skill_slug || '')
    && (release.id === order.release_id || Boolean(order.updates_until && Date.parse(release.released_at) <= Date.parse(order.updates_until)))
}

export function activeMembership(status: string, periodEnd: number, paid: boolean, now = Date.now()) {
  return status === 'active' && paid && Number.isFinite(periodEnd) && periodEnd * 1000 > now
}

export function safeStripeRedirect(value: string | null, kind: 'checkout' | 'portal') {
  try {
    const url = new URL(value || '')
    return url.protocol === 'https:' && url.hostname === (kind === 'checkout' ? 'checkout.stripe.com' : 'billing.stripe.com')
      && !url.username && !url.password && !url.port ? url.href : null
  } catch { return null }
}
