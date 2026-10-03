'use client'

import { SKILL_CATEGORIES, TOPIC_RULES, OUTPUT_RULES, categoryLabel } from '@/lib/skills/taxonomy'
import { NativeSelect } from '@/components/ui/native-select'
import { commerceCopy } from '@/lib/i18n/commerce-copy'
import { acquisitionTypes, hasCommercialOffers, type PriceFilter, type SkillCommerce } from '@/lib/skills/commerce'
import { SkillPrice } from '@/components/skill-commerce'

import Image from 'next/image'
import { discoveryIcons } from './discovery-navigation'
import { DISCOVERY_TASKS, discoveryCopy } from '@/lib/discovery'
import { getShowcaseImageSrc, getShowcaseEvidenceLabel, localizeShowcase, type ShowcaseCardData } from '@/lib/showcase-shared'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'
import { SkillActions, SkillEngagementProvider } from './skill-engagement'
import type { SupplyTrackSummary } from '@/lib/supply'

interface AgentStats {
  total_calls: number
  success_calls: number
  success_rate: number | null
  avg_latency_ms: number | null
  unique_agents: number
}

interface SkillQualitySummary {
  score: number
  tier: string
  label: string
  summary: string
  warnings: string[]
}

interface SkillTrustSummary {
  score: number
  tier: string
  label: string
  summary: string
  warnings: string[]
}

interface SkillSafetySummary {
  blocked: boolean
  safety_tier: {
    tier: string
    badge: string
    label: string
    summary: string
  }
}

interface SkillSupplySummary {
  track: {
    slug: string
    shortLabel: string
  }
  scenario: {
    label: string
    description: string
  }
  applicableAgents: string[]
  install: {
    targetCount: number
  }
  maintenance: {
    label: string
  }
  risk: {
    label: string
  }
}

interface DirectorySkill {
  slug: string
  name: string
  tagline: string
  category: string
  stars: number
  trustScore: number | null
  qualityScore: number
  installCommand?: string
}

interface DirectorySection {
  title: string
  eyebrow: string
  href: string
  description: string
  skills: DirectorySkill[]
}

interface DirectoryLink {
  label: string
  href: string
  description: string
}

export interface DirectorySkillCard {
  exampleCount: number
  preview?: ShowcaseCardData | null
  commerce: SkillCommerce
  id: string
  slug: string
  name: string
  tagline: string
  category: string
  taxonomyTags: string[]
  stats: {
    downloads: number
    stars: number
    rating: number
    qualityScore?: number
    weeklyGrowth?: number
  }
  technical: {
    installCommand?: string
  }
  compatibility: Array<{ platform: string }>
  author: { name: string; owner?: string }
  snapshot?: boolean
  sourceStatus?: string
  verified: boolean
  createdAt: string
  agentStats?: AgentStats | null
  qualityProfile?: SkillQualitySummary
  trustProfile?: SkillTrustSummary
  safetyProfile?: SkillSafetySummary
  platformHints?: string[]
  supplyProfile?: SkillSupplySummary
  provider?: { label: string; sourceHref: string; sourceRel: string; image?: string; exampleLabel: string; localizedName?: string; sourceDownloads?: number }
}



import { GitHubOwnerAvatar } from './github-owner-avatar'
import { useI18n } from '@/lib/i18n/context'
import { directoryCopy, directoryLabel } from '@/lib/i18n/directory-copy'
import { directoryCategories, directoryCategoryOptions, directoryHref } from '@/lib/skills/directory'
import { Search, ArrowRight, SlidersHorizontal, Star, X, LoaderCircle } from 'lucide-react'

