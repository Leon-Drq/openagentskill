import type { Locale } from '@/lib/i18n/config'
import { PLAN_AMOUNTS } from '@/lib/payments/policy'

export const STUDIO_SKILL = {
  slug: 'launch-card-studio', name: 'Launch Card Studio', version: '1.1.0',
  path: '/studio/launch-card-studio', status: 'preview', author: 'OpenAgentSkill',
  publishedAt: '2026-10-11', plannedPriceCents: 499, currency: 'USD',
  formats: [
    { id: 'wide', width: 1200, height: 630 },
    { id: 'square', width: 1080, height: 1080 },
    { id: 'portrait', width: 1080, height: 1350 },
  ],
} as const

// A preview is never a sale, paid entitlement or registry review approval.
// Enable commerce only through a separate, verified payment/fulfilment release.
export const MEMBERSHIP = { status: 'preview', monthlyCents: PLAN_AMOUNTS.monthly, yearlyCents: PLAN_AMOUNTS.yearly, lifetimeCents: PLAN_AMOUNTS.lifetime, currency: 'USD', purchasableSkills: 0 } as const
export function studioHref(path: string, locale: Locale) { return locale === 'en' ? path : `/${locale}${path}` }
export function studioImage(format: string) {
  return `/studio/launch-card-studio/v${STUDIO_SKILL.version}/${STUDIO_SKILL.formats.some(item => item.id === format) ? format : 'wide'}.svg`
}
export function studioPrice(cents: number, locale: Locale) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100)
}
