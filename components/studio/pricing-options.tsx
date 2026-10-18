'use client'

import { useState } from 'react'
import { ArrowRight, Check, Layers } from 'lucide-react'
import { PurchaseActions, usePurchaseStatus } from '@/components/payments/purchase-actions'
import { membershipCopy } from '@/lib/i18n/membership-copy'
import { paymentMessage } from '@/lib/payments/copy'
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
  const m = membershipCopy(locale)
  const { state, error } = usePurchaseStatus()
  const plans = [
    { id: 'monthly', title: c.monthly, eyebrow: m.flexible, lead: m.monthlyLead, amount: MEMBERSHIP.monthlyCents, unit: c.month, note: m.monthlyNote, action: m.monthlyAction },
    { id: 'yearly', title: c.yearly, eyebrow: ui.annualSaving, lead: m.yearlyLead, amount: MEMBERSHIP.yearlyCents, unit: c.year, note: m.yearlyNote, action: m.yearlyAction },
    { id: 'lifetime', title: m.lifetime, eyebrow: m.founding, lead: m.lifetimeLead, amount: MEMBERSHIP.lifetimeCents, unit: c.once, note: m.lifetimeNote, action: m.lifetimeAction },
  ] as const
  return <section aria-label={c.compare}>
    <div className={styles.plans}>
      <article className={styles.plan} data-plan="free">
        <p className={styles.planEyebrow}>{ui.freePriceNote}</p>
        <div className={styles.planTop}><h2>{c.free}</h2></div><p className={styles.body}>{c.freeLead}</p>
        <div className={styles.planPrice}><p className={styles.price}><strong>{studioPrice(0, locale)}</strong></p></div>
        <FeatureList items={c.freeFeatures} />
        <div className={styles.planAction}><Link href={getLocalizedNavigationHref('/skills?access=free', locale)} className={`${styles.button} ${styles.secondary} ${styles.full}`}>{c.freeAction}</Link></div>
      </article>
      {plans.map(plan => <article key={plan.id} className={`${styles.plan} ${plan.id === 'yearly' ? styles.proPlan : ''}`} data-plan={plan.id}>
        <p className={styles.planEyebrow}>{plan.eyebrow}</p>
        <div className={styles.planTop}><h2>{plan.title}</h2></div><p className={styles.body}>{plan.lead}</p>
        <div className={styles.planPrice}><p className={styles.price}><strong>{studioPrice(plan.amount, locale)}</strong><span>{plan.unit}</span></p></div>
        <FeatureList items={m.paidFeatures} />
        <div className={styles.planAction}><p className={styles.priceNote}>{plan.note}</p>
          <PurchaseActions plan={plan.id} locale={locale} status={state} compact label={plan.action} />
        </div>
      </article>)}
    </div>
    <p id="membership-status" className={styles.memberNotice}>{error ? <span role="alert">{paymentMessage(error, locale)}</span> : m.secure}</p>
    <p className={styles.singlePurchase}><Link href={studioHref(STUDIO_SKILL.path, locale)}>{m.singleNote}<ArrowRight size={16} aria-hidden="true" /></Link></p>
  </section>
}
