import { ArrowRight, Info } from 'lucide-react'
import Link from '@/components/crawl-link'
import { MarketingPageShell } from '@/components/marketing-page'
import { jsonLd } from '@/lib/seo/resource-pages'
import { studioPageData } from '@/lib/studio/seo'
import { studioCopy } from '@/lib/i18n/studio-copy'
import { type Locale } from '@/lib/i18n/config'
import { STUDIO_SKILL, studioHref, studioImage } from '@/lib/studio/catalog'
import { PreviewGallery } from './preview-gallery'
import { FeatureList, MembershipPlans, PurchaseOptions } from './pricing-options'
import styles from './studio.module.css'

function PageData({ locale, kind }: { locale: Locale; kind: 'membership' | 'skill' }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(studioPageData(locale, kind)) }} />
}
function Closing({ locale, membership = false }: { locale: Locale; membership?: boolean }) {
  const c = studioCopy(locale)
  return <section className={styles.closing}><div><h2>{c.footerTitle}</h2><p className={styles.body}>{c.footerBody}</p></div>
    <Link href={studioHref(membership ? STUDIO_SKILL.path : '/membership', locale)} className={styles.button}>{membership ? c.exploreExample : c.membership}<ArrowRight size={16} aria-hidden="true" /></Link>
  </section>
}
export function StudioSkillPage({ locale }: { locale: Locale }) {
  const c = studioCopy(locale)
  return <MarketingPageShell language={locale} mainClassName={styles.page}>
    <PageData locale={locale} kind="skill" />
    <nav className={styles.crumbs} aria-label={c.studio}>
      <Link href={studioHref('/', locale)}>{c.home}</Link><span aria-hidden="true">/</span><span>{STUDIO_SKILL.name}</span>
    </nav>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>OPENAGENTSKILL / ORIGINALS</p>
      <h1>{STUDIO_SKILL.name}</h1><p className={styles.lead}>{c.skillLead}</p>
      <div className={styles.meta}><span>{c.madeBy}</span><span aria-hidden="true">·</span><span>{c.version} {STUDIO_SKILL.version}</span><span className={styles.badge}>{c.preview}</span></div>
    </header>
    <div className={styles.detailGrid}>
      <div className={styles.mainColumn}>
        <PreviewGallery locale={locale} />
        <div className={styles.content}>
          <section className={styles.section}><h2>{c.included}</h2><FeatureList items={c.deliverables} /></section>
          <section className={styles.section}><h2>{c.briefTitle}</h2><div className={styles.brief}><p className={styles.body}>{c.brief}</p></div></section>
          <section className={styles.section}><h2>{c.workflow}</h2><ol className={styles.steps}>{c.steps.map(step => <li key={step}>{step}</li>)}</ol></section>
          <section className={styles.section}><h2>{c.requirements}</h2><p className={styles.body}>{c.requirementsBody}</p><p className={styles.notice}>{c.evidence}</p></section>
        </div>
      </div>
      <PurchaseOptions locale={locale} />
    </div>
    <Closing locale={locale} />
  </MarketingPageShell>
}
export function MembershipPage({ locale }: { locale: Locale }) {
  const c = studioCopy(locale)
  return <MarketingPageShell language={locale} mainClassName={styles.page}>
    <PageData locale={locale} kind="membership" />
    <nav className={styles.crumbs} aria-label={c.membership}><Link href={studioHref('/', locale)}>{c.home}</Link><span aria-hidden="true">/</span><span>{c.membership}</span></nav>
    <header className={`${styles.hero} ${styles.memberHero}`}>
      <div><p className={styles.eyebrow}>OPENAGENTSKILL / MEMBERSHIP</p><h1>{c.memberTitle}</h1><p className={styles.lead}>{c.memberLead}</p><div className={styles.meta}><span className={styles.badge}>{c.preview}</span></div></div>
      <figure className={styles.heroSample}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={studioImage('wide')} width={1200} height={630} alt={STUDIO_SKILL.name} fetchPriority="high" />
        <figcaption><Link href={studioHref(STUDIO_SKILL.path, locale)} className={styles.textLink}>{c.exploreExample}<ArrowRight size={15} aria-hidden="true" /></Link></figcaption>
      </figure>
    </header>
    <p className={styles.memberNotice}><Info size={17} aria-hidden="true" /><span>{c.previewNotice}</span></p>
    <MembershipPlans locale={locale} />
    <section className={styles.scope}><h2>{c.scopeTitle}</h2><p className={styles.body}>{c.scopeBody}</p></section>
    <section className={styles.faq}><h2>{c.faq}</h2>{c.questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p className={styles.body}>{answer}</p></details>)}</section>
    <Closing locale={locale} membership />
  </MarketingPageShell>
}
