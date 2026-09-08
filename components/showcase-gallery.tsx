'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Search, X } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ShowcaseCard } from '@/components/showcase-card'
import { ShowcaseVideoSkills } from '@/components/showcase-video-skills'
import { ShowcaseEngagementProvider, useShowcaseEngagement } from '@/components/showcase-engagement'
import { sortShowcaseCases, type ShowcaseSort } from '@/lib/showcase-engagement'
import { useI18n } from '@/lib/i18n/context'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { filterShowcaseCases, getShowcaseCreator, getShowcasePage, localizeShowcase, SHOWCASE_CASES, SHOWCASE_CATEGORIES, SHOWCASE_SKILLS, SHOWCASE_TAGS } from '@/lib/showcase'

export function ShowcaseGallery() {
  return <ShowcaseEngagementProvider><GalleryContent /></ShowcaseEngagementProvider>
}

function GalleryContent() {
  const { locale } = useI18n()
  const zh = locale === 'zh'
  const router = useRouter()
  const params = useSearchParams()
  const rawCategory = params.get('category') || 'all'
  const category = SHOWCASE_CATEGORIES.some((entry) => entry.id === rawCategory) ? rawCategory : 'all'
  const query = params.get('q') || ''
  const tagId = SHOWCASE_TAGS.find((tag) => tag.id === params.get('tag'))?.id || ''
  const rawCreator = params.get('creator') || ''
  const creatorId = SHOWCASE_SKILLS.some((skill) => skill.creatorId === rawCreator) ? rawCreator : ''
  const viewed = useRef(false)
  const { stats, ready, failed, refresh } = useShowcaseEngagement()
  const sort: ShowcaseSort = params.get('sort') === 'top' ? 'top' : 'curated'
  const cases = sortShowcaseCases(filterShowcaseCases(category, query, creatorId, tagId), ready ? sort : 'curated', stats)
  const pagination = getShowcasePage(cases, params.get('page'))
  const workflowCount = new Set(SHOWCASE_CASES.map((item) => item.skillSlug)).size

  useEffect(() => {
    if (viewed.current) return
    viewed.current = true
    trackAnalyticsEvent('showcase_view', { placement: 'gallery' })
  }, [])

  function filter(nextCategory: string, nextQuery: string, nextCreator = creatorId, nextSort = sort, nextTag = tagId) {
    const next = new URLSearchParams(params.toString())
    next.delete('page')
    if (nextTag) next.set('tag', nextTag)
    else next.delete('tag')
    if (nextCategory === 'all') next.delete('category')
    else next.set('category', nextCategory)
    if (nextQuery.trim()) next.set('q', nextQuery.trim())
    else next.delete('q')
    if (nextCreator) next.set('creator', nextCreator)
    else next.delete('creator')
    if (nextSort === 'curated') next.delete('sort')
    else next.set('sort', nextSort)
    router.push(`/showcase${next.size ? `?${next}` : ''}`, { scroll: false })
    trackAnalyticsEvent('showcase_filter', { category: nextCategory, has_query: Boolean(nextQuery.trim()), creator_id: nextCreator || undefined, sort: nextSort, tag: nextTag || undefined })
  }

  function pageHref(page: number) {
    const next = new URLSearchParams(params.toString())
    if (page === 1) next.delete('page')
    else next.set('page', String(page))
    return `/showcase${next.size ? `?${next}` : ''}`
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
          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label={zh ? '用途标签' : 'Use-case tags'}>
            <span className="mr-1 text-xs text-[#6d675e]">{zh ? '用途' : 'Use case'}</span>
            {SHOWCASE_TAGS.map((tag) => <button key={tag.id} type="button" aria-pressed={tagId === tag.id} onClick={() => filter(category, query, creatorId, sort, tagId === tag.id ? '' : tag.id)} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-xs ${tagId === tag.id ? 'border-[#006b4f] bg-[#edf3ee] text-[#006b4f]' : 'border-[#e4e0d8] text-[#6d675e] hover:border-[#006b4f]'}`}>
              {localizeShowcase(tag.label, locale)}<span className="font-mono text-[10px]">{filterShowcaseCases(category, query, creatorId, tag.id).length}</span>
            </button>)}
            <Link prefetch={false} href={`/showcase?category=video${zh ? '&lang=zh' : ''}#video-skills`} className="inline-flex min-h-11 items-center gap-2 px-2 text-xs text-[#006b4f] underline-offset-4 hover:underline">{zh ? 'AI 产品视频与剪辑技能' : 'AI product video & editing skills'}<ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p aria-live="polite" role="status" className="text-xs text-[#6d675e]">{zh ? `${cases.length} 个案例${cases.length ? ` · 当前 ${pagination.offset + 1}–${pagination.offset + pagination.items.length}` : ''}${query ? `，搜索“${query}”` : ''}` : `${cases.length} ${cases.length === 1 ? 'example' : 'examples'}${cases.length ? ` · Showing ${pagination.offset + 1}–${pagination.offset + pagination.items.length}` : ''}${query ? ` for “${query}”` : ''}`}</p>
              {(query || category !== 'all' || creatorId || tagId) && <button type="button" onClick={() => filter('all', '', '', sort, '')} className="inline-flex min-h-11 items-center gap-1 text-xs text-[#006b4f]"><X className="h-3 w-3" aria-hidden="true" />{zh ? '清除筛选' : 'Clear filters'}</button>}
            </div>
            <div className="flex max-w-full flex-wrap gap-2">
            <select value={creatorId} onChange={(event) => filter(category, query, event.target.value)} aria-label={zh ? '按技能作者筛选' : 'Filter by skill creator'} className="min-h-11 max-w-full rounded-md border border-[#e4e0d8] bg-transparent px-3 text-base text-[#6d675e] focus-visible:outline-[#006b4f] sm:text-xs">
              <option value="">{zh ? '全部技能作者' : 'All skill creators'}</option>
              {[...new Set(SHOWCASE_SKILLS.map((skill) => skill.creatorId))].map((id) => <option key={id} value={id}>{getShowcaseCreator(id).name}</option>)}
            </select>
            <select value={sort} onChange={(event) => filter(category, query, creatorId, event.target.value as ShowcaseSort)} aria-label={zh ? '作品排序' : 'Sort examples'} className="min-h-11 max-w-full rounded-md border border-[#e4e0d8] bg-transparent px-3 text-base text-[#6d675e] focus-visible:outline-[#006b4f] sm:text-xs">
              <option value="curated">{zh ? '精选推荐' : 'Curated'}</option>
              <option value="top">{zh ? '社区好评' : 'Top rated'}</option>
            </select>
            </div>
          </div>
          {sort === 'top' && <p role="status" className="mt-3 text-xs text-[#6d675e]">{failed ? (zh ? '投票数据暂时不可用，当前按精选顺序展示。' : 'Votes are unavailable. Showing curated order.') : !ready ? (zh ? '正在加载投票排行…' : 'Loading votes…') : (zh ? '按净赞数（赞 − 踩）排序，同分保留精选顺序。' : 'Ranked by likes minus dislikes. Ties keep the curated order.')} {failed && <button type="button" onClick={() => void refresh()} className="min-h-11 text-[#006b4f] underline">{zh ? '重试' : 'Retry'}</button>}</p>}
          {cases.length ? <div className="mt-5 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{pagination.items.map((item, index) => <ShowcaseCard key={item.slug} item={item} priority={index < 3} />)}</div> : <div className="py-24 text-center">
            <h2 className="font-display text-3xl">{zh ? '还没有匹配的作品' : 'No examples just yet.'}</h2>
            <p className="mt-3 text-sm text-[#6d675e]">{zh ? '试试其他关键词，或清除筛选查看全部作品。' : 'Try a different search, or clear the filters to see all work.'}</p>
            <button type="button" onClick={() => filter('all', '', '', sort, '')} className="mt-6 rounded-md bg-[#006b4f] px-5 py-3 text-sm font-semibold text-white">{zh ? '查看全部作品' : 'See all work'}</button>
          </div>}
          {pagination.pageCount > 1 && <nav aria-label={zh ? '作品分页' : 'Gallery pagination'} className="mt-12 flex flex-wrap items-center justify-center gap-2">
            {pagination.page > 1 && <Link prefetch={false} href={pageHref(pagination.page - 1)} className="inline-flex min-h-11 items-center rounded-md border border-[#e4e0d8] px-4 text-sm">{zh ? '上一页' : 'Previous'}</Link>}
            {Array.from({ length: pagination.pageCount }, (_, index) => index + 1).map((page) => <Link key={page} prefetch={false} href={pageHref(page)} aria-current={page === pagination.page ? 'page' : undefined} aria-label={zh ? `第 ${page} 页` : `Page ${page}`} className={`inline-flex h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm ${page === pagination.page ? 'border-[#006b4f] bg-[#006b4f] text-white' : 'border-[#e4e0d8] text-[#6d675e] hover:border-[#006b4f]'}`}>{page}</Link>)}
            {pagination.page < pagination.pageCount && <Link prefetch={false} href={pageHref(pagination.page + 1)} className="inline-flex min-h-11 items-center rounded-md border border-[#e4e0d8] px-4 text-sm">{zh ? '下一页' : 'Next'}</Link>}
          </nav>}
          {category === 'video' && !tagId && !query && !creatorId && <ShowcaseVideoSkills locale={locale} />}
          <div className="mt-16 flex flex-col gap-4 border-t border-[#e4e0d8] pt-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-relaxed text-[#6d675e]">{zh ? '精选作者作品、可复用模板与风格示例，分别标注，另有本站实际制作。每项注明来源、使用条件和提示词性质；作者预览不代表本站复测成功，同一作品的多张截图仅计一项。' : 'Curated work, reusable templates and style studies are labeled separately, alongside work made here. Each names its source, requirements and prompt status. Author previews are not platform retests; multiple views of one work count once.'}</p>
            <Link href={getLocalizedNavigationHref('/skills', locale)} className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#006b4f]">{zh ? '浏览全部技能' : 'Explore the skill registry'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
