import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ChevronDown, Star } from 'lucide-react'
import { MarketingPageShell } from '@/components/marketing-page'
import { GitHubOwnerAvatar } from '@/components/github-owner-avatar'
import { getGitHubOwner } from '@/lib/github-owner'
import { getRankingCompareHref, getRankingDefinition, getRankingDefinitions, normalizeRankingText } from '@/lib/rankings'
import { getRankingLanding } from '@/lib/ranking-landing-data'
import { rankingLandingJsonLd, validRankingDate } from '@/lib/ranking-landing'
import { directoryCopy, directoryLabel } from '@/lib/i18n/directory-copy'
import { rankingCopy, localizedRanking } from '@/lib/i18n/ranking-copy'
import { trendingCopy } from '@/lib/i18n/trending-copy'
import { getLocaleFromSearchParam, getLocalizedNavigationHref } from '@/lib/i18n/market-routing'

export const revalidate = 300
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export function generateStaticParams() {
  return getRankingDefinitions().map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const ranking = getRankingDefinition(slug)
  if (!ranking) return { title: 'Ranking Not Found', robots: { index: false, follow: true } }
  const locale = getLocaleFromSearchParam(query.lang)
  const c = localizedRanking(ranking, locale)
  const url = `https://www.openagentskill.com/rankings/${ranking.slug}`
  const title = `${c.title} | OpenAgentSkill`
  return {
    title: { absolute: title }, description: c.description, alternates: { canonical: url },
    robots: { index: locale === 'en' && !Object.keys(query).some(key => key !== 'lang'), follow: true },
    openGraph: { title, description: c.description, url, type: 'website' },
    twitter: { card: 'summary_large_image', title, description: c.description },
  }
}

