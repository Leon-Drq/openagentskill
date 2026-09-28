'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { commerceCopy } from '@/lib/i18n/commerce-copy'
import { safeCommerceUrl, type SkillCommerce } from '@/lib/skills/commerce'

export function SkillPrice({ commerce }: { commerce: SkillCommerce }) {
  const { locale } = useI18n()
  const c = commerceCopy(locale)
  let amount = ''
  if (commerce.amount !== null && commerce.currency) {
    try { amount = new Intl.NumberFormat(locale, { style: 'currency', currency: commerce.currency }).format(commerce.amount) } catch { /* Show type rather than an invalid price. */ }
  }
  return <span data-skill-price={commerce.type} className="text-xs text-secondary">
    {c[commerce.type]}{amount ? ` · ${amount} ${c[commerce.billing as keyof typeof c] || ''}` : commerce.billing === 'contact' ? ` · ${c.contact}` : ''}
  </span>
}

export function SkillCommercePanel({ commerce, license, blocked }: { commerce: SkillCommerce; license: string; blocked: boolean }) {
  const { locale } = useI18n()
  const c = commerceCopy(locale)
  const purchaseUrl = !blocked && safeCommerceUrl(commerce.purchaseUrl || undefined)
  return <div className="mt-6 rounded-md border border-border bg-card p-5 sm:p-6" data-skill-commerce>
    <h3 className="font-display text-2xl tracking-tight">{c.title}</h3>
    <dl className="mt-5 grid gap-5 sm:grid-cols-[1fr_2fr]">
      <div><dt className="text-xs text-secondary">{c.acquisition}</dt><dd className="mt-2"><SkillPrice commerce={commerce} /></dd></div>
      <div><dt className="text-xs text-secondary">{c.running}</dt><dd className="mt-2 text-sm leading-6">{c[commerce.runtime === 'unknown' ? 'runtimeUnknown' : commerce.runtime]}</dd></div>
      <div><dt className="text-xs text-secondary">{c.license}</dt><dd className="mt-2 break-words text-sm">{license}</dd></div>
      <div className="text-xs leading-6 text-secondary">
        {commerce.sourceUrl ? <><dt>{c.checked} · {commerce.checkedAt}</dt><dd><a href={commerce.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#006b4f] underline underline-offset-4">{c.source} ↗</a></dd></> : <><dt className="sr-only">{c.unknown}</dt><dd>{c.unknownNote}</dd></>}
      </div>
    </dl>
    {purchaseUrl && <div className="mt-5"><a href={purchaseUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-11 items-center rounded-md bg-[#006b4f] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4">{c.buy} ↗</a><p className="mt-3 text-xs leading-6 text-secondary">{c.external}</p></div>}
    <p className="mt-5 text-xs leading-6 text-secondary">{c.caveat} <Link href={`/contact${locale === 'en' ? '' : '?lang=' + locale}`} className="text-[#006b4f] underline underline-offset-4">{c.contribute} →</Link></p>
  </div>
}
