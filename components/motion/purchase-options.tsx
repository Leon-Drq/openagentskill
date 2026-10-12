'use client'

import { useState } from 'react'
import { ArrowRight, Download, LockKeyhole, Terminal } from 'lucide-react'
import Link from '@/components/crawl-link'
import { studioCopy } from '@/lib/i18n/studio-copy'
import { MEMBERSHIP, studioHref, studioPrice } from '@/lib/studio/catalog'
import { MOTION_PLANNED_PRICE_CENTS, type MotionLocale } from '@/lib/motion/shared'
import { motionDetailCopy } from '@/lib/motion/detail-copy'
import styles from './detail.module.css'

export function MotionPurchaseOptions({ locale }: { locale: MotionLocale }) {
  const c = motionDetailCopy(locale), prices = studioCopy(locale)
  const [plan, setPlan] = useState<'single' | 'membership'>('single')
  const [yearly, setYearly] = useState(false)
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
      <p className={styles.priceLabel}>{prices.planned}</p>
      <p className={styles.price}><strong>{studioPrice(amount, locale)}</strong><span>{membership ? yearly ? prices.year : prices.month : prices.once}</span></p>
      <p className={styles.benefit}>{membership ? c.memberBenefit : c.singleBenefit}</p>
      {membership && <p className={styles.billing}>{yearly ? prices.annually : prices.monthlyNote}</p>}
    </div>
    <button type="button" disabled className={styles.buy} aria-describedby="motion-purchase-status"><LockKeyhole size={16} aria-hidden="true" />{membership ? c.memberAction : c.singleAction}</button>
    <p id="motion-purchase-status" className={styles.purchaseNote}>{c.purchaseNote}</p>
    <div className={styles.deliveryActions}>
      <button type="button" disabled aria-describedby="motion-purchase-status"><Terminal size={14} aria-hidden="true" />{c.install}</button>
      <button type="button" disabled aria-describedby="motion-purchase-status"><Download size={14} aria-hidden="true" />{c.download}</button>
    </div>
    <Link href={studioHref('/membership', locale)} className={styles.compare}>{prices.compare}<ArrowRight size={15} aria-hidden="true" /></Link>
  </section>
}
