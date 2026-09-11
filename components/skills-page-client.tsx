'use client'

import { NativeSelect } from '@/components/ui/native-select'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSyncExternalStore, useTransition, type ReactNode } from 'react'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'
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

interface Skill {
  id: string
  slug: string
  name: string
  tagline: string
  category: string
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
}



import { GitHubOwnerAvatar } from './github-owner-avatar'
import { useI18n } from '@/lib/i18n/context'
import { directoryCopy, directoryLabel } from '@/lib/i18n/directory-copy'
import { directoryCategories, directoryCategoryOptions, directoryHref } from '@/lib/skills/directory'
import { Search, ArrowRight, SlidersHorizontal, Star, X } from 'lucide-react'

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
  skills: Skill[]
  query?: string
  sort: string
  category: string
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
  externalDiscovery?: ReactNode
}


export function SkillsPageClient(props: Props) {
  const { skills, query, sort, category, categories, useCase, useCases, platform, platformOptions,
    quality, trust, safety, supplyTrack, supplyTracks, minStars, resultCount, page, rankOffset,
    hasPreviousResults, hasMoreResults, degraded, directorySections, directoryLinks } = props
  const { locale } = useI18n()
  const c = directoryCopy(locale)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const storedSelection = useSyncExternalStore(subscribeSelection, readSelection, () => '[]')
  let compareSlugs: string[] = []
  try {
    const stored: unknown = JSON.parse(storedSelection)
    if (Array.isArray(stored)) compareSlugs = [...new Set(stored.filter((v): v is string => typeof v === 'string'))].slice(0, 4)
  } catch { /* Invalid saved data must not break the directory. */ }
  const href = (updates: Record<string, string | undefined>) => directoryHref(pathname, searchParams.toString(), updates)
  const navigate = (updates: Record<string, string | undefined>) => startTransition(() => router.push(href(updates), { scroll: false }))
  const resetHref = directoryHref(pathname, searchParams.toString(), Object.fromEntries(
    ['q','sort','category','useCase','platform','quality','trust','safety','track','minStars','page'].map(key => [key, undefined])
  ))
  const toggleCompare = (slug: string) => writeSelection(compareSlugs.includes(slug) ? compareSlugs.filter(v => v !== slug) : [...compareSlugs, slug].slice(-4))
  const label = (key: string) => directoryLabel(locale, key)
  const primaryCategories = ['coding-agents','design-creative','video-creation','research','presentation','finance']
  const categoryOptions = directoryCategoryOptions([...categories, ...primaryCategories, category === 'all' ? '' : category])
  const selectedCategory = category === 'all' ? 'all' : directoryCategories(category)[0]
  const activeFilters = Object.entries({ category, useCase, platform, quality, trust, safety, track: supplyTrack, minStars: minStars ? String(minStars) : 'all' })
    .filter(([, value]) => value && value !== 'all')
  const sortOptions = [
    ['stars', c.stars], ['quality', query ? c.relevance : c.recommended],
    ['fresh', c.fresh], ['new', c.new], ['trending', c.trending],
    ...(sort === 'downloads' ? [['downloads', c.trending]] : []),
  ]
  const advanced = [
    { key: 'useCase', title: c.useCase, value: useCase, options: useCases.map(v => [v.slug, v.shortTitle]) },
    { key: 'platform', title: c.platform, value: platform, options: [...new Set([...platformOptions, ...(platform !== 'all' ? [platform] : [])])].map(v => [v, v]) },
    { key: 'quality', title: c.quality, value: quality, options: ['excellent','strong','promising'].map(v => [v, label(v)]) },
    { key: 'trust', title: c.trust, value: trust, options: ['production','strong','review','risk'].map(v => [v, label(v)]) },
    { key: 'safety', title: c.safety, value: safety, options: ['verified','reviewed','experimental','blocked'].map(v => [v, label(v)]) },
    { key: 'minStars', title: c.minimum, value: String(minStars || 'all'), options: ['20','100','500','1000','5000'].map(v => [v, v + '+']) },
    { key: 'track', title: c.useCase, value: supplyTrack, options: supplyTracks.map(v => [v.slug, v.shortLabel]) },
  ]
  const stars = (value: number) => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="skills-directory mx-auto max-w-6xl px-4 pb-16 sm:px-6" aria-busy={pending}>
        <header className="border-b border-border pb-7 pt-10 sm:pb-9 sm:pt-14" data-directory-hero>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#006b4f]">OPENAGENTSKILL / DIRECTORY</p>
          <h1 className="mt-4 font-display text-4xl font-normal tracking-tight sm:text-6xl">AI Agent <em className="font-normal text-[#006b4f]">Skills</em></h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-secondary sm:text-base">{c.intro}</p>
          <form role="search" onSubmit={event => {
            event.preventDefault()
            const q = String(new FormData(event.currentTarget).get('q') || '').trim()
            navigate({ q: q || undefined, sort: undefined })
          }} className="mt-6 flex max-w-3xl items-center gap-2 border border-border bg-card p-2 focus-within:border-[#006b4f]">
            <Search size={18} className="ml-2 hidden shrink-0 text-secondary sm:block" aria-hidden="true" />
            <input key={query || ''} type="search" name="q" defaultValue={query} aria-label={c.search}
              placeholder={c.placeholder} className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none" />
            <button type="submit" disabled={pending} className="shrink-0 bg-[#006b4f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#00533d] disabled:opacity-50 sm:px-6">{c.search}</button>
          </form>
        </header>

        <nav aria-label={c.category} className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border py-4 text-sm" data-directory-categories>
          {['all', ...primaryCategories].map(key => (
            <Link key={key} prefetch={false} href={href({ category: key, track: undefined, useCase: undefined })}
              aria-current={selectedCategory === key ? 'page' : undefined}
              className={`border-b-2 py-2 transition-colors ${selectedCategory === key ? 'border-[#006b4f] font-semibold text-[#006b4f]' : 'border-transparent text-secondary hover:text-foreground'}`}>
              {key === 'all' ? c.all : label(key)}
            </Link>
          ))}
        </nav>

        <section aria-labelledby="directory-results-heading" className="pt-5" data-directory-results>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 id="directory-results-heading" className="break-words text-base font-semibold">
                {query ? `${c.results} · “${query}”` : c.all}
              </h2>
              <p className="mt-1 font-mono text-xs text-secondary" data-directory-count>
                {skills.length ? rankOffset + 1 : 0}–{rankOffset + skills.length} / {resultCount.toLocaleString(locale)}
              </p>
            </div>
            <label className="flex min-w-0 max-w-full items-center gap-3 text-xs text-secondary">
              <span className="shrink-0">{c.sort}</span>
              <NativeSelect value={sort} onChange={e => navigate({ sort: e.target.value })} className="w-48 max-w-full bg-transparent text-sm">
                {sortOptions.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
              </NativeSelect>
            </label>
          </div>

          <details className="mt-4 border-b border-border pb-4" data-directory-filters>
            <summary className="flex w-fit cursor-pointer list-none items-center gap-2 text-sm text-secondary hover:text-foreground">
              <SlidersHorizontal size={15} aria-hidden="true" />{c.filters}{activeFilters.length ? ` · ${activeFilters.length}` : ''}
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-2 text-xs text-secondary">{c.category}
                <NativeSelect value={selectedCategory} onChange={e => navigate({ category: e.target.value })} className="w-full bg-transparent text-sm">
                  <option value="all">{c.all}</option>
                  {categoryOptions.map(key => <option key={key} value={key}>{label(key)}</option>)}
                </NativeSelect>
              </label>
              {advanced.map(filter => (
                <label key={filter.key} className="grid gap-2 text-xs text-secondary">{filter.title}
                  <NativeSelect value={filter.value} onChange={e => navigate({ [filter.key]: e.target.value })} className="w-full bg-transparent text-sm">
                    <option value="all">{c.any}</option>
                    {filter.options.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
                  </NativeSelect>
                </label>
              ))}
            </div>
          </details>
          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" aria-label={c.active}>
              {activeFilters.map(([key,value]) => <Link key={key} prefetch={false} href={href({ [key]: undefined })}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-border px-3 py-2" aria-label={`${c.remove}: ${value}`}>
                <span className="break-all">{label(value)}</span><X size={12} className="shrink-0" aria-hidden="true" />
              </Link>)}
              <Link href={resetHref} prefetch={false} className="p-2 text-[#006b4f] underline underline-offset-4">{c.reset}</Link>
            </div>
          )}
          <p className="my-4 max-w-3xl text-xs leading-5 text-secondary">{c.pool}</p>
          <p role="status" className="sr-only">{pending ? c.loading : `${c.results}: ${resultCount}`}</p>
          {degraded && <p role="status" className="mb-5 border-l-2 border-amber-600 bg-amber-50 p-4 text-sm text-amber-950">{c.offline}</p>}

          {skills.length === 0 ? (
            <div className="border-y border-border py-14 text-center">
              <p className="text-secondary">{c.empty}</p>
              <Link href={resetHref} className="mt-5 inline-block text-[#006b4f] underline">{c.reset}</Link>
            </div>
          ) : <div className="border-t border-border" data-skill-list>
            {skills.map(skill => (
              <article key={skill.id} className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-x-4 border-b border-border py-6 sm:grid-cols-[48px_minmax(0,1fr)_150px] sm:gap-x-5 sm:py-7" data-directory-skill>
                <div className="pt-1"><GitHubOwnerAvatar owner={skill.author.owner} label={skill.author.name} size="md" /></div>
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-semibold leading-snug [overflow-wrap:anywhere] sm:text-xl">
                    <Link prefetch={false} href={`/skills/${skill.slug}${locale === 'en' ? '' : '?lang=' + locale}`} className="hover:text-[#006b4f]">{skill.name}</Link>
                  </h3>
                  <p className="mt-1 truncate font-mono text-[11px] text-secondary">{skill.author.owner || skill.author.name}</p>
                  <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-secondary">{skill.tagline}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-secondary">
                    <Link href={href({ category: directoryCategories(skill.category)[0] })} prefetch={false} className="underline decoration-border underline-offset-4">{directoryCategories(skill.category).map(label).join(' · ')}</Link>
                    {[...new Set(skill.platformHints || skill.compatibility.map(v => v.platform))].slice(0, 2).map(value => <span key={value}>{value}</span>)}
                    <span className={skill.safetyProfile?.blocked ? 'text-red-700' : ''}>{skill.snapshot ? c.snapshot : skill.safetyProfile?.blocked ? c.blocked : label(skill.sourceStatus || 'unverified')}</span>
                  </div>
                </div>
                <div className="col-start-2 mt-4 flex flex-wrap items-center justify-between gap-4 sm:col-start-3 sm:row-start-1 sm:mt-0 sm:flex-col sm:items-end sm:justify-start sm:gap-5">
                  <span title={c.repoStars} className="inline-flex items-center gap-1.5 font-mono text-sm"><Star size={14} aria-hidden="true" />{stars(skill.stats.stars)}<span className="text-[10px] text-secondary">GitHub</span></span>
                  <div className="flex items-center gap-4 text-xs">
                    <button type="button" aria-pressed={compareSlugs.includes(skill.slug)} onClick={() => toggleCompare(skill.slug)}
                      className="min-h-10 text-secondary hover:text-[#006b4f]">{compareSlugs.includes(skill.slug) ? c.selected : c.compare}</button>
                    <Link prefetch={false} href={`/skills/${skill.slug}${locale === 'en' ? '' : '?lang=' + locale}`}
                      aria-label={`${c.details}: ${skill.name}`} className="inline-flex min-h-10 items-center gap-1 text-[#006b4f]">{c.details}<ArrowRight size={14} aria-hidden="true" /></Link>
                  </div>
                </div>
              </article>
            ))}
          </div>}
          {(hasPreviousResults || hasMoreResults) && <nav aria-label={c.page} className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm">
            <span className="font-mono text-xs text-secondary">{c.page} {page}</span>
            <div className="flex gap-3">
              {hasPreviousResults && <Link prefetch={false} rel="prev" href={href({ page: page > 2 ? String(page - 1) : undefined })} className="border border-border px-4 py-3">{c.previous}</Link>}
              {hasMoreResults && <Link prefetch={false} rel="next" href={href({ page: String(page + 1) })} className="bg-foreground px-5 py-3 text-background">{c.next} →</Link>}
            </div>
          </nav>}
        </section>

        {props.externalDiscovery}
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
