import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ChevronDown, Star } from 'lucide-react'
import { GitHubOwnerAvatar } from '@/components/github-owner-avatar'
import { MarketingPageShell } from '@/components/marketing-page'
import { getLatestRankingSnapshot } from '@/lib/ranking-snapshots'
import { isTrendingSnapshot, isTrendingStale, trendingJsonLd, trendingWindow } from '@/lib/trending'
import { trendingCopy } from '@/lib/i18n/trending-copy'
import { directoryCopy, directoryLabel } from '@/lib/i18n/directory-copy'
import { getLocaleFromSearchParam, getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { directoryCategoryOptions, matchesDirectoryCategory } from '@/lib/skills/directory'

export const revalidate = 300
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }
const canonical = 'https://www.openagentskill.com/trending'

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const locale = getLocaleFromSearchParam(params.lang)
  const c = trendingCopy(locale)
  const title = locale === 'en' ? 'Trending AI Agent Skills | OpenAgentSkill' : `${c.title} | OpenAgentSkill`
  return {
    title: { absolute: title }, description: c.intro, alternates: { canonical },
    // Preserve the English landing URL; preference/filter URLs are not new SEO landing pages.
    robots: { index: locale === 'en' && !Object.keys(params).some(key => key !== 'lang'), follow: true },
    openGraph: { title, description: c.intro, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description: c.intro },
  }
}