export default async function RankingDetailPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const ranking = getRankingDefinition(slug)
  if (!ranking) notFound()
  const locale = getLocaleFromSearchParam(query.lang)
  const c = rankingCopy(locale)
  const d = directoryCopy(locale)
  const t = trendingCopy(locale)
  const copy = localizedRanking(ranking, locale)
  const href = (path: string) => getLocalizedNavigationHref(path, locale)
  const { items, candidateCount, source } = await getRankingLanding(slug)
  const number = new Intl.NumberFormat(locale)
  const date = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })
  const dateText = (value: string | null | undefined) => validRankingDate(value) ? date.format(new Date(value!)) : c.unknown
  const url = `https://www.openagentskill.com/rankings/${slug}`
  const jsonLd = rankingLandingJsonLd(ranking, items, copy.title, copy.description)
  const tabs = [
    { path: '/trending', label: t.title },
    { path: '/rankings/most-starred-agent-skills', label: t.stars },
    { path: '/rankings/new-agent-skills-this-week', label: d.new },
    { path: '/rankings/recently-updated-agent-skills', label: d.fresh },
  ]

  return (
    <MarketingPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div lang={locale} className="mx-auto max-w-6xl px-5 sm:px-6">
        <header className="border-b border-border pb-8 pt-8 sm:pb-10 sm:pt-10">
          <nav aria-label={c.eyebrow} className="mb-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-secondary">
            <Link href={href('/rankings')} className="hover:text-[#006C52]">{t.rankings}</Link><span aria-hidden="true">/</span><span aria-current="page">{copy.shortTitle}</span>
          </nav>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#006C52]">{c.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl leading-[1.08] [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl">{copy.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-secondary sm:text-base">{copy.description}</p>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-border py-4">
          <nav aria-label={t.rankings} className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-sm">
            {tabs.map(tab => <Link key={tab.path} href={href(tab.path)} aria-current={tab.path === `/rankings/${slug}` ? 'page' : undefined} className={`py-2 ${tab.path === `/rankings/${slug}` ? 'border-b-2 border-[#006C52] font-semibold text-[#006C52]' : 'text-secondary hover:text-foreground'}`}>{tab.label}</Link>)}
          </nav>
          <details className="group/menu relative ml-auto max-w-full" data-ranking-menu>
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-4 border border-border px-3 text-xs hover:border-foreground">{c.choose}<ChevronDown size={14} aria-hidden="true" className="group-open/menu:rotate-180" /></summary>
            <nav aria-label={c.choose} className="absolute right-0 z-20 mt-2 max-h-[min(60dvh,26rem)] w-72 max-w-[calc(100vw-2.5rem)] overflow-y-auto overscroll-contain border border-border bg-background p-2 shadow-lg">
              {getRankingDefinitions().map(def => <Link key={def.slug} prefetch={false} href={href(`/rankings/${def.slug}`)} aria-current={slug === def.slug ? 'page' : undefined} className={`block break-words px-3 py-3 text-sm hover:bg-muted ${slug === def.slug ? 'font-semibold text-[#006C52]' : 'text-secondary'}`}>{localizedRanking(def, locale).shortTitle}</Link>)}
            </nav>
          </details>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 py-5 text-xs text-secondary">
          <p>{c.scope.replace('{shown}', number.format(items.length)).replace('{count}', number.format(candidateCount))}</p>
          {items.length > 1 ? <Link href={href(getRankingCompareHref(items))} className="inline-flex min-h-8 items-center gap-2 text-[#006C52]">{c.compare}<ArrowRight size={14} aria-hidden="true" /></Link> : null}
        </div>
        {source === 'saved-directory' ? <p role="status" className="mb-6 border-l-2 border-amber-600 pl-4 text-sm leading-6 text-secondary">{c.saved}</p> : null}

        <section aria-label={copy.title} data-ranking-results data-ranking-source={source}>
          {!items.length ? <div role="status" className="border-t border-border py-12 text-sm leading-7 text-secondary"><p>{source === 'unavailable' ? c.unavailable : c.empty}</p><Link href={href('/skills')} className="mt-4 inline-block text-[#006C52] underline underline-offset-4">{d.all}</Link></div> : (
            <ol className="divide-y divide-border border-t border-border">
              {items.map(item => {
                const skill = item.skill
                const owner = getGitHubOwner(skill)
                const recordDate = ranking.kind === 'new-this-week' ? skill.created_at : validRankingDate(skill.github_last_pushed_at) ? skill.github_last_pushed_at : skill.updated_at
                const dateLabel = ranking.kind === 'new-this-week' ? c.indexed : validRankingDate(skill.github_last_pushed_at) ? c.pushed : c.registryUpdated
                const showDate = ['new-this-week', 'recently-updated'].includes(ranking.kind)
                return <li key={skill.slug} value={item.rank} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 py-6 sm:grid-cols-[2rem_3rem_minmax(0,1fr)_9rem] sm:gap-x-5 sm:py-7">
                  <span className="pt-1 font-mono text-lg tabular-nums text-secondary" aria-label={`#${item.rank}`}>{String(item.rank).padStart(2, '0')}</span>
                  <div className="hidden pt-1 sm:block"><GitHubOwnerAvatar owner={owner} label={skill.author_name} size="lg" /></div>
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl leading-tight sm:text-[27px]"><Link href={href(`/skills/${skill.slug}`)} className="break-words hover:text-[#006C52]">{normalizeRankingText(skill.name)}</Link></h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-secondary">{normalizeRankingText(skill.description)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-secondary">
                      <span className="inline-flex min-w-0 items-center gap-2"><span className="sm:hidden"><GitHubOwnerAvatar owner={owner} size="sm" linked={false} /></span><span className="break-all">@{owner || skill.author_name}</span></span>
                      <span>{directoryLabel(locale, skill.category)}</span>
                      {ranking.kind !== 'most-starred' ? <span className="inline-flex items-center gap-1" title={d.repoStars}><Star size={12} aria-hidden="true" />{number.format(skill.github_stars || 0)}</span> : null}
                    </div>
                    <Link href={href(`/skills/${skill.slug}#source-trust`)} className="mt-3 inline-block text-xs text-secondary underline decoration-border underline-offset-4 hover:text-foreground">{d.review}</Link>
                  </div>
                  <div className="col-start-2 mt-3 flex flex-wrap items-center justify-between gap-3 sm:col-start-4 sm:mt-0 sm:block sm:text-right">
                    {ranking.kind === 'most-starred' ? <div><p className="font-mono text-2xl tabular-nums">{number.format(skill.github_stars || 0)}</p><p className="mt-1 text-[11px] text-secondary">{d.repoStars}</p></div> : null}
                    {showDate ? <div><p className="font-mono text-sm">{validRankingDate(recordDate) ? <time dateTime={recordDate!}>{dateText(recordDate)}</time> : c.unknown}</p><p className="mt-1 text-[11px] text-secondary">{dateLabel}</p></div> : null}
                    <Link href={href(`/skills/${skill.slug}`)} className="inline-flex min-h-11 items-center gap-2 text-sm text-[#006C52] sm:mt-3">{d.details}<ArrowRight size={15} aria-hidden="true" /></Link>
                  </div>
                  <details className="col-start-2 col-end-[-1] mt-3 text-xs text-secondary sm:col-start-3">
                    <summary className="flex min-h-8 w-fit cursor-pointer list-none items-center gap-2 hover:text-foreground">{c.evidence}<ChevronDown size={12} aria-hidden="true" /></summary>
                    <p className="mt-2 max-w-2xl leading-6">{c.signalsNote}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 border-l border-border pl-4 sm:grid-cols-3">
                      {Object.entries(item.dimensions).filter(([, value]) => value !== null).map(([key, value]) => <div key={key}><dt>{c[key as keyof typeof item.dimensions]}</dt><dd className="mt-1 font-mono text-foreground">{number.format(Math.max(0, Math.min(100, Math.round(value!))))}/100</dd></div>)}
                    </dl>
                  </details>
                </li>
              })}
            </ol>
          )}
        </section>

        <p className="border-t border-border py-5 text-xs leading-6 text-secondary">{c.notice}</p>
        <details className="border-y border-border py-5" data-ranking-method>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl">{c.method}<ChevronDown size={16} aria-hidden="true" /></summary>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-secondary">{copy.method}</p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">{c.signalsNote}</p>
          {ranking.kind !== 'use-case' ? <Link href={`/api/agent/rankings/${slug}/history?days=30`} className="mt-4 inline-block text-xs text-[#006C52] underline underline-offset-4">{c.history}</Link> : null}
        </details>
        <nav aria-label={t.related} className="flex flex-wrap items-center gap-x-6 gap-y-4 py-8 text-sm">
          <Link href={href('/rankings')} className="text-secondary hover:text-[#006C52]">{t.rankings} ↗</Link>
          <Link href={href('/skills')} className="text-secondary hover:text-[#006C52]">{d.all} ↗</Link>
          <Link href={href('/skills?quality=excellent&minStars=500')} className="text-secondary hover:text-[#006C52]">{localizedRanking(getRankingDefinition('highest-quality-agent-skills')!, locale).shortTitle} ↗</Link>
          <a href={`https://x.com/intent/post?text=${encodeURIComponent(copy.title)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-[#006C52]">{c.share} ↗</a>
        </nav>
      </div>
    </MarketingPageShell>
  )
}
