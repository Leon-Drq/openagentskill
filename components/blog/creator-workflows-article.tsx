import Link from '@/components/crawl-link'
import { MarketingButtonLink } from '@/components/marketing-page'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { CREATOR_BLOG_DATE, type BlogLocale } from '@/lib/blog/routes'
import { CREATOR_ARTICLE_COPY, CREATOR_WORKFLOWS, CREATOR_DISCOVERY_SOURCE, CREATOR_APP_SOURCE, creatorSourceUrl, creatorArticleSchema } from '@/lib/blog/creator-workflows'
import { ArticleLayout } from './article-layout'
import styles from './editorial.module.css'

const textStyle = styles.text
const headingStyle = styles.heading
const linkStyle = styles.link

export function CreatorWorkflowsArticle({ locale }: { locale: BlogLocale }) {
  const copy = CREATOR_ARTICLE_COPY[locale]
  const language = locale === 'zh' ? 'zh-CN' : locale
  const date = new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'Asia/Shanghai' }).format(new Date(CREATOR_BLOG_DATE))
  return (
    <ArticleLayout language={language} backHref={getLocalizedNavigationHref('/blog', locale)} backLabel={copy.backLabel}
      eyebrow={copy.eyebrow} title={copy.title} summary={copy.summary} byline={copy.byline}
      dateLabel={copy.dateLabel} dateTime={CREATOR_BLOG_DATE} date={date}>

          <div className="my-8 space-y-5">{copy.intro.map(p => <p key={p} className={textStyle}>{p}</p>)}</div>
          <nav aria-label={copy.contentsLabel} className={styles.contents}>
            <p className="mb-4 font-semibold">{copy.contentsLabel}</p>
            <ol className="grid gap-2 sm:grid-cols-2">
              {copy.groups.map((group, index) => <li key={group}><a className={`inline-flex min-h-11 items-center gap-3 ${linkStyle}`} href={`#stage-${index + 1}`}><span className="font-mono text-sm text-secondary">0{index + 1}</span>{group}</a></li>)}
              <li><a className={`inline-flex min-h-11 items-center ${linkStyle}`} href="#starter-stacks">{copy.stacksTitle}</a></li>
              <li><a className={`inline-flex min-h-11 items-center ${linkStyle}`} href="#method">{copy.methodTitle}</a></li>
            </ol>
          </nav>

          {copy.groups.map((group, index) => (
            <section key={group} id={`stage-${index + 1}`} className="mt-12 scroll-mt-24">
              <h2 className={headingStyle}><span className={`mr-3 ${styles.number}`}>0{index + 1}</span>{group}</h2>
              <div className="divide-y divide-border">
                {CREATOR_WORKFLOWS.filter(tool => tool.group === index).map(tool => (
                  <section key={tool.id} aria-labelledby={`tool-${tool.id}`} className="py-7">
                    <h3 id={`tool-${tool.id}`} className="text-xl font-semibold leading-snug">{tool.name}</h3>
                    <p className={`mt-3 ${textStyle}`}>{copy.tools[tool.id].use}</p>
                    <p className={`mt-3 ${textStyle}`}><strong className="font-semibold">{copy.checkLabel}: </strong>{copy.tools[tool.id].check}</p>
                    <p className="mt-4 text-xs leading-6 text-secondary">{copy.pathLabel}: <code className="break-all">{tool.repository} / {tool.path}</code></p>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                      <a className={`inline-flex min-h-11 items-center ${linkStyle}`} href={creatorSourceUrl(tool)}>{copy.sourceLabel} ↗</a>
                      {tool.registrySlug && <Link prefetch={false} href={getLocalizedNavigationHref(`/skills/${tool.registrySlug}`, locale)} className={`inline-flex min-h-11 items-center ${linkStyle}`}>{copy.profileLabel} →</Link>}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ))}

          <section id="starter-stacks" className="mt-10 scroll-mt-24 border-t border-border pt-10">
            <h2 className={headingStyle}>{copy.stacksTitle}</h2>
            <ol className="mt-6 space-y-6">{copy.stacks.map((stack, index) => <li key={stack.title}>
              <h3 className="text-lg font-semibold">{index + 1}. {stack.title}</h3>
              <p className={`mt-2 ${textStyle}`}>{stack.text}</p>
            </li>)}</ol>
          </section>
          <section className="mt-10">
            <h2 className={headingStyle}>{copy.briefTitle}</h2>
            <pre className={`mt-5 ${styles.brief}`}>{copy.brief}</pre>
          </section>
          <section id="method" className="mt-10 scroll-mt-24">
            <h2 className={headingStyle}>{copy.methodTitle}</h2>
            <div className="mt-5 space-y-4">{copy.method.map(p => <p key={p} className={textStyle}>{p}</p>)}</div>
            <ul className="mt-5 space-y-3 text-sm leading-7">
              <li><a className={linkStyle} href={CREATOR_DISCOVERY_SOURCE}>{copy.creditLabel} ↗</a></li>
              <li><a className={linkStyle} href={CREATOR_APP_SOURCE}>{copy.appSourceLabel} ↗</a></li>
            </ul>
          </section>
          <aside className={styles.next}>
            <h2 className={headingStyle}>{copy.nextTitle}</h2>
            <p className={`mt-3 ${textStyle}`}>{copy.nextText}</p>
            <MarketingButtonLink prefetch={false} href={getLocalizedNavigationHref('/skills?q=content', locale)} variant="primary" className="mt-5 max-w-full gap-2 text-center">{copy.browseLabel}<span aria-hidden="true">→</span></MarketingButtonLink>
          </aside>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(creatorArticleSchema(locale)).replace(/</g, '\\u003c') }} />
    </ArticleLayout>
  )
}