// A stable server snapshot avoids localStorage hydration mismatches. Selection
// still works in memory when private browsing disables persistence.
const compareKey = 'openagentskill.compare'
let memorySelection: string | null = null
function readSelection() {
  if (memorySelection !== null) return memorySelection
  try { return localStorage.getItem(compareKey) || '[]' } catch { return '[]' }
}
function subscribeSelection(notify: () => void) {
  const onStorage = () => { memorySelection = null; notify() }
  window.addEventListener('storage', onStorage)
  window.addEventListener('oas-compare-change', notify)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('oas-compare-change', notify)
  }
}
function writeSelection(slugs: string[]) {
  memorySelection = JSON.stringify(slugs)
  try { localStorage.setItem(compareKey, memorySelection) } catch { /* Optional persistence. */ }
  window.dispatchEvent(new Event('oas-compare-change'))
}

interface Props {
  pricing: PriceFilter
  providerCommercialOffers?: boolean
  pathname: string
  queryString: string
  skills: DirectorySkillCard[]
  query?: string
  sort: string
  featured: boolean
  examplesOnly: boolean
  catalogMode: boolean
  category: string
  topic: string
  output: string
  categories: string[]
  useCase: string
  useCases: Array<{ slug: string; shortTitle: string }>
  platform: string
  platformOptions: string[]
  quality: string
  trust: string
  safety: string
  supplyTrack: string
  supplyTracks: SupplyTrackSummary[]
  minStars: number
  resultCount: number
  page: number
  rankOffset: number
  hasPreviousResults: boolean
  hasMoreResults: boolean
  degraded: boolean
  directorySections: DirectorySection[]
  directoryLinks: DirectoryLink[]
}


