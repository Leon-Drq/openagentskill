'use client'

import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import Link from '@/components/crawl-link'
import type { Locale } from '@/lib/i18n/config'
import { studioCopy } from '@/lib/i18n/studio-copy'
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
    <button type="button" className={`${styles.button} ${styles.full}`} disabled aria-describedby="purchase-status">{c.soon}</button>
    <p id="purchase-status" className={styles.notice}>{c.launchNote}</p>
    <Link href={studioHref('/membership', locale)} className={styles.textLink}>{c.compare}<ArrowRight size={15} aria-hidden="true" /></Link>
  </aside>
}
export function MembershipPlans({ locale }: { locale: Locale }) {
  const c = studioCopy(locale)
  const [yearly, setYearly] = useState(false)
  return <section aria-label={c.compare}>
    <Cycle yearly={yearly} setYearly={setYearly} locale={locale} />
    <div className={styles.plans}>
      <article className={styles.plan}>
        <h2>{c.free}</h2><p className={styles.body}>{c.freeLead}</p>
        <p className={styles.priceNote}>OpenAgentSkill</p><p className={styles.price}><strong>{studioPrice(0, locale)}</strong></p>
        <FeatureList items={c.freeFeatures} />
        <Link href={getLocalizedNavigationHref('/skills?access=free', locale)} className={`${styles.button} ${styles.secondary} ${styles.full}`}>{c.freeAction}</Link>
      </article>
      <article className={`${styles.plan} ${styles.proPlan}`}>
        <h2>{c.pro}</h2><p className={styles.body}>{c.proLead}</p><p className={styles.priceNote}>{c.planned}</p>
        <p className={styles.price} aria-live="polite"><strong>{studioPrice(yearly ? MEMBERSHIP.yearlyCents : MEMBERSHIP.monthlyCents, locale)}</strong><span>{yearly ? c.year : c.month}</span></p>
        <FeatureList items={c.proFeatures} />
        <p className={styles.notice}>{yearly ? c.annually : c.monthlyNote}</p>
        <button type="button" className={`${styles.button} ${styles.full}`} disabled aria-describedby="membership-status">{c.soon}</button>
      </article>
      <article className={styles.plan}>
        <h2>{c.single}</h2><p className={styles.body}>{c.singleLead}</p><p className={styles.priceNote}>{c.planned} · {STUDIO_SKILL.name}</p>
        <p className={styles.price}><strong>{studioPrice(STUDIO_SKILL.plannedPriceCents, locale)}</strong><span>{c.once}</span></p>
        <FeatureList items={c.singleFeatures} />
        <Link href={studioHref(STUDIO_SKILL.path, locale)} className={`${styles.button} ${styles.secondary} ${styles.full}`}>{c.singleAction}</Link>
      </article>
    </div>
    <p id="membership-status" className={styles.notice}>{c.launchNote}</p>
  </section>
}
