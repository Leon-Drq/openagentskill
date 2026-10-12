'use client'

import { useState } from 'react'
import { ArrowRight, Check, Layers } from 'lucide-react'
import { PurchaseActions } from '@/components/payments/purchase-actions'
import Link from '@/components/crawl-link'
import type { Locale } from '@/lib/i18n/config'
import { studioCopy } from '@/lib/i18n/studio-copy'
import { studioUiCopy } from '@/lib/i18n/studio-ui-copy'
import { MEMBERSHIP, STUDIO_SKILL, studioHref, studioPrice } from '@/lib/studio/catalog'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import styles from './studio.module.css'

function Cycle({ yearly, setYearly, locale }: { yearly: boolean; setYearly: (value: boolean) => void; locale: Locale }) {
  const c = studioCopy(locale)
  return <div className={`${styles.segmented} ${styles.cycle}`} role="group" aria-label={c.subscription}>
    <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>{c.monthly}</button>
    <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>{c.yearly}</button>
  </div>
}
export function FeatureList({ items }: { items: string[] }) {
  return <ul className={styles.checklist}>{items.map(item => <li key={item}><Check aria-hidden="true" /><span>{item}</span></li>)}</ul>
}
export function PurchaseOptions({ locale }: { locale: Locale }) {
  const c = studioCopy(locale)
  const [membership, setMembership] = useState(false)
  const [yearly, setYearly] = useState(false)
  const amount = membership ? yearly ? MEMBERSHIP.yearlyCents : MEMBERSHIP.monthlyCents : STUDIO_SKILL.plannedPriceCents
  return <aside className={styles.purchase} aria-labelledby="purchase-heading">
    <h2 id="purchase-heading">{c.choose}</h2>
    <div className={styles.segmented} role="group" aria-label={c.choose}>
      <button type="button" aria-pressed={!membership} onClick={() => setMembership(false)}>{c.single}</button>
      <button type="button" aria-pressed={membership} onClick={() => setMembership(true)}>{c.subscription}</button>
    </div>
    {membership && <Cycle yearly={yearly} setYearly={setYearly} locale={locale} />}
    <p className={styles.priceNote}>{c.planned}</p>
    <p className={styles.price} aria-live="polite"><strong>{studioPrice(amount, locale)}</strong><span>{membership ? yearly ? c.year : c.month : c.once}</span></p>
    <p className={styles.body}>{membership ? c.memberBenefit : c.singleBenefit}</p>
    {membership && <p className={styles.notice}>{yearly ? c.annually : c.monthlyNote}</p>}
    <PurchaseActions slug={STUDIO_SKILL.slug} plan={membership ? yearly ? 'yearly' : 'monthly' : 'single'} locale={locale} />
    <Link href={studioHref('/membership', locale)} className={styles.membershipLink}><Layers size={22} strokeWidth={1.5} aria-hidden="true" /><span><strong>{c.membership}</strong><small>{c.compare}</small></span><ArrowRight size={17} aria-hidden="true" /></Link>
  </aside>
}
export function MembershipPlans({ locale }: { locale: Locale }) {
  const c = studioCopy(locale)
  const ui = studioUiCopy(locale)
  const [yearly, setYearly] = useState(false)
  return <section aria-label={c.compare}>
    <div className={styles.billing}><Cycle yearly={yearly} setYearly={setYearly} locale={locale} /><span>{ui.annualSaving}</span></div>
    <div className={styles.plans}>
      <article className={styles.plan}>
        <div className={styles.planTop}><h2>{c.free}</h2></div><p className={styles.body}>{c.freeLead}</p>
        <div className={styles.planPrice}><p className={styles.price}><strong>{studioPrice(0, locale)}</strong></p><p className={styles.priceNote}>{ui.freePriceNote}</p></div>
        <FeatureList items={c.freeFeatures} />
        <div className={styles.planAction}><Link href={getLocalizedNavigationHref('/skills?access=free', locale)} className={`${styles.button} ${styles.secondary} ${styles.full}`}>{c.freeAction}</Link></div>
      </article>
      <article className={`${styles.plan} ${styles.proPlan}`}>
        <div className={styles.planTop}><h2>{c.pro}</h2><span className={styles.badge}>{c.preview}</span></div><p className={styles.body}>{c.proLead}</p>
        <div className={styles.planPrice}><p className={styles.price} aria-live="polite"><strong>{studioPrice(yearly ? MEMBERSHIP.yearlyCents : MEMBERSHIP.monthlyCents, locale)}</strong><span>{yearly ? c.year : c.month}</span></p><p className={styles.priceNote}>{c.planned}</p></div>
        <FeatureList items={c.proFeatures} />
        <div className={styles.planAction}><p className={styles.notice}>{yearly ? c.annually : c.monthlyNote}</p>
        <PurchaseActions plan={yearly ? 'yearly' : 'monthly'} locale={locale} /></div>
      </article>
      <article className={styles.plan}>
        <div className={styles.planTop}><h2>{ui.singlePlan}</h2></div><p className={styles.body}>{c.singleLead}</p>
        <div className={styles.planPrice}><p className={styles.price}><strong>{studioPrice(STUDIO_SKILL.plannedPriceCents, locale)}</strong><span>{c.once}</span></p><p className={styles.priceNote}>{c.planned} · {STUDIO_SKILL.name}</p></div>
        <FeatureList items={c.singleFeatures} />
        <div className={styles.planAction}><Link href={studioHref(STUDIO_SKILL.path, locale)} className={`${styles.button} ${styles.secondary} ${styles.full}`}>{c.singleAction}<ArrowRight size={15} aria-hidden="true" /></Link></div>
      </article>
    </div>
    <p id="membership-status" className={styles.memberNotice}>{c.previewNotice} {c.launchNote}</p>
  </section>
}
