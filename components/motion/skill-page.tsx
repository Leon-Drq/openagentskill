import { ArrowLeft, ArrowUpRight, FileText, FolderOpen, MonitorPlay, BookOpen } from 'lucide-react'
import Link from '@/components/crawl-link'
import { MarketingPageShell } from '@/components/marketing-page'
import { I18nProvider } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/config'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { jsonLd } from '@/lib/seo/resource-pages'
import { motionCategoryLabel, motionTagLabel, type MotionEntry } from '@/lib/motion/shared'
import { motionCopy } from '@/lib/motion/copy'
import { motionDetailCopy } from '@/lib/motion/detail-copy'
import { motionDetailDescription, relatedMotionEntries } from '@/lib/motion/detail'
import { motionSkillHref } from '@/lib/motion/routes'
import { MotionPreview } from './motion-preview'
import { MotionPurchaseOptions } from './purchase-options'
import { DirectoryMotionCard } from './directory-motion-card'
import styles from './detail.module.css'

const packageIcons = [FileText, FolderOpen, MonitorPlay, BookOpen]
export function MotionSkillPage({ entry, locale }: { entry: MotionEntry; locale: Locale }) {
  const language = locale === 'zh' ? 'zh' : 'en'
  const c = motionDetailCopy(language), preview = motionCopy(language)
  const directory = getLocalizedNavigationHref('/skills?access=paid&category=motion-design', locale)
  const url = 'https://www.openagentskill.com' + motionSkillHref(entry.id, language)
  const structuredData = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: entry.title, url, description: motionDetailDescription(entry, language), inLanguage: language,
      primaryImageOfPage: { '@type': 'ImageObject', url: entry.posterUrl },
      isPartOf: { '@type': 'WebSite', name: 'OpenAgentSkill', url: 'https://www.openagentskill.com' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: c.skills, item: 'https://www.openagentskill.com' + getLocalizedNavigationHref('/skills', locale) },
      { '@type': 'ListItem', position: 2, name: motionCategoryLabel(locale), item: 'https://www.openagentskill.com' + directory },
      { '@type': 'ListItem', position: 3, name: entry.title, item: url },
    ] },
  ]
  return <I18nProvider initialLocale={locale}><MarketingPageShell language={language} mainClassName={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
    <nav className={styles.breadcrumbs} aria-label={c.skills}>
      <Link href={getLocalizedNavigationHref('/skills', locale)}>{c.skills}</Link><span aria-hidden="true">/</span><Link href={directory}>{motionCategoryLabel(locale)}</Link><span aria-hidden="true">/</span><span aria-current="page">{entry.title}</span>
    </nav>
    <div className={styles.hero} data-motion-detail={entry.id}>
      <div className={styles.previewColumn}>
        <figure className={styles.film} id="preview">
          <MotionPreview entry={entry} locale={language} />
          <figcaption><span>{preview.preview}</span><span>{entry.width} × {entry.height}</span></figcaption>
        </figure>
        <p className={styles.previewNote}>{c.previewNote}</p>
        <nav className={styles.contents} aria-label={c.about}>
          <a href="#about">{c.about}</a><a href="#included">{c.included}</a><a href="#using">{c.use}</a>
        </nav>
      </div>
      <div className={styles.productColumn}>
        <header className={styles.productHeader}>
          <div className={styles.eyebrow}><Link href={directory}>{motionCategoryLabel(locale)}</Link><span>{preview.paid}</span></div>
          <h1>{entry.title}</h1>
          <p className={styles.lead}>{c.lead}</p>
          <a className={styles.author} href={entry.sourcePost || entry.sourceUrl} target="_blank" rel="noopener noreferrer"><span className={styles.avatar} aria-hidden="true">{entry.sourceCreatorName.slice(0, 1)}</span><span><small>{c.original}</small>{entry.sourceCreatorName} <span className={styles.handle}>@{entry.sourceAuthor}</span></span><ArrowUpRight size={15} aria-hidden="true" /></a>
          <ul className={styles.tags} aria-label={c.tags}>{entry.tags.map(tag => <li key={tag}>{motionTagLabel(tag, language)}</li>)}</ul>
        </header>
        <MotionPurchaseOptions locale={language} slug={entry.id} />
      </div>
      <div className={styles.description}>
        <section id="about" className={styles.section}>
          <h2>{c.about}</h2><p>{motionDetailDescription(entry, language)}</p>
        </section>
        <section id="included" className={styles.section}>
          <h2>{c.included}</h2><p>{c.packageNote}</p>
          <div className={styles.packageGrid}>{c.deliverables.map(([title, description], index) => {
            const Icon = packageIcons[index]
            return <div className={styles.packageItem} key={title}><Icon size={21} strokeWidth={1.5} aria-hidden="true" /><h3>{title}</h3><p>{description}</p></div>
          })}</div>
        </section>
        <section id="using" className={styles.section}>
          <h2>{c.workflowTitle}</h2><ol className={styles.steps}>{c.steps.map((step, index) => <li key={step}><span aria-hidden="true">{index + 1}</span><p>{step}</p></li>)}</ol>
          <div className={styles.requirements}><h3>{c.requirements}</h3><p>{c.requirementsBody}</p></div>
        </section>
        <section className={styles.section}>
          <h2>{c.source}</h2><p>{c.sourceBody}</p>
          <div className={styles.sources}>
            <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">{c.sourceLink}<ArrowUpRight size={15} aria-hidden="true" /></a>
            {entry.sourcePost && <a href={entry.sourcePost} target="_blank" rel="noopener noreferrer">{c.post}<ArrowUpRight size={15} aria-hidden="true" /></a>}
            {entry.sourceRepo && <a href={entry.sourceRepo} target="_blank" rel="noopener noreferrer">{c.repository}<ArrowUpRight size={15} aria-hidden="true" /></a>}
          </div>
        </section>
      </div>
    </div>
    <section className={styles.related}>
      <div className={styles.relatedHeading}><h2>{c.related}</h2><Link href={directory}>{c.all}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
      <div className={styles.relatedGrid}>{relatedMotionEntries(entry).map(item => <DirectoryMotionCard key={item.id} entry={item} locale={locale} />)}</div>
    </section>
    <Link href={directory} className={styles.back}><ArrowLeft size={16} aria-hidden="true" />{c.back}</Link>
  </MarketingPageShell></I18nProvider>
}
