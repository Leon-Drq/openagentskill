'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Search, X } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ShowcaseCard } from '@/components/showcase-card'
import { useI18n } from '@/lib/i18n/context'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { filterShowcaseCases, getShowcaseCreator, localizeShowcase, SHOWCASE_CASES, SHOWCASE_CATEGORIES, SHOWCASE_SKILLS } from '@/lib/showcase'

export function ShowcaseGallery() {
  const { locale } = useI18n()
  const zh = locale === 'zh'
  const router = useRouter()
  const params = useSearchParams()
  const rawCategory = params.get('category') || 'all'
  const category = SHOWCASE_CATEGORIES.some((entry) => entry.id === rawCategory) ? rawCategory : 'all'
  const query = params.get('q') || ''
  const rawCreator = params.get('creator') || ''
  const creatorId = SHOWCASE_SKILLS.some((skill) => skill.creatorId === rawCreator) ? rawCreator : ''
  const viewed = useRef(false)
  const cases = filterShowcaseCases(category, query, creatorId)
  const workflowCount = new Set(SHOWCASE_CASES.map((item) => item.skillSlug)).size

  useEffect(() => {
    if (viewed.current) return
    viewed.current = true
    trackAnalyticsEvent('showcase_view', { placement: 'gallery' })
  }, [])

  function filter(nextCategory: string, nextQuery: string, nextCreator = creatorId) {
    const next = new URLSearchParams(params.toString())
    if (nextCategory === 'all') next.delete('category')
    else next.set('category', nextCategory)
    if (nextQuery.trim()) next.set('q', nextQuery.trim())
    else next.delete('q')
    if (nextCreator) next.set('creator', nextCreator)
    else next.delete('creator')
    router.push(`/showcase${next.size ? `?${next}` : ''}`, { scroll: false })
    trackAnalyticsEvent('showcase_filter', { category: nextCategory, has_query: Boolean(nextQuery.trim()), creator_id: nextCreator || undefined })
  }

  return (
    <div className="min-h-screen bg-[#fbfaf6] text-[#1d1b18]">
      <SiteHeader />
      <main>
        <section className="border-b border-[#e4e0d8]">
          <div className="mx-auto max-w-6xl px-6 pb-10 pt-12 md:pb-12 md:pt-16">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#006b4f]">{zh ? '精选技能作品' : 'Made with skills'}</p>
            <div className="mt-4 grid gap-5 md:grid-cols-[1.2fr_1fr] md:items-end md:gap-10">
              <h1 className="whitespace-nowrap font-display text-[42px] font-normal leading-[1.1] tracking-tight sm:text-6xl xl:text-7xl">
                Skill <em className="font-normal text-[#006b4f]">Gallery</em>
              </h1>
              <div className="pb-1">
                <p className="max-w-md text-sm leading-relaxed text-[#6d675e]">{zh ? '发现作品，认识作者，用 Skill 开始创作。' : 'Discover the work, meet its creators, and make something of your own.'}</p>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-[#6d675e]">{zh ? `${SHOWCASE_CASES.length} 个精选案例 · ${workflowCount} 个技能与工作流` : `${SHOWCASE_CASES.length} selected examples · ${workflowCount} skills & workflows`}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20 pt-8" aria-label={zh ? '浏览作品' : 'Browse examples'}>
          <h2 className="sr-only">{zh ? '浏览作品' : 'Browse examples'}</h2>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2" aria-label={zh ? '作品类型' : 'Example categories'}>
              {[{ id: 'all', label: { en: 'All work', zh: '全部作品' } }, ...SHOWCASE_CATEGORIES].map((entry) => {
                const count = entry.id === 'all' ? SHOWCASE_CASES.length : SHOWCASE_CASES.filter((item) => item.category === entry.id).length
                return <button key={entry.id} type="button" aria-pressed={category === entry.id} onClick={() => filter(entry.id, query)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm transition-colors ${category === entry.id ? 'border-[#1d1b18] bg-[#1d1b18] text-[#fbfaf6]' : 'border-[#e4e0d8] bg-transparent text-[#6d675e] hover:border-[#6d675e]'}`}>
                  {localizeShowcase(entry.label, locale)}<span className="font-mono text-[10px] opacity-70">{count}</span>
                </button>
              })}
            </div>
            <form key={query} role="search" onSubmit={(event) => { event.preventDefault(); filter(category, String(new FormData(event.currentTarget).get('q') || '')) }} className="flex min-w-0 items-center gap-2 border-b border-[#bdb7ac] focus-within:border-[#006b4f] lg:w-60">
              <Search className="h-4 w-4 shrink-0 text-[#6d675e]" aria-hidden="true" />
              <input name="q" type="search" defaultValue={query} aria-label={zh ? '搜索作品或技能' : 'Search examples or skills'} placeholder={zh ? '搜索作品或技能…' : 'Search work or skills…'} className="min-h-11 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-[#6d675e] sm:text-sm" />
              <button type="submit" aria-label={zh ? '搜索' : 'Search'} className="flex h-11 w-11 shrink-0 items-center justify-center text-[#006b4f]"><ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
            </form>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p aria-live="polite" role="status" className="text-xs text-[#6d675e]">{zh ? `展示 ${cases.length} 个案例${query ? `，搜索“${query}”` : ''}` : `${cases.length} ${cases.length === 1 ? 'example' : 'examples'}${query ? ` for “${query}”` : ''}`}</p>
              {(query || category !== 'all' || creatorId) && <button type="button" onClick={() => filter('all', '', '')} className="inline-flex min-h-11 items-center gap-1 text-xs text-[#006b4f]"><X className="h-3 w-3" aria-hidden="true" />{zh ? '清除筛选' : 'Clear filters'}</button>}
            </div>
            <select value={creatorId} onChange={(event) => filter(category, query, event.target.value)} aria-label={zh ? '按技能作者筛选' : 'Filter by skill creator'} className="min-h-11 max-w-full rounded-md border border-[#e4e0d8] bg-transparent px-3 text-base text-[#6d675e] focus-visible:outline-[#006b4f] sm:text-xs">
              <option value="">{zh ? '全部技能作者' : 'All skill creators'}</option>
              {[...new Set(SHOWCASE_SKILLS.map((skill) => skill.creatorId))].map((id) => <option key={id} value={id}>{getShowcaseCreator(id).name}</option>)}
            </select>
          </div>
          {cases.length ? <div className="mt-5 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{cases.map((item, index) => <ShowcaseCard key={item.slug} item={item} priority={index < 3} />)}</div> : <div className="py-24 text-center">
            <h2 className="font-display text-3xl">{zh ? '还没有匹配的作品' : 'No examples just yet.'}</h2>
            <p className="mt-3 text-sm text-[#6d675e]">{zh ? '试试其他关键词，或清除筛选查看全部作品。' : 'Try a different search, or clear the filters to see all work.'}</p>
            <button type="button" onClick={() => filter('all', '', '')} className="mt-6 rounded-md bg-[#006b4f] px-5 py-3 text-sm font-semibold text-white">{zh ? '查看全部作品' : 'See all work'}</button>
          </div>}
          <div className="mt-16 flex flex-col gap-4 border-t border-[#e4e0d8] pt-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-relaxed text-[#6d675e]">{zh ? '从作者公开案例与本站实际制作中精选。每个案例都注明来源、使用条件，以及提示词是否为原文。' : 'Selected from author-published work and examples made here. Every case names its source, requirements and whether the prompt is original.'}</p>
            <Link href={getLocalizedNavigationHref('/skills', locale)} className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#006b4f]">{zh ? '浏览全部技能' : 'Explore the skill registry'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
