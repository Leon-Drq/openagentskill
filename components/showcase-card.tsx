'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ShowcaseVideoPlayer } from '@/components/showcase-video-player'
import { useI18n } from '@/lib/i18n/context'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { ShowcaseCreatorCredit } from '@/components/showcase-creator'
import { ShowcaseActions } from '@/components/showcase-engagement'
import { getShowcaseAccessLabel, getShowcaseEvidenceLabel, getShowcaseImageSrc, getShowcaseSkill, getShowcaseTags, localizeShowcase, SHOWCASE_CATEGORIES, type ShowcaseCase } from '@/lib/showcase'

export function ShowcaseCard({ item, placement = 'gallery', priority = false }: {
  item: ShowcaseCase
  placement?: 'gallery' | 'home' | 'skill' | 'related'
  priority?: boolean
}) {
  const { locale } = useI18n()
  const media = item.media[0]
  const skill = getShowcaseSkill(item.skillSlug)
  const title = localizeShowcase(item.title, locale)
  const category = SHOWCASE_CATEGORIES.find((entry) => entry.id === item.category)!

  return (
    <article className="group min-w-0">
      {item.videoUrl && <div className="relative overflow-hidden rounded-lg border border-[#e4e0d8]">
        <ShowcaseVideoPlayer item={item} locale={locale} compact priority={priority} />
        <span className="pointer-events-none absolute left-3 top-3 rounded bg-[#fbfaf6]/95 px-2 py-1 font-mono text-[10px] text-[#1d1b18] shadow-sm">{localizeShowcase(category.label, locale)}</span>
      </div>}
      <Link
        href={getLocalizedNavigationHref(`/showcase/${item.slug}`, locale)}
        prefetch={false}
        onClick={() => trackAnalyticsEvent('showcase_open', { case_slug: item.slug, skill_slug: item.skillSlug, placement })}
        className="block rounded-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#006b4f]"
      >
        {!item.videoUrl && <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-[#e4e0d8] bg-[#eeece5] transition-colors group-hover:border-[#006b4f]/50">
          <Image
            src={getShowcaseImageSrc(media.src, 'card')} alt={localizeShowcase(media.alt, locale)} fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 380px"
            preload={priority}
            className={`${item.cardFit === 'contain' ? 'object-contain p-4' : 'object-cover object-top'} motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.025]`}
          />
          <span className="absolute left-3 top-3 rounded bg-[#fbfaf6]/95 px-2 py-1 font-mono text-[10px] text-[#1d1b18] shadow-sm">
            {localizeShowcase(category.label, locale)}
          </span>
        </div>}
        <div className="pt-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#6d675e]">
            <span className="truncate">{skill.name}</span><span aria-hidden="true">/</span>
            <span className="shrink-0">{getShowcaseEvidenceLabel(item, locale)}</span>
          </div>
          <div className="mt-2 flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold leading-snug tracking-tight text-[#1d1b18] group-hover:text-[#006b4f]">{title}</h3>
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[#6d675e] group-hover:text-[#006b4f]" aria-hidden="true" />
          </div>
          <p className="mt-2 line-clamp-2 min-h-[2.875rem] text-sm leading-relaxed text-[#6d675e]">{localizeShowcase(item.description, locale)}</p>
        </div>
      </Link>
      {getShowcaseTags(item).map((tag) => <Link key={tag.id} prefetch={false} href={`/showcase?tag=${tag.id}${locale === 'zh' ? '&lang=zh' : ''}`} className="mt-3 inline-flex min-h-9 items-center rounded-full border border-[#e4e0d8] px-3 text-xs text-[#006b4f] hover:border-[#006b4f]">{localizeShowcase(tag.label, locale)}</Link>)}
      <div className="mt-4 flex min-w-0 items-center justify-between gap-3 border-t border-[#e4e0d8] pt-3">
        <ShowcaseCreatorCredit creatorId={skill.creatorId} label={locale === 'zh' ? '技能作者' : 'Skill by'} />
        <Link href={getLocalizedNavigationHref(`/skills/${item.skillSlug}`, locale)} className="shrink-0 rounded border border-[#e4e0d8] px-2 py-1 text-[10px] text-[#6d675e] hover:border-[#006b4f] hover:text-[#006b4f]" title={`${skill.name} · ${skill.sourceLicense}`}>
          {getShowcaseAccessLabel(skill, locale)}
        </Link>
      </div>
      {(placement === 'gallery' || placement === 'related') && <ShowcaseActions item={item} />}
    </article>
  )
}