export function SkillsPageClient(props: Props) {
  const { skills, query, sort, category, categories, useCase, useCases, platform, platformOptions,
    quality, trust, safety, supplyTrack, minStars, resultCount, page, rankOffset,
    hasPreviousResults, hasMoreResults, degraded, directorySections, directoryLinks } = props
  const { locale } = useI18n()
  const discovery = discoveryCopy(locale)
  const [filtersOpen, setFiltersOpen] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const update = () => setFiltersOpen(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const c = directoryCopy(locale)
  const prices = commerceCopy(locale)
  const reportedResult = useRef('')
  useEffect(() => {
    const key = JSON.stringify([query, sort, category, page, resultCount, degraded, props.featured, props.examplesOnly])
    if (reportedResult.current === key) return
    reportedResult.current = key
    // No raw queries, task text, URLs or user identifiers in event parameters.
    trackAnalyticsEvent('directory_results', {
      mode: props.catalogMode ? 'catalog' : query ? 'search' : 'selected',
      result_count: resultCount, visible_count: skills.length, page, degraded,
      has_query: Boolean(query), locale,
    })
  }, [query, sort, category, page, resultCount, degraded, props.featured, props.examplesOnly, props.catalogMode, skills.length, locale])
  // Server-provided URL state preserves SSR on cached pages. Reading
  // useSearchParams here would bail the entire directory out to client render.
  const { pathname, queryString } = props
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const storedSelection = useSyncExternalStore(subscribeSelection, readSelection, () => '[]')
  let compareSlugs: string[] = []
  try {
    const stored: unknown = JSON.parse(storedSelection)
    if (Array.isArray(stored)) compareSlugs = [...new Set(stored.filter((v): v is string => typeof v === 'string'))].slice(0, 4)
  } catch { /* Invalid saved data must not break the directory. */ }
  const href = (updates: Record<string, string | undefined>) => directoryHref(pathname, queryString, updates)
  const navigateTo = (destination: string) => startTransition(() => router.push(destination, { scroll: false }))
  const navigate = (updates: Record<string, string | undefined>) => navigateTo(href(updates))
  // onNavigate only handles same-tab client navigation. Real hrefs remain
  // available to crawlers, no-JS browsers and Cmd/Ctrl-click.
  const filterNavigation = (destination: string) => (event: { preventDefault: () => void }) => {
    event.preventDefault()
    navigateTo(destination)
  }
  const resetHref = directoryHref(pathname, queryString, Object.fromEntries(
    ['q','sort','category','useCase','platform','quality','trust','safety','track','minStars','page','tag','output','view','pricing','featured','examples'].map(key => [key, undefined])
  ))
  const toggleCompare = (slug: string) => {
    trackAnalyticsEvent('skill_compare', { skill_slug: slug, source: 'directory', selected: !compareSlugs.includes(slug) })
    writeSelection(compareSlugs.includes(slug) ? compareSlugs.filter(v => v !== slug) : [...compareSlugs, slug].slice(-4))
  }
  const label = (key: string) => {
    const facet = TOPIC_RULES.find(t => t[0] === key)
    return SKILL_CATEGORIES.some(c => c[0] === key) ? categoryLabel(key, locale) : facet ? facet[locale === 'zh' ? 3 : 2] : directoryLabel(locale, key)
  }
  const primaryCategories = ['coding-agents','design-creative','video-creation','research','presentation','finance']
  const categoryOptions = directoryCategoryOptions([...categories, ...primaryCategories, category === 'all' ? '' : category])
  const selectedCategory = category === 'all' ? 'all' : directoryCategories(category)[0]
  const activeFilters = Object.entries({ featured: props.featured ? 'featured' : 'all', examples: props.examplesOnly ? 'withExamples' : 'all', pricing: props.pricing, category, tag: props.topic, output: props.output, useCase, platform, quality, trust, safety, track: supplyTrack, minStars: minStars ? String(minStars) : 'all' })
    .filter(([, value]) => value && value !== 'all')
  const sortOptions = [
    ['quality', query ? c.relevance : props.catalogMode ? c.quality : c.recommended], ['stars', c.stars],
    ['fresh', c.fresh], ['new', c.new], ['trending', c.trending],
    ...(sort === 'downloads' ? [['downloads', c.trending]] : []),
  ]
  const advanced = [
    { key: 'useCase', title: c.useCase, value: useCase, options: useCases.map(v => [v.slug, v.shortTitle]) },
    { key: 'platform', title: c.platform, value: platform, options: [...new Set(['Codex', 'Claude Code', 'Cursor', ...platformOptions, ...(platform !== 'all' ? [platform] : [])])].map(v => [v, v]) },
    { key: 'minStars', title: c.minimum, value: String(minStars || 'all'), options: ['20','100','500','1000','5000'].map(v => [v, v + '+']) },
  ]
  const stars = (value: number) => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="skills-directory mx-auto max-w-[1440px] px-4 pb-16 sm:px-6">
        <header className="border-b border-border pb-7 pt-10 sm:pb-9 sm:pt-14" data-directory-hero>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#006b4f]">OPENAGENTSKILL / DIRECTORY</p>
          <h1 className="mt-4 font-display text-4xl font-normal tracking-tight sm:text-6xl">AI Agent <em className="font-normal text-[#006b4f]">Skills</em></h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-secondary sm:text-base">{c.intro}</p>
          <p className="mt-3 max-w-3xl text-xs leading-6 text-secondary" data-directory-scope>{discovery.directoryNote}</p>
        </header>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8">
          <aside className="min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto" aria-label={discovery.filters}>
            <details data-directory-filters open={filtersOpen} onToggle={event => setFiltersOpen(event.currentTarget.open)} className="rounded-[12px] border border-border bg-card/40 p-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold lg:hidden">
                <span className="inline-flex items-center gap-2"><SlidersHorizontal size={16} aria-hidden="true" />{discovery.filters}{activeFilters.length ? ` · ${activeFilters.length}` : ''}</span><ArrowRight size={16} aria-hidden="true" />
              </summary>
              <div className="mt-4 space-y-6 lg:mt-0">
                <div data-discovery-filters className="grid gap-1">
                  {[['featured', discovery.featured, props.featured], ['examples', discovery.withExamples, props.examplesOnly]].map(([key, title, checked]) =>
                    <label key={String(key)} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                      <input type="checkbox" checked={Boolean(checked)} disabled={pending} onChange={event => navigate({ [String(key)]: event.target.checked ? 'true' : undefined, ...(key === 'featured' ? { view: undefined } : {}) })} className="h-4 w-4 accent-[#006b4f]" />
                      {title}
                    </label>)}
                </div>
                <nav aria-label={c.category} data-directory-categories>
                  <h2 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-secondary">{c.category}</h2>
                  {['all', ...SKILL_CATEGORIES.slice(0, 15).map(item => item[0])].map(key => {
                    const item = SKILL_CATEGORIES.find(item => item[0] === key)
                    const Icon = item ? discoveryIcons[item[3]] : Search
                    return <Link key={key} prefetch={false} href={href({ category: key, tag: undefined, track: undefined, useCase: undefined })} scroll={false}
                      onNavigate={filterNavigation(href({ category: key, tag: undefined, track: undefined, useCase: undefined }))} aria-current={selectedCategory === key ? 'page' : undefined}
                      className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${selectedCategory === key ? 'bg-[#006b4f]/10 font-semibold text-[#006b4f]' : 'text-secondary hover:bg-muted hover:text-foreground'}`}>
                      <Icon size={16} className="shrink-0" aria-hidden="true" />{key === 'all' ? label('allCategories') : label(key)}
                    </Link>
                  })}
                </nav>
                <div className="grid gap-4 border-t border-border pt-5">
                  <label className="grid gap-2 text-xs text-secondary">{c.category}
                    <NativeSelect disabled={pending} value={selectedCategory} onChange={e => navigate({ category: e.target.value, tag: undefined })} className="w-full bg-transparent text-sm">
                      <option value="all">{c.all}</option>{categoryOptions.map(key => <option key={key} value={key}>{label(key)}</option>)}
                    </NativeSelect>
                  </label>
                  <label className="grid gap-2 text-xs text-secondary">{label('taskTag')}
                    <NativeSelect aria-label={label('taskTag')} disabled={pending} value={props.topic} onChange={e => navigate({ tag: e.target.value })} className="w-full bg-transparent text-sm">
                      <option value="all">{c.any}</option>{TOPIC_RULES.filter(t => selectedCategory === 'all' || t[1] === selectedCategory || t[0] === props.topic).map(t => <option key={t[0]} value={t[0]}>{t[locale === 'zh' ? 3 : 2]}</option>)}
                    </NativeSelect>
                  </label>
                  <label className="grid gap-2 text-xs text-secondary">{label('outputType')}
                    <NativeSelect aria-label={label('outputType')} disabled={pending} value={props.output} onChange={e => navigate({ output: e.target.value })} className="w-full bg-transparent text-sm">
                      <option value="all">{c.any}</option>{OUTPUT_RULES.map(t => <option key={t[0]} value={t[0]}>{t[locale === 'zh' ? 2 : 1]}</option>)}
                    </NativeSelect>
                  </label>
                  <label className="grid gap-2 text-xs text-secondary">{prices.pricing}
                    <NativeSelect disabled={pending} aria-label={prices.pricing} value={props.pricing} onChange={e => navigate({ pricing: e.target.value })} className="w-full bg-transparent text-sm">
                      <option value="all">{prices.all}</option>{acquisitionTypes.filter(type => !['paid', 'freemium'].includes(type) || (hasCommercialOffers() || props.providerCommercialOffers) || props.pricing === type).map(type => <option key={type} value={type}>{prices[type]}</option>)}
                    </NativeSelect>
                  </label>
                  {advanced.map(filter => <label key={filter.key} className="grid gap-2 text-xs text-secondary">{filter.title}
                    <NativeSelect disabled={pending} value={filter.value} onChange={e => navigate({ [filter.key]: e.target.value })} className="w-full bg-transparent text-sm">
                      <option value="all">{c.any}</option>{filter.options.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
                    </NativeSelect>
                  </label>)}
                </div>
                <nav className="border-t border-border pt-5" aria-label={discovery.explore}>
                  <h2 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-secondary">{discovery.explore}</h2>
                  {DISCOVERY_TASKS.slice(0, 4).map(item => <Link key={item.id} href={getLocalizedNavigationHref(item.href, locale)} prefetch={false} className="flex min-h-11 items-center justify-between gap-2 text-xs text-secondary hover:text-[#006b4f]">{item.label[locale]}<ArrowRight size={12} aria-hidden="true" /></Link>)}
                </nav>
              </div>
            </details>
          </aside>
        <section aria-labelledby="directory-results-heading" aria-busy={pending} className="relative min-w-0" data-directory-results>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center" data-directory-toolbar>
            <form role="search" action={pathname} method="get" data-directory-search onSubmit={event => {
              event.preventDefault()
              const q = String(new FormData(event.currentTarget).get('q') || '').trim()
              trackAnalyticsEvent('directory_search', { has_query: Boolean(q), query_length: q.length, locale })
              navigate({ q: q || undefined, sort: undefined })
            }} className="flex min-w-0 flex-1 items-center gap-2 rounded-[12px] border border-border bg-card p-2 focus-within:border-[#006b4f]">
              <Search size={18} className="ml-2 hidden shrink-0 text-secondary sm:block" aria-hidden="true" />
              <input key={query || ''} type="search" name="q" defaultValue={query} aria-label={c.search}
                id="skill-search" placeholder={c.placeholder} className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-base outline-none sm:text-sm" />
              <button type="submit" disabled={pending} className="shrink-0 rounded-lg bg-[#006b4f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#00533d] disabled:opacity-50 sm:px-6">{c.search}</button>
            </form>
            <div className="shrink-0 sm:w-52">
              <label className="flex min-h-[62px] min-w-0 max-w-full items-center gap-3 rounded-[12px] border border-border bg-card px-3 text-xs text-secondary">
                <span className="shrink-0">{c.sort}</span>
                <NativeSelect aria-label={c.sort} value={sort} onChange={e => navigate({ sort: e.target.value })} disabled={pending} className="w-full max-w-full bg-transparent text-sm">
                  {sortOptions.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
                </NativeSelect>
              </label>
            </div>
          </div>
          {pending && <div data-directory-loading aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-2 h-0.5 overflow-hidden rounded-full bg-border"><div className="h-full w-2/3 animate-pulse bg-[#006b4f]" /></div>}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 id="directory-results-heading" className="break-words text-base font-semibold">
                {query ? `${c.results} · “${query}”` : props.featured ? discovery.featured : discovery.all}
                {pending && <LoaderCircle size={14} className="ml-2 inline-block animate-spin text-[#006b4f]" aria-hidden="true" />}
              </h2>
              <p className="mt-1 font-mono text-xs text-secondary" data-directory-count>
                {props.catalogMode
                  ? `${c.page} ${page} · ${skills.length} ${label('shown')} · ${degraded ? '—' : resultCount.toLocaleString(locale)} ${label('registryEntries')}`
                  : <>{skills.length ? rankOffset + 1 : 0}–{rankOffset + skills.length} / {resultCount.toLocaleString(locale)}</>}
              </p>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" aria-label={c.active}>
              {activeFilters.map(([key,value]) => <Link key={key} prefetch={false} href={href({ [key]: undefined, ...(key === 'featured' ? { view: undefined } : {}) })} scroll={false}
                onNavigate={filterNavigation(href({ [key]: undefined, ...(key === 'featured' ? { view: undefined } : {}) }))}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-border px-3 py-2" aria-label={`${c.remove}: ${key === 'pricing' ? prices[props.pricing] : key === 'featured' || key === 'examples' ? discovery[value as 'featured' | 'withExamples'] : label(value)}`}>
                <span className="break-all">{key === 'pricing' ? prices[props.pricing] : key === 'featured' || key === 'examples' ? discovery[value as 'featured' | 'withExamples'] : label(value)}</span><X size={12} className="shrink-0" aria-hidden="true" />
              </Link>)}
              <Link href={resetHref} prefetch={false} scroll={false} onNavigate={filterNavigation(resetHref)} className="p-2 text-[#006b4f] underline underline-offset-4">{c.reset}</Link>
            </div>
          )}
          <p role="status" className="sr-only">{pending ? c.loading : `${c.results}: ${degraded ? skills.length : resultCount}`}</p>
          {props.pricing !== 'all' && <p className="my-4 text-xs leading-6 text-secondary">{prices.caveat}</p>}
          {degraded && <p role="status" className="my-5 border-l-2 border-amber-600 bg-amber-50 p-4 text-sm text-amber-950">{label(props.catalogMode && skills.length === 0 ? 'catalogUnavailable' : 'dataUnavailable')}</p>}

          {skills.length === 0 ? (
            <div className="border-y border-border py-14 text-center">
              <p className="text-secondary">{degraded ? label('catalogUnavailable') : props.pricing !== 'all' ? prices.empty : props.catalogMode && hasMoreResults ? label('excludedResources') : c.empty}</p>
              {props.pricing !== 'all' && <Link href={`/contact${locale === 'en' ? '' : '?lang=' + locale}`} className="mt-4 block text-sm text-[#006b4f] underline underline-offset-4">{prices.contribute} →</Link>}
              <Link href={resetHref} prefetch={false} scroll={false} onNavigate={filterNavigation(resetHref)} className="mt-5 inline-block text-[#006b4f] underline">{c.reset}</Link>
            </div>
          ) : <SkillEngagementProvider key={skills.map(skill => skill.slug).join(',')} slugs={skills.map(skill => skill.slug)} untrackedSlugs={skills.filter(skill => skill.provider).map(skill => skill.slug)}><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-skill-list>
            {skills.map(skill => (
              <article key={skill.id} className="group flex min-w-0 flex-col overflow-hidden rounded-[12px] border border-border bg-card transition-colors hover:border-[#006b4f]/50" data-directory-skill>
                <div className="relative isolate">
                <div className="absolute right-2 top-2 z-10 max-w-[calc(100%-1rem)] mix-blend-difference"><SkillActions slug={skill.slug} name={skill.name} compact /></div>
                {skill.provider?.image ? <Link href={getLocalizedNavigationHref(`/skills/${skill.slug}#showcase`, locale)} prefetch={false} className="relative block aspect-[16/10] overflow-hidden border-b border-border bg-muted" aria-label={`${discovery.examples}: ${skill.name}`}>
                  <Image src={skill.provider.image} alt={`${skill.name} — ${skill.provider.exampleLabel}`} fill unoptimized sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 360px" className="object-cover object-top" />
                  <span className="absolute bottom-3 left-3 rounded-md bg-background/95 px-2 py-1 text-[10px]">{skill.provider.exampleLabel}</span>
                </Link> : skill.preview ? <Link href={getLocalizedNavigationHref(`/showcase/${skill.preview.slug}`, locale)} prefetch={false} className="relative block aspect-[16/10] overflow-hidden border-b border-border bg-muted" aria-label={`${discovery.examples}: ${skill.name}`}>
                  <Image src={getShowcaseImageSrc(skill.preview.media[0].src, 'card')} alt={localizeShowcase(skill.preview.media[0].alt, locale)} fill sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 360px" className={skill.preview.cardFit === 'contain' ? 'object-contain p-3' : 'object-cover object-top'} />
                  <span className="absolute bottom-3 left-3 rounded-md bg-background/95 px-2 py-1 text-[10px]">{getShowcaseEvidenceLabel(skill.preview, locale)}</span>
                </Link> : <Link href={getLocalizedNavigationHref(`/skills/${skill.slug}`, locale)} prefetch={false} className="flex aspect-[16/10] min-h-52 flex-col justify-between gap-2 border-b border-border bg-[#eeece5]/65 p-5 pt-20 text-[#006b4f]" data-skill-capability>
                  <span className="sr-only">Agent Skill</span>
                  <span className="font-display text-3xl leading-tight">{directoryCategories(skill.category).map(label).join(' · ')}</span>
                  <span className="text-xs leading-5 text-secondary">{[...new Set(skill.platformHints || skill.compatibility.map(v => v.platform))].slice(0, 2).join(' · ') || skill.author.name}</span>
                </Link>}
                </div>
                <div className="flex min-w-0 items-start gap-3 p-5 pb-0">
                <div className="shrink-0"><GitHubOwnerAvatar owner={skill.author.owner} label={skill.author.name} size="md" /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-base font-semibold leading-snug [overflow-wrap:anywhere]">
                    <Link prefetch={false} href={`/skills/${skill.slug}${locale === 'en' ? '' : '?lang=' + locale}`}
                      onClick={() => trackAnalyticsEvent('directory_skill_open', { skill_slug: skill.slug, mode: props.catalogMode ? 'catalog' : query ? 'search' : 'selected', position: rankOffset + skills.indexOf(skill) + 1 })}
                      className="hover:text-[#006b4f]">{skill.name}</Link>
                    {skill.provider?.localizedName && <p className="mt-1 text-xs font-normal leading-5 text-secondary">{skill.provider.localizedName}</p>}
                  </h3>
                  <p className="mt-1 truncate font-mono text-[11px] text-secondary">{skill.author.owner || skill.author.name}</p>
                </div></div>
                <div className="flex-1 p-5 pt-3">
                  <p className="line-clamp-3 min-h-[4.5rem] break-words text-sm leading-6 text-secondary">{skill.tagline}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-secondary">
                    <SkillPrice commerce={skill.commerce} />
                    <Link href={href({ category: directoryCategories(skill.category)[0] })} prefetch={false} className="underline decoration-border underline-offset-4">{directoryCategories(skill.category).map(label).join(' · ')}</Link>
                    {[...new Set(skill.platformHints || skill.compatibility.map(v => v.platform))].slice(0, 2).map(value => <span key={value}>{value}</span>)}
                    {skill.provider ? <span>{skill.provider.label}</span> : skill.safetyProfile?.blocked ? <span className="text-red-700">{c.blocked}</span>
                      : skill.snapshot ? <span>{label('savedInfo')}</span>
                      : skill.sourceStatus !== 'source-recorded' ? <span>{c.review}</span> : null}
                  </div>
                  {skill.taxonomyTags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{skill.taxonomyTags.slice(0, 2).map(tag => <Link key={tag} href={href({ tag })} onNavigate={filterNavigation(href({ tag }))} scroll={false} prefetch={false} className="rounded-full border border-border px-2 py-1 text-[10px] text-secondary hover:text-[#006b4f]">{label(tag)}</Link>)}</div>}
                  {skill.exampleCount > 0 && <Link prefetch={false} href={getLocalizedNavigationHref(`/skills/${skill.slug}#showcase`, locale)} className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-medium text-[#006b4f]" data-skill-examples>{discovery.examples} · {skill.exampleCount}<ArrowRight size={12} aria-hidden="true" /></Link>}
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/45 px-5 py-3">
                  {skill.provider ? <a aria-label={`${locale === 'zh' ? '在' : 'Get on'} ${skill.provider.label}: ${skill.name}`} href={skill.provider.sourceHref} target="_blank" rel={skill.provider.sourceRel} className="inline-flex min-h-10 items-center gap-1 text-xs text-[#006b4f]">{locale === 'zh' ? '获取技能' : 'Get skill'} ↗</a> : <span title={c.repoStars} className="inline-flex items-center gap-1.5 font-mono text-sm"><Star size={14} aria-hidden="true" />{stars(skill.stats.stars)}<span className="text-[10px] text-secondary">GitHub</span></span>}
                  <div className="flex items-center gap-4 text-xs">
                    {!skill.provider && <button type="button" aria-pressed={compareSlugs.includes(skill.slug)} onClick={() => toggleCompare(skill.slug)}
                      className="min-h-10 text-secondary hover:text-[#006b4f]">{compareSlugs.includes(skill.slug) ? c.selected : c.compare}</button>}
                    <Link prefetch={false} href={`/skills/${skill.slug}${locale === 'en' ? '' : '?lang=' + locale}`}
                      onClick={() => trackAnalyticsEvent('directory_skill_open', { skill_slug: skill.slug, mode: props.catalogMode ? 'catalog' : query ? 'search' : 'selected', position: rankOffset + skills.indexOf(skill) + 1 })}
                      aria-label={`${c.details}: ${skill.name}`} className="inline-flex min-h-10 items-center gap-1 text-[#006b4f]">{c.details}<ArrowRight size={14} aria-hidden="true" /></Link>
                  </div>
                </div>
              </article>
            ))}
          </div></SkillEngagementProvider>}
          {(hasPreviousResults || hasMoreResults) && <nav aria-label={c.page} className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm">
            <span className="font-mono text-xs text-secondary">{c.page} {page}</span>
            <div className="flex gap-3">
              {hasPreviousResults && <Link prefetch={false} rel="prev" href={href({ page: page > 2 ? String(page - 1) : undefined })} scroll={false} onNavigate={filterNavigation(href({ page: page > 2 ? String(page - 1) : undefined }))} className="border border-border px-4 py-3">{c.previous}</Link>}
              {hasMoreResults && <Link prefetch={false} rel="next" href={href({ page: String(page + 1) })} scroll={false} onNavigate={filterNavigation(href({ page: String(page + 1) }))} className="bg-foreground px-5 py-3 text-background">{c.next} →</Link>}
            </div>
          </nav>}
        </section>
        </div>

        {!query && directorySections.length > 0 && <section className="mt-16 border-t border-border pt-8" aria-labelledby="directory-collections">
          <h2 id="directory-collections" className="font-display text-3xl">{c.collections}</h2>
          <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {directorySections.map(section => <div key={section.href} className="min-w-0 border-b border-border pb-5">
              <Link href={section.href} prefetch={false} className="font-semibold hover:text-[#006b4f]">{section.title} →</Link>
              <p className="mt-2 text-xs leading-6 text-secondary">{section.description}</p>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-2 text-xs text-[#006b4f]">
                {section.skills.map(skill => <li key={skill.slug}><Link prefetch={false} href={`/skills/${skill.slug}`} className="underline underline-offset-4">{skill.name}</Link></li>)}
              </ul>
            </div>)}
          </div>
        </section>}
        <section className="mt-10 grid gap-8 border-t border-border pt-8 sm:grid-cols-[2fr_1fr]">
          <div><h2 className="font-display text-2xl">{c.guides}</h2><ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {directoryLinks.map(link => <li key={link.href}><Link prefetch={false} href={link.href} className="text-secondary hover:text-[#006b4f]">{link.label} ↗</Link></li>)}
          </ul></div>
          <div><h2 className="font-display text-2xl">{c.developers}</h2><ul className="mt-4 space-y-3 text-sm text-secondary">
            {[['Resolve API','/api/agent/resolve?task=find%20the%20right%20skill&format=text'],['Skills API','/api/agent/skills?format=text'],['llms.txt','/llms.txt']].map(([name,url]) =>
              <li key={url}><Link href={url} prefetch={false} className="hover:text-[#006b4f]">{name} ↗</Link></li>)}
          </ul></div>
        </section>
      </main>
      {compareSlugs.length > 0 && <div className="sticky bottom-0 z-40 border-t border-border bg-background p-4" data-directory-compare>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <span className="text-sm">{c.compare} · {compareSlugs.length}</span>
          <button type="button" onClick={() => writeSelection([])} className="min-h-10 px-2 text-xs text-secondary">{c.clear}</button>
          <Link href={`/compare?skills=${encodeURIComponent(compareSlugs.join(','))}`} className="ml-auto bg-[#006b4f] px-4 py-3 text-sm text-white">{c.compareNow} →</Link>
        </div>
      </div>}
      <SiteFooter />
    </div>
  )
}
