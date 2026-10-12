export type PurchasePlan = 'single' | 'monthly' | 'yearly'
export const PAYMENT_CURRENCY = 'usd'
export const PLAN_AMOUNTS = { single: 499, monthly: 999, yearly: 7900 } as const
export const DOWNLOAD_TTL_SECONDS = 60
export const PACKAGE_BUCKET = 'skill-packages'

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
  return !release.withdrawn && release.skill_slug === slug
    && /^[a-z0-9][a-z0-9-]{0,199}$/.test(slug)
    && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,49}$/.test(release.version)
    && release.object_path === `${slug}/${release.version}/${release.sha256}.zip`
    && /^[a-f0-9]{64}$/.test(release.sha256)
    && Number.isSafeInteger(release.size_bytes) && release.size_bytes > 0
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
