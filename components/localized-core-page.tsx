import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { LocalizedResolveWorkbench } from '@/components/localized-resolve-workbench'
import { MarketingButtonLink, MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
import { getAllSkills, searchSkills, type SkillRecord } from '@/lib/db/skills'
import { getMarketCoreContent } from '@/lib/i18n/market-core-pages'
import { getLocalizedCorePath, type LocalizedCorePageSlug, type MarketLocale } from '@/lib/i18n/market-routing'
import { formatCompactNumber } from '@/lib/quality'
import { getSkillTrustProfileV5 } from '@/lib/trust'

function skillListForPage(page: LocalizedCorePageSlug, query?: string) {
  if (page !== 'skills' && page !== 'agent-skills-registry') return Promise.resolve([] as SkillRecord[])

  const normalizedQuery = query?.trim()
  if (normalizedQuery) return searchSkills(normalizedQuery, 12).catch(() => [])

  return getAllSkills('quality', undefined, page === 'skills' ? 12 : 6).catch(() => [])
}

function SkillCards({
  skills,
  labels,
}: {
  skills: SkillRecord[]
  labels: ReturnType<typeof getMarketCoreContent>['labels']
}) {
  if (!skills.length) {
    return <p className="border border-border bg-card p-5 text-sm text-secondary">{labels.noResults}</p>
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {skills.map((skill) => {
        const trust = getSkillTrustProfileV5(skill)
        return (
          <article key={skill.slug} className="flex min-w-0 flex-col border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/skills/${skill.slug}`} className="min-w-0 text-lg font-semibold leading-tight transition-colors hover:text-[#006b4f]">
                <span className="block break-words [overflow-wrap:anywhere]">{skill.name}</span>
              </Link>
              <span className="shrink-0 rounded-[999px] border border-border bg-background px-2 py-1 font-mono text-[10px] text-secondary">
                {trust.score}
              </span>
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-secondary">{skill.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-px border border-border bg-border text-center">
              <div className="bg-background p-2">
                <div className="font-mono text-xs text-foreground">{formatCompactNumber(skill.github_stars || 0)}</div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-secondary">{labels.stars}</div>
              </div>
              <div className="bg-background p-2">
                <div className="font-mono text-xs text-foreground">{trust.score}/100</div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-secondary">{labels.trust}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-secondary">
              <span className="truncate">{labels.category}: {skill.category}</span>
              <Link href={`/skills/${skill.slug}/audit`} className="shrink-0 underline underline-offset-2 hover:text-foreground">
                {labels.audit}
              </Link>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function LocalizedSkillsDirectory({
  locale,
  query,
  skills,
}: {
  locale: MarketLocale
  query?: string
  skills: SkillRecord[]
}) {
  const content = getMarketCoreContent(locale)
  const copy = content.skills
  const action = getLocalizedCorePath(locale, 'skills')

  return (
    <>
      <MarketingHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        actions={
          <MarketingButtonLink href={getLocalizedCorePath(locale, 'resolve')} variant="primary">
            {content.resolve.submit}
          </MarketingButtonLink>
        }
      />
      <section className="border-b border-border bg-card/35">
        <div className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
          <form action={action} className="grid gap-3 rounded-[8px] border border-border bg-background p-4 sm:grid-cols-[1fr_auto] sm:p-5">
            <label className="min-w-0">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.18em] text-secondary">{copy.searchLabel}</span>
              <input
                name="q"
                defaultValue={query}
                placeholder={copy.searchPlaceholder}
                className="h-11 w-full min-w-0 border border-border bg-card px-3 text-sm outline-none transition-colors placeholder:text-secondary/80 focus:border-[#006b4f]"
              />
            </label>
            <button type="submit" className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#006b4f] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              <Search className="h-4 w-4" aria-hidden="true" />
              {copy.search}
            </button>
          </form>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-secondary">{copy.intro}</p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-2xl font-normal sm:text-3xl">
            {query ? `${content.labels.searchResults}: ${query}` : content.labels.browseSkills}
          </h2>
          <Link href="/skills" className="inline-flex items-center gap-2 text-sm text-secondary transition-colors hover:text-foreground">
            {content.labels.englishDirectory} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <SkillCards skills={skills} labels={content.labels} />
      </section>
    </>
  )
}

function LocalizedAgentSkillPage({ locale }: { locale: MarketLocale }) {
  const content = getMarketCoreContent(locale)
  const copy = content.agentSkill

  return (
    <>
      <MarketingHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        actions={
          <>
            <MarketingButtonLink href={getLocalizedCorePath(locale, 'skills')} variant="primary">
              {content.labels.browseSkills}
            </MarketingButtonLink>
            <MarketingButtonLink href={getLocalizedCorePath(locale, 'docs')}>
              {content.labels.viewDocs}
            </MarketingButtonLink>
          </>
        }
      />
      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="grid gap-px overflow-hidden rounded-[8px] border border-border bg-border md:grid-cols-3">
          {copy.sections.map((section, index) => (
            <article key={section.title} className="bg-background p-5 sm:p-6">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">{String(index + 1).padStart(2, '0')}</p>
              <h2 className="mt-4 font-display text-2xl font-normal leading-tight">{section.title}</h2>
              <p className="mt-4 text-sm leading-6 text-secondary">{section.copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="border-t border-border bg-card/35">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 px-6 py-8 sm:flex-row sm:items-center">
          <p className="max-w-2xl text-sm leading-6 text-secondary">{content.registry.intro}</p>
          <MarketingButtonLink href={getLocalizedCorePath(locale, 'agent-skills-registry')} variant="primary">
            {content.registry.eyebrow}
          </MarketingButtonLink>
        </div>
      </section>
    </>
  )
}

function LocalizedRegistryPage({ locale, skills }: { locale: MarketLocale; skills: SkillRecord[] }) {
  const content = getMarketCoreContent(locale)
  const copy = content.registry

  return (
    <>
      <MarketingHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        actions={
          <>
            <MarketingButtonLink href={getLocalizedCorePath(locale, 'resolve')} variant="primary">
              {content.resolve.submit}
            </MarketingButtonLink>
            <MarketingButtonLink href={getLocalizedCorePath(locale, 'docs')}>
              {content.labels.apiDocs}
            </MarketingButtonLink>
          </>
        }
      />
      <section className="border-b border-border bg-card/35">
        <div className="mx-auto grid max-w-6xl gap-7 px-6 py-10 sm:py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Registry API</p>
            <h2 className="mt-4 font-display text-3xl font-normal leading-tight">{copy.introTitle}</h2>
            <p className="mt-4 text-sm leading-6 text-secondary">{copy.intro}</p>
          </div>
          <pre className="overflow-x-auto border border-border bg-foreground p-4 font-mono text-xs leading-6 text-background sm:p-5">{`GET /api/agent/resolve?task=analyze+stock+news\n\nTrust, audit, risk, and install guidance\nare returned in one agent-readable response.`}</pre>
        </div>
      </section>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
          <MarketingMetricStrip
            columns="grid-cols-1 sm:grid-cols-3"
            items={copy.metrics.map((metric) => ({ value: metric.title, label: metric.copy }))}
          />
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-2xl font-normal sm:text-3xl">{content.labels.browseSkills}</h2>
          <Link href={getLocalizedCorePath(locale, 'skills')} className="inline-flex items-center gap-2 text-sm text-secondary transition-colors hover:text-foreground">
            {content.labels.browseSkills} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <SkillCards skills={skills} labels={content.labels} />
      </section>
    </>
  )
}

function LocalizedDocsPage({ locale }: { locale: MarketLocale }) {
  const content = getMarketCoreContent(locale)
  const copy = content.docs

  return (
    <>
      <MarketingHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        actions={
          <>
            <MarketingButtonLink href={getLocalizedCorePath(locale, 'resolve')} variant="primary">
              {content.resolve.submit}
            </MarketingButtonLink>
            <MarketingButtonLink href="/api-docs">
              {content.labels.apiDocs}
            </MarketingButtonLink>
          </>
        }
      />
      <div className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
        <div className="space-y-8">
          {copy.sections.map((section, index) => (
            <section key={section.title} className="border-b border-border pb-8 last:border-b-0">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">{String(index + 1).padStart(2, '0')}</p>
              <h2 className="mt-3 font-display text-2xl font-normal">{section.title}</h2>
              <p className="mt-3 text-base leading-7 text-secondary">{section.copy}</p>
            </section>
          ))}
          <section className="border border-border bg-card p-5 sm:p-6">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Install</p>
            <p className="mt-3 text-sm leading-6 text-secondary">{copy.installIntro}</p>
            <code className="mt-4 block overflow-x-auto border border-border bg-background p-3 font-mono text-sm">npx skills add owner/repo</code>
          </section>
          <section className="border border-border bg-card p-5 sm:p-6">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Agent API</p>
            <p className="mt-3 text-sm leading-6 text-secondary">{copy.apiIntro}</p>
            <code className="mt-4 block overflow-x-auto border border-border bg-background p-3 font-mono text-xs leading-6">GET /api/agent/resolve?task=your+task&amp;format=text</code>
          </section>
        </div>
      </div>
    </>
  )
}

export async function LocalizedCorePage({
  locale,
  page,
  query,
}: {
  locale: MarketLocale
  page: LocalizedCorePageSlug
  query?: string
}) {
  const content = getMarketCoreContent(locale)
  const skills = await skillListForPage(page, query)

  return (
    <MarketingPageShell>
      {page === 'resolve' ? (
        <>
          <MarketingHero
            eyebrow={content.resolve.eyebrow}
            title={content.resolve.title}
            description={content.resolve.description}
            aside={
              <MarketingMetricStrip
                columns="grid-cols-3"
                items={content.resolve.features.map((feature, index) => ({
                  value: String(index + 1).padStart(2, '0'),
                  label: feature.title,
                }))}
              />
            }
          />
          <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
            <LocalizedResolveWorkbench locale={locale} copy={content.resolve} labels={content.labels} />
          </section>
          <section className="border-t border-border bg-card/35">
            <div className="mx-auto grid max-w-6xl gap-px overflow-hidden border-x border-border bg-border sm:grid-cols-3">
              {content.resolve.features.map((feature) => (
                <div key={feature.title} className="bg-background p-5">
                  <h2 className="font-display text-xl font-normal">{feature.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-secondary">{feature.copy}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
      {page === 'skills' ? <LocalizedSkillsDirectory locale={locale} query={query} skills={skills} /> : null}
      {page === 'agent-skill' ? <LocalizedAgentSkillPage locale={locale} /> : null}
      {page === 'agent-skills-registry' ? <LocalizedRegistryPage locale={locale} skills={skills} /> : null}
      {page === 'docs' ? <LocalizedDocsPage locale={locale} /> : null}
    </MarketingPageShell>
  )
}
