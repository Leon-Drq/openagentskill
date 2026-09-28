/** Reviewed pricing evidence, not a safety review or a payment entitlement.
 * Small owner-maintained pilot: no model calls, database scans or runtime fetches.
 * See docs/skill-pricing.md before adding an offer. */
export const acquisitionTypes = ['free', 'paid', 'freemium', 'unknown'] as const
export type AcquisitionType = typeof acquisitionTypes[number]
export type PriceFilter = AcquisitionType | 'all'
export interface SkillOffer {
  type: Exclude<AcquisitionType, 'unknown'>
  billing: 'free' | 'one-time' | 'monthly' | 'yearly' | 'usage-based' | 'contact'
  amount?: number
  currency?: string
  sourceUrl: string
  checkedAt: string
  runtime: 'model' | 'optional-services' | 'unknown'
  purchaseUrl?: string
}

export function safeCommerceUrl(value: string | undefined) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !url.hostname.includes('.') || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname) ||
      url.hostname.endsWith('.local') || url.hostname.endsWith('.internal') || url.hostname.includes(':')) return undefined
    return url.href
  } catch { return undefined }
}

export const reviewedSkillOffers: Readonly<Record<string, SkillOffer>> = {
  'anthropic-frontend-design': {
    type: 'free', billing: 'free', runtime: 'model', checkedAt: '2026-09-28',
    sourceUrl: 'https://github.com/anthropics/skills/tree/main/skills/frontend-design',
  },
  'obra-using-superpowers': {
    type: 'free', billing: 'free', runtime: 'model', checkedAt: '2026-09-28',
    sourceUrl: 'https://github.com/obra/superpowers',
  },
  'hypit-ai-hypit-hypit': {
    type: 'free', billing: 'free', runtime: 'optional-services', checkedAt: '2026-09-28',
    sourceUrl: 'https://github.com/hypit-ai/hypit#install-once',
  },
}

export function validSkillOffer(offer: SkillOffer, now = Date.now()) {
  const checked = Date.parse(offer.checkedAt)
  if (!Number.isFinite(checked) || checked > now || now - checked > 90 * 86400000 || !safeCommerceUrl(offer.sourceUrl)) return false
  if (!['free', 'paid', 'freemium'].includes(offer.type) || !['free', 'one-time', 'monthly', 'yearly', 'usage-based', 'contact'].includes(offer.billing)) return false
  if (offer.type === 'free') return offer.billing === 'free' && offer.amount === undefined && !offer.purchaseUrl
  if (!safeCommerceUrl(offer.purchaseUrl) || offer.billing === 'free') return false
  if (offer.billing === 'contact') return offer.amount === undefined
  return Number.isFinite(offer.amount) && offer.amount! > 0 && /^[A-Z]{3}$/.test(offer.currency || '')
}

export function normalizePriceFilter(value: string | undefined): PriceFilter {
  return acquisitionTypes.includes(value as AcquisitionType) ? value as AcquisitionType : 'all'
}

export function getSkillCommerce(slug: string, now = Date.now()) {
  const candidate = Object.hasOwn(reviewedSkillOffers, slug) ? reviewedSkillOffers[slug] : undefined
  const offer = candidate && validSkillOffer(candidate, now) ? candidate : undefined
  return {
    type: offer?.type || 'unknown' as AcquisitionType,
    billing: offer?.billing || 'unknown',
    amount: offer?.amount ?? null,
    currency: offer?.currency ?? null,
    sourceUrl: offer?.sourceUrl ?? null,
    checkedAt: offer?.checkedAt ?? null,
    runtime: offer?.runtime || 'unknown',
    purchaseUrl: offer?.purchaseUrl ?? null,
    checkout: 'external' as const,
    purchaseRequiresUserConsent: true as const,
  }
}
export type SkillCommerce = ReturnType<typeof getSkillCommerce>

/** Apply this bounded slug set in SQL before sorting, LIMIT and counting. */
export function commerceFilterSlugs(filter: PriceFilter) {
  return Object.keys(reviewedSkillOffers).filter(slug => {
    const type = getSkillCommerce(slug).type
    return filter === 'unknown' ? type !== 'unknown' : type === filter
  }).sort()
}
export function matchesCommerce(slug: string, filter: PriceFilter) {
  return filter === 'all' || getSkillCommerce(slug).type === filter
}
