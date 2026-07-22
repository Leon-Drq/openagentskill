import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InstallCommand } from '@/components/install-command'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills } from '@/lib/db/skills'
import { getSkillStackBySlug, selectSkillsForStack } from '@/lib/collections'
import { I18nProvider } from '@/lib/i18n/context'
import { getCuratedPageCopy, getLocalizedCollectionContent } from '@/lib/i18n/curated-content'
import { getLocaleFromSearchParam, getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { getSkillQualityProfile, formatCompactNumber } from '@/lib/quality'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string | string[] }>
}): Promise<Metadata> {
  const [{ slug }, { lang }] = await Promise.all([params, searchParams])
  const stack = getSkillStackBySlug(slug)
  if (!stack) return { title: 'Workflow Recipe Not Found' }
  const locale = getLocaleFromSearchParam(lang)
  const localizedStack = getLocalizedCollectionContent(locale, stack)

  return {
    title: `${localizedStack.title} | OpenAgentSkill`,
    description: localizedStack.description,
    other: { 'content-language': locale },
    alternates: {
      canonical: `https://www.openagentskill.com/collections/${slug}`,
    },
    openGraph: {
      title: `${localizedStack.title} — OpenAgentSkill`,
      description: localizedStack.description,
      url: `https://www.openagentskill.com/collections/${slug}`,
      type: 'article',
    },
  }
}

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string | string[] }>
}) {
  const [{ slug }, { lang }] = await Promise.all([params, searchParams])
  const stack = getSkillStackBySlug(slug)
  if (!stack) notFound()
  const locale = getLocaleFromSearchParam(lang)
  const copy = getCuratedPageCopy(locale)
  const localizedStack = getLocalizedCollectionContent(locale, stack)
  const localizedHref = (href: string) => getLocalizedNavigationHref(href, locale)

  const allSkills = await getAllSkills('quality', undefined, 1200).catch(() => [])
  const picks = selectSkillsForStack(allSkills, stack, 8)
  const compareUrl = `/compare?skills=${encodeURIComponent(picks.slice(0, 4).map((skill) => skill.slug).join(','))}`

  return (
    <I18nProvider initialLocale={locale}>
      <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 flex items-center gap-2 text-sm text-secondary">
          <Link href={localizedHref('/collections')} className="hover:text-foreground">{copy.collectionBreadcrumb}</Link>
          <span>/</span>
          <span className="text-foreground">{localizedStack.shortTitle}</span>
        </nav>

        <section className="border-b border-border pb-10">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-secondary">{copy.collectionEyebrow}</p>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="font-display text-4xl font-bold leading-tight text-balance sm:text-6xl">
                {localizedStack.title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{localizedStack.description}</p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary">
                {localizedStack.persona}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={localizedHref(compareUrl)}
                  className="border border-foreground bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
                >
                  {copy.compareRecommendedSkills}
                </Link>
                <Link
                  href={localizedHref(`/skills?useCase=${stack.useCaseSlug}&quality=excellent`)}
                  className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                >
                  {copy.browseMatchingSkills}
                </Link>
              </div>
            </div>
            <div className="border border-border p-5">
              <p className="mb-4 font-mono text-xs uppercase tracking-widest text-secondary">{copy.expectedOutcome}</p>
              <ul className="space-y-3 text-sm text-secondary">
                {localizedStack.outcomes.map((outcome) => (
                  <li key={outcome} className="border-l border-border pl-3">{outcome}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-secondary">{copy.workflowMap}</p>
            <h2 className="font-display text-2xl font-semibold">{copy.followSequence}</h2>
          </div>
          <div className="grid gap-px border border-border bg-border md:grid-cols-4">
            {localizedStack.workflowSteps.map((step, index) => (
              <div key={step.title} className="bg-background p-4">
                <div className="mb-3 font-mono text-xs text-secondary">0{index + 1}</div>
                <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-secondary">{copy.suggestedCapabilities}</p>
            <h2 className="font-display text-2xl font-semibold">{copy.chooseSkills}</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              {copy.chooseSkillsDescription}
            </p>
          </div>
          <div className="divide-y divide-border border border-border">
            {picks.map((skill, index) => {
              const quality = getSkillQualityProfile(skill)
              return (
                <article key={skill.slug} className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm text-secondary">#{index + 1}</span>
                        <Link href={localizedHref(`/skills/${skill.slug}`)} className="font-display text-xl font-semibold hover:text-secondary">
                          {skill.name}
                        </Link>
                        <span className="border border-border px-2 py-0.5 text-xs font-mono text-secondary">
                          {copy.quality} · {quality.score}
                        </span>
                      </div>
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-secondary">{copy.sourceDescription}</p>
                      <p className="mt-1 text-sm leading-relaxed text-secondary">{skill.description}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs font-mono text-secondary">
                        <span>{formatCompactNumber(skill.github_stars || 0)} {copy.stars}</span>
                        <span>{!skill.license || skill.license.toLowerCase() === 'unknown' ? copy.unknownLicense : skill.license}</span>
                        <span>{skill.category}</span>
                      </div>
                    </div>
                    <Link
                      href={localizedHref(`/compare?skills=${encodeURIComponent(picks.slice(0, 3).map((item) => item.slug).concat(skill.slug).filter((value, position, values) => values.indexOf(value) === position).slice(0, 4).join(','))}`)}
                      className="shrink-0 border border-border px-3 py-2 text-center text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
                    >
                      {copy.compare}
                    </Link>
                  </div>
                  {(skill.install_command || skill.github_repo) && (
                    <div className="mt-4">
                      <InstallCommand
                        command={skill.install_command || `npx skills add ${skill.github_repo}`}
                        skillSlug={skill.slug}
                        compact
                      />
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        <section className="grid gap-8 py-10 lg:grid-cols-2">
          <div className="border border-border p-5">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-secondary">{copy.goodFit}</p>
            <ul className="space-y-2 text-sm leading-relaxed text-secondary">
              {localizedStack.idealFor.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div className="border border-border p-5">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-secondary">{copy.notRightWhen}</p>
            <ul className="space-y-2 text-sm leading-relaxed text-secondary">
              {localizedStack.avoidWhen.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-border py-10">
          <div className="flex flex-col justify-between gap-4 border border-border p-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-secondary">{copy.needPack}</p>
              <p className="mt-2 text-sm leading-relaxed text-secondary">{copy.needPackDescription}</p>
            </div>
            <Link href={localizedHref('/skill-packs')} className="shrink-0 border border-border px-4 py-2.5 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground">{copy.browsePacks}</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
      </div>
    </I18nProvider>
  )
}
