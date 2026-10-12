'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { PurchaseActions } from '@/components/payments/purchase-actions'
import Link from '@/components/crawl-link'
import { studioCopy } from '@/lib/i18n/studio-copy'
import { MEMBERSHIP, studioHref, studioPrice } from '@/lib/studio/catalog'
import { MOTION_PLANNED_PRICE_CENTS, type MotionLocale } from '@/lib/motion/shared'
import { motionDetailCopy } from '@/lib/motion/detail-copy'
import styles from './detail.module.css'

export function MotionPurchaseOptions({ locale, slug }: { locale: MotionLocale; slug: string }) {
  const c = motionDetailCopy(locale), prices = studioCopy(locale)
  const [plan, setPlan] = useState<'single' | 'membership'>('single')
  const [yearly, setYearly] = useState(false)
  const [ready, setReady] = useState(false)
  const membership = plan === 'membership'
  const amount = membership ? yearly ? MEMBERSHIP.yearlyCents : MEMBERSHIP.monthlyCents : MOTION_PLANNED_PRICE_CENTS
  return <section className={styles.purchase} aria-labelledby="motion-purchase-heading" data-motion-purchase>
    <h2 id="motion-purchase-heading">{c.purchase}</h2>
    <fieldset className={styles.plans}>
      <legend className="sr-only">{prices.choose}</legend>
      {(['single', 'membership'] as const).map(option => <label key={option} className={styles.plan}>
        <input type="radio" name="motion-plan" value={option} checked={plan === option} onChange={() => setPlan(option)} />
        <span>{c[option]}</span>
        <span className={styles.planAmount}>{studioPrice(option === 'single' ? MOTION_PLANNED_PRICE_CENTS : yearly ? MEMBERSHIP.yearlyCents : MEMBERSHIP.monthlyCents, locale)}{option === 'membership' && <small>{yearly ? prices.year : prices.month}</small>}</span>
      </label>)}
    </fieldset>
    {membership && <div className={styles.cycle} role="group" aria-label={prices.subscription}>
      <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>{prices.monthly}</button>
      <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>{prices.yearly}</button>
    </div>}
    <div className={styles.priceSummary} aria-live="polite" aria-atomic="true">
      <p className={styles.priceLabel}>{ready ? (locale === 'zh' ? '价格' : 'Price') : prices.planned}</p>
      <p className={styles.price}><strong>{studioPrice(amount, locale)}</strong><span>{membership ? yearly ? prices.year : prices.month : prices.once}</span></p>
      <p className={styles.benefit}>{membership ? c.memberBenefit : c.singleBenefit}</p>
      {membership && <p className={styles.billing}>{yearly ? prices.annually : prices.monthlyNote}</p>}
    </div>
    <PurchaseActions slug={slug} plan={membership ? yearly ? 'yearly' : 'monthly' : 'single'} locale={locale} onAvailability={setReady} />
    <Link href={studioHref('/membership', locale)} className={styles.compare}>{prices.compare}<ArrowRight size={15} aria-hidden="true" /></Link>
  </section>
}