export default async function TrendingSkillsPage({ searchParams }: Props) {
  const [params, saved] = await Promise.all([searchParams, getLatestRankingSnapshot('trending')])
  const locale = getLocaleFromSearchParam(params.lang)
  const c = trendingCopy(locale)
  const d = directoryCopy(locale)
  const href = (path: string) => getLocalizedNavigationHref(path, locale)
  const snapshot = isTrendingSnapshot(saved) ? saved : null
  const category = (Array.isArray(params.category) ? params.category[0] : params.category) || ''
  const items = snapshot?.items.filter(item => !category || matchesDirectoryCategory(item.category, category)) || []
  const categories = directoryCategoryOptions(snapshot?.items.map(item => item.category) || [])
  const number = new Intl.NumberFormat(locale)
  const date = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })
  const window = snapshot ? trendingWindow(new Date(snapshot.generated_at)) : null
  const endInclusive = window ? new Date(Date.parse(window.end) - 86_400_000) : null
  const jsonLd = trendingJsonLd(items, c.title, c.intro, snapshot?.generated_at)

  return (
    <MarketingPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div lang={locale} className="mx-auto max-w-6xl px-5 sm:px-6">
        <header className="grid gap-6 border-b border-border pb-8 pt-10 sm:pb-10 sm:pt-14 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#006C52]">{c.eyebrow}</p>
            <h1 className="mt-4 font-display text-4xl leading-[1.05] sm:text-6xl">{c.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-secondary sm:text-base">{c.intro}</p>
          </div>
          {snapshot && window && endInclusive ? (
            <div className="text-xs leading-6 text-secondary lg:text-right">
              <p>{c.period}</p>
              <p className="font-mono text-foreground"><time dateTime={window.start}>{date.format(new Date(window.start))}</time> – <time dateTime={endInclusive.toISOString().slice(0, 10)}>{date.format(endInclusive)}</time></p>
              <p className="mt-1">{c.updated} <time dateTime={snapshot.generated_at}>{date.format(new Date(snapshot.generated_at))}</time></p>
            </div>
          ) : null}
        </header>
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-4 border-b border-border py-4">
          <nav aria-label={c.rankings} className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href={href('/trending')} aria-current="page" className="border-b-2 border-[#006C52] py-2 font-semibold text-[#006C52]">{c.title}</Link>
            <Link href={href('/rankings/most-starred-agent-skills')} className="py-2 text-secondary hover:text-foreground">{c.stars}</Link>
            <Link href={href('/skills/new')} className="py-2 text-secondary hover:text-foreground">{c.newest}</Link>
          </nav>
          <form action="/trending" method="get" className="flex max-w-full items-center gap-2">
            {locale !== 'en' ? <input type="hidden" name="lang" value={locale} /> : null}
            <label className="sr-only" htmlFor="trending-category">{d.category}</label>
            <select id="trending-category" name="category" defaultValue={category} className="w-44 max-w-[55vw] text-xs">
              <option value="">{c.allCategories}</option>
              {category && !categories.includes(category) ? <option value={category}>{directoryLabel(locale, category)}</option> : null}
              {categories.map(value => <option key={value} value={value}>{directoryLabel(locale, value)}</option>)}
            </select>
            <button type="submit" className="min-h-11 border border-border px-3 text-xs hover:border-foreground">{c.apply}</button>
          </form>
        </div>
        {snapshot && isTrendingStale(snapshot) ? <p role="status" className="my-5 border-l-2 border-amber-600 pl-4 text-sm leading-6 text-secondary">{c.stale}</p> : null}
        <section aria-label={c.title} data-trending-results>
          {!items.length ? (
            <div className="py-14 text-sm leading-7 text-secondary" role="status">
              <p>{!snapshot ? c.unavailable : category ? c.noMatch : c.empty}</p>
              <Link href={href(category ? '/trending' : '/skills')} className="mt-4 inline-block text-[#006C52] underline underline-offset-4">{category ? d.reset : d.all}</Link>
            </div>
          ) : <ol className="divide-y divide-border">
            {items.map(item => (
              <li key={item.slug} value={item.rank} className="group grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 py-6 sm:grid-cols-[2rem_3rem_minmax(0,1fr)_10rem] sm:gap-x-5 sm:py-7">
                <span className="pt-1 font-mono text-lg tabular-nums text-secondary" aria-label={`#${item.rank}`}>{String(item.rank).padStart(2, '0')}</span>
                <div className="hidden pt-1 sm:block"><GitHubOwnerAvatar owner={item.github_owner} label={item.author_name} size="lg" /></div>
                <div className="min-w-0">
                  <h2 className="font-display text-2xl leading-tight sm:text-[27px]"><Link href={href(`/skills/${item.slug}`)} className="break-words hover:text-[#006C52]">{item.name}</Link></h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-secondary">{item.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-secondary">
                    <span className="flex items-center gap-2"><span className="sm:hidden"><GitHubOwnerAvatar owner={item.github_owner} size="sm" linked={false} /></span>@{item.github_owner || item.author_name}</span>
                    <span>{directoryLabel(locale, item.category)}</span>
                    <span className="inline-flex items-center gap-1" title={d.repoStars}><Star size={12} aria-hidden="true" />{number.format(item.github_stars)}</span>
                  </div>
                  <Link href={href(`/skills/${item.slug}#source-trust`)} className="mt-3 inline-block text-xs text-secondary underline decoration-border underline-offset-4 hover:text-foreground">{d.review}</Link>
                </div>
                <div className="col-start-2 mt-4 flex flex-wrap items-center justify-between gap-3 sm:col-start-4 sm:mt-0 sm:block sm:text-right">
                  <div><p className="font-mono text-2xl tabular-nums">{number.format(item.activity.total_events)}</p><p className="mt-1 text-[11px] text-secondary">{c.interactions}</p></div>
                  <Link href={href(`/skills/${item.slug}`)} className="inline-flex min-h-11 items-center gap-2 text-sm text-[#006C52] sm:mt-3">{d.details}<ArrowRight size={15} aria-hidden="true" /></Link>
                </div>
                <details className="col-start-2 col-end-[-1] mt-3 text-xs text-secondary sm:col-start-3">
                  <summary className="flex min-h-8 w-fit cursor-pointer list-none items-center gap-2 hover:text-foreground">{c.evidence}<ChevronDown size={12} aria-hidden="true" /></summary>
                  <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 border-l border-border pl-4 sm:grid-cols-3">
                    {[[c.views, item.activity.views], [c.copies, item.activity.install_copies], [c.compares, item.activity.compares], [c.saves, item.activity.saves], [c.clicks, item.activity.outbound_clicks], [c.activeDays, item.activity.active_days]].map(([label, count]) => <div key={label}><dt>{label}</dt><dd className="mt-1 font-mono text-foreground">{number.format(Number(count))}</dd></div>)}
                  </dl>
                </details>
              </li>
            ))}
          </ol>}
        </section>
        <p className="border-t border-border py-5 text-xs leading-6 text-secondary">{c.notice}</p>
        <details className="border-y border-border py-5" data-trending-method>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl">{c.method}<ChevronDown size={16} aria-hidden="true" /></summary>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-secondary">{c.methodology}</p>
          {snapshot ? <p className="mt-3 break-all font-mono text-[10px] text-secondary">{snapshot.methodology_version}</p> : null}
        </details>
        <nav aria-label={c.related} className="flex flex-wrap items-center gap-x-6 gap-y-4 py-8 text-sm">
          {[[c.rankings, '/rankings'], [c.hot, '/hot'], [c.official, '/official'], [c.audits, '/audits'], [c.agents, '/agents']].map(([label, path]) => <Link key={path} href={href(path)} className="text-secondary hover:text-[#006C52]">{label} ↗</Link>)}
        </nav>
      </div>
    </MarketingPageShell>
  )
}
