import Link from '@/components/crawl-link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { localeNativeNames } from '@/lib/i18n/config'
import { BLOG_LOCALES, CREATOR_BLOG_DATE, creatorBlogPath, type BlogLocale } from '@/lib/blog/routes'
import { CREATOR_ARTICLE_COPY, CREATOR_WORKFLOWS, CREATOR_DISCOVERY_SOURCE, CREATOR_APP_SOURCE, creatorSourceUrl, creatorArticleSchema } from '@/lib/blog/creator-workflows'

const textStyle = 'text-base leading-8 text-foreground/85'
const headingStyle = 'font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground'
const linkStyle = 'underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors'

export function CreatorWorkflowsArticle({ locale }: { locale: BlogLocale }) {
  const copy = CREATOR_ARTICLE_COPY[locale]
  const language = locale === 'zh' ? 'zh-CN' : locale
  const date = new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(CREATOR_BLOG_DATE))
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <article lang={language} className="min-w-0 [overflow-wrap:anywhere]">
          <header className="border-b border-border pb-8">
            <Link href="/blog" className={`text-sm text-secondary ${linkStyle}`}>{copy.backLabel}</Link>
            <p className="mt-8 mb-4 text-xs uppercase tracking-widest text-[#006b4f] dark:text-emerald-400">{copy.eyebrow}</p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-balance">{copy.title}</h1>
            <p className="mt-5 text-lg leading-8 text-secondary">{copy.summary}</p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-secondary">
              <span>{copy.byline}</span>
              <span>{copy.dateLabel}: <time dateTime={CREATOR_BLOG_DATE}>{date}</time></span>
            </div>
            <nav aria-label={copy.languageLabel} className="mt-6 flex flex-wrap items-center gap-2 text-sm">
              <span className="mr-1 text-secondary">{copy.languageLabel}:</span>
              {BLOG_LOCALES.map(code => (
                <Link key={code} href={creatorBlogPath(code)} hrefLang={code} lang={code} prefetch={false}
                  aria-current={code === locale ? 'page' : undefined}
                  className={`inline-flex min-h-11 items-center border px-3 py-2 ${code === locale ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground'}`}>
                  {localeNativeNames[code]}
                </Link>
              ))}
            </nav>
          </header>

          <div className="my-8 space-y-5">{copy.intro.map(p => <p key={p} className={textStyle}>{p}</p>)}</div>
          <nav aria-label={copy.contentsLabel} className="border border-border bg-muted/30 p-5 sm:p-6">
            <p className="mb-4 font-semibold">{copy.contentsLabel}</p>
            <ol className="grid gap-2 sm:grid-cols-2">
              {copy.groups.map((group, index) => <li key={group}><a className={`inline-flex min-h-11 items-center gap-3 ${linkStyle}`} href={`#stage-${index + 1}`}><span className="font-mono text-sm text-secondary">0{index + 1}</span>{group}</a></li>)}
              <li><a className={`inline-flex min-h-11 items-center ${linkStyle}`} href="#starter-stacks">{copy.stacksTitle}</a></li>
              <li><a className={`inline-flex min-h-11 items-center ${linkStyle}`} href="#method">{copy.methodTitle}</a></li>
            </ol>
          </nav>

          {copy.groups.map((group, index) => (
            <section key={group} id={`stage-${index + 1}`} className="mt-12 scroll-mt-24">
              <h2 className={headingStyle}><span className="mr-3 font-mono text-base font-normal text-[#006b4f] dark:text-emerald-400">0{index + 1}</span>{group}</h2>
              <div className="divide-y divide-border">
                {CREATOR_WORKFLOWS.filter(tool => tool.group === index).map(tool => (
                  <section key={tool.id} aria-labelledby={`tool-${tool.id}`} className="py-7">
                    <h3 id={`tool-${tool.id}`} className="font-display text-xl font-semibold">{tool.name}</h3>
                    <p className={`mt-3 ${textStyle}`}>{copy.tools[tool.id].use}</p>
                    <p className={`mt-3 ${textStyle}`}><strong className="font-semibold">{copy.checkLabel}: </strong>{copy.tools[tool.id].check}</p>
                    <p className="mt-4 text-xs leading-6 text-secondary">{copy.pathLabel}: <code className="break-all">{tool.repository} / {tool.path}</code></p>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                      <a className={`inline-flex min-h-11 items-center ${linkStyle}`} href={creatorSourceUrl(tool)}>{copy.sourceLabel} ↗</a>
                      {tool.registrySlug && <Link prefetch={false} href={`/skills/${tool.registrySlug}`} className={`inline-flex min-h-11 items-center ${linkStyle}`}>{copy.profileLabel} →</Link>}
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
            <pre className="mt-5 whitespace-pre-wrap break-words border border-border bg-muted/40 p-4 sm:p-6 font-mono text-sm leading-7">{copy.brief}</pre>
          </section>
          <section id="method" className="mt-10 scroll-mt-24">
            <h2 className={headingStyle}>{copy.methodTitle}</h2>
            <div className="mt-5 space-y-4">{copy.method.map(p => <p key={p} className={textStyle}>{p}</p>)}</div>
            <ul className="mt-5 space-y-3 text-sm leading-7">
              <li><a className={linkStyle} href={CREATOR_DISCOVERY_SOURCE}>{copy.creditLabel} ↗</a></li>
              <li><a className={linkStyle} href={CREATOR_APP_SOURCE}>{copy.appSourceLabel} ↗</a></li>
            </ul>
          </section>
          <aside className="my-10 border border-border p-5 sm:p-7">
            <h2 className="font-display text-xl font-semibold">{copy.nextTitle}</h2>
            <p className={`mt-3 ${textStyle}`}>{copy.nextText}</p>
            <Link prefetch={false} href={`${locale === 'en' ? '' : `/${locale}`}/skills?q=content`} className="mt-5 inline-flex min-h-11 items-center border border-foreground px-4 py-2 text-sm hover:bg-foreground hover:text-background">{copy.browseLabel} →</Link>
          </aside>
        </article>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(creatorArticleSchema(locale)).replace(/</g, '\\u003c') }} />
      </main>
      <SiteFooter />
    </div>
  )
}
