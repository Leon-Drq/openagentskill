import { ArrowDown, ArrowRight, Info, Layers, PenTool, Terminal } from 'lucide-react'
import Link from '@/components/crawl-link'
import { MarketingPageShell } from '@/components/marketing-page'
import { jsonLd } from '@/lib/seo/resource-pages'
import { studioPageData } from '@/lib/studio/seo'
import { studioCopy } from '@/lib/i18n/studio-copy'
import { studioUiCopy } from '@/lib/i18n/studio-ui-copy'
import { type Locale } from '@/lib/i18n/config'
import { STUDIO_SKILL, studioHref } from '@/lib/studio/catalog'
import { PreviewGallery } from './preview-gallery'
import { FeatureList, MembershipPlans, PurchaseOptions } from './pricing-options'
import { Artwork } from './artwork'
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
  const ui = studioUiCopy(locale)
  return <MarketingPageShell language={locale} mainClassName={styles.page}>
    <PageData locale={locale} kind="skill" />
    <nav className={styles.crumbs} aria-label={c.studio}>
      <Link href={studioHref('/', locale)}>{c.home}</Link><span aria-hidden="true">/</span><span>{STUDIO_SKILL.name}</span>
    </nav>
    <div className={styles.detailGrid}>
      <PreviewGallery locale={locale} />
      <div className={styles.productColumn}>
        <header className={styles.productHeader}>
          <div className={styles.productKicker}><p className={styles.eyebrow}>{ui.original}</p><span className={styles.badge}>{c.preview}</span></div>
          <h1>Launch Card <em>Studio</em></h1><p className={styles.lead}>{c.skillLead}</p>
          <div className={styles.author}><span className={styles.authorMark} aria-hidden="true">( )</span><span>{c.madeBy}</span><span className={styles.version}>v{STUDIO_SKILL.version}</span></div>
          <ul className={styles.facts}><li><Layers aria-hidden="true" />{ui.formatCount}</li><li><PenTool aria-hidden="true" />{ui.editable}</li><li><Terminal aria-hidden="true" />{ui.local}</li></ul>
        </header>
        <PurchaseOptions locale={locale} />
      </div>
    </div>
    <div className={styles.content}>
      <section className={styles.inside}>
        <div><p className={styles.eyebrow}>01 / {ui.details}</p><h2>{c.included}</h2><FeatureList items={c.deliverables} /></div>
        <div className={styles.brief}><span className={styles.briefDot} aria-hidden="true" /><h3>{c.briefTitle}</h3><p>{c.brief}</p><span className={styles.briefFormat}>BRIEF → SVG</span></div>
      </section>
      <section className={styles.workflow}><p className={styles.eyebrow}>02 / WORKFLOW</p><h2>{c.workflow}</h2><ol className={styles.steps}>{c.steps.map(step => <li key={step}>{step}</li>)}</ol></section>
      <section className={styles.requirements}><div><Terminal aria-hidden="true" /><h2>{c.requirements}</h2></div><div><p className={styles.body}>{c.requirementsBody}</p><p className={styles.notice}>{c.evidence}</p></div></section>
    </div>
    <Closing locale={locale} />
  </MarketingPageShell>
}
export function MembershipPage({ locale }: { locale: Locale }) {
  const c = studioCopy(locale)
  const ui = studioUiCopy(locale)
  return <MarketingPageShell language={locale} mainClassName={styles.page}>
    <PageData locale={locale} kind="membership" />
    <nav className={styles.crumbs} aria-label={c.membership}><Link href={studioHref('/', locale)}>{c.home}</Link><span aria-hidden="true">/</span><span>{c.membership}</span></nav>
    <header className={styles.memberHero}>
      <div className={styles.memberIntro}><p className={styles.eyebrow}>OPENAGENTSKILL / MEMBERSHIP</p><h1>{c.memberTitle}</h1><p className={styles.lead}>{c.memberLead}</p><div className={styles.heroActions}><a href="#plans" className={styles.button}>{c.compare}<ArrowDown size={16} aria-hidden="true" /></a><Link href={studioHref(STUDIO_SKILL.path, locale)} className={styles.textLink}>{c.exploreExample}<ArrowRight size={15} aria-hidden="true" /></Link></div></div>
      <figure className={styles.heroSample}>
        <Artwork locale={locale} />
        <figcaption><span>{ui.memberArt}</span><span className={styles.badge}>{c.preview}</span></figcaption>
      </figure>
    </header>
    <div className={styles.plansSection} id="plans"><div className={styles.plansHeading}><h2>{ui.comparePlans}</h2><p className={styles.body}>{ui.compareLead}</p></div><MembershipPlans locale={locale} /></div>
    <p className={styles.memberNotice}><Info size={17} aria-hidden="true" /><span>{c.previewNotice}</span></p>
    <section className={styles.scope}><h2>{c.scopeTitle}</h2><p className={styles.body}>{c.scopeBody}</p></section>
    <section className={styles.faq}><h2>{c.faq}</h2>{c.questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p className={styles.body}>{answer}</p></details>)}</section>
    <Closing locale={locale} membership />
  </MarketingPageShell>
}
