import { ArticleLayout } from './article-layout'
import { ArticleMarkdown } from './article-markdown'
import { MarketingButtonLink } from '@/components/marketing-page'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { REA_BLOG_DATE, type BlogLocale } from '@/lib/blog/routes'
import { REA_ARTICLE_COPY, REA_SKILL_SLUG, reaArticleText, reaArticleSchema } from '@/lib/blog/rea-guide'
import styles from './editorial.module.css'

export function ReaGuideArticle({ locale }: { locale: BlogLocale }) {
  const c = REA_ARTICLE_COPY[locale], language = locale === 'zh' ? 'zh-CN' : locale
  const date = new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'Asia/Shanghai' }).format(new Date(REA_BLOG_DATE))
  return <ArticleLayout language={language} backHref={getLocalizedNavigationHref('/blog', locale)} backLabel={c.backLabel}
    eyebrow={c.eyebrow} title={c.title} summary={c.summary} byline={c.byline} dateLabel={c.dateLabel} dateTime={REA_BLOG_DATE} date={date}>
    <div className="my-8 space-y-5">{c.intro.map(p => <p className={styles.text} key={p}>{p}</p>)}</div>
    <nav aria-label={c.contentsLabel} className={styles.contents}>
      <p className="mb-4 font-semibold">{c.contentsLabel}</p>
      <ul className="grid gap-2 sm:grid-cols-2">{c.sections.map(section => <li key={section.id}>
        <a className={`inline-flex min-h-11 items-center ${styles.link}`} href={`#${section.id}`}>{section.title}</a>
      </li>)}</ul>
    </nav>
    {c.sections.map(section => <section key={section.id} id={section.id} className="mt-12 scroll-mt-24">
      <h2 className={styles.heading}>{section.title}</h2>
      <div className={styles.markdown}><ArticleMarkdown content={reaArticleText(section.body)} /></div>
    </section>)}
    <section id="sources" className="mt-12 scroll-mt-24 border-t border-border pt-8">
      <h2 className={styles.heading}>{c.methodTitle}</h2>
      <div className={styles.markdown}><ArticleMarkdown content={reaArticleText(c.method)} /></div>
    </section>
    <aside className={styles.next}>
      <h2 className={styles.heading}>{c.nextTitle}</h2><p className={`mt-3 ${styles.text}`}>{c.nextText}</p>
      <MarketingButtonLink className="mt-5 max-w-full text-center" variant="primary" prefetch={false}
        href={getLocalizedNavigationHref(`/skills/${REA_SKILL_SLUG}`, locale)}>{c.cta} →</MarketingButtonLink>
    </aside>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reaArticleSchema(locale)).replace(/</g, '\\u003c') }} />
  </ArticleLayout>
}
