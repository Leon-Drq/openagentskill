import Link from 'next/link'
import type { Locale } from '@/lib/i18n/config'
import { galleryPricingCopy } from '@/lib/i18n/gallery-pricing-copy'
import { commerceCopy } from '@/lib/i18n/commerce-copy'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { getSkillCommerce } from '@/lib/skills/commerce'
import { getShowcasePrice } from '@/lib/showcase-pricing'

export function ShowcasePriceBadge({ slug, locale, className = '' }: { slug: string; locale: Locale; className?: string }) {
  const price = getShowcasePrice(slug)
  if (!price) return null
  return <span data-showcase-price={price} className={`inline-flex max-w-full items-center rounded border border-[#e4e0d8] px-2 py-1 text-[10px] text-[#006b4f] ${className}`}>{galleryPricingCopy(locale)[price]}</span>
}

export function ShowcaseCostDisclosure({ slug, locale }: { slug: string; locale: Locale }) {
  const c = galleryPricingCopy(locale)
  const commerce = getSkillCommerce(slug)
  const cost = commerceCopy(locale)
  return <div className="mt-5 space-y-3 border-t border-[#e4e0d8] pt-5 text-xs leading-relaxed text-[#6d675e]" data-showcase-costs>
    <ShowcasePriceBadge slug={slug} locale={locale} />
    <p>{c.note}</p>
    {commerce.runtime !== 'unknown' && <p>{cost[commerce.runtime]}</p>}
    <Link href={getLocalizedNavigationHref(`/skills/${slug}#install-options`, locale)} className="inline-flex min-h-9 items-center text-[#006b4f] underline underline-offset-4">{c.details} ↗</Link>
  </div>
}
