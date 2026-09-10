import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { GitHubOwnerAvatar } from './github-owner-avatar'
import { EditorialLink } from './editorial-link'
import { galleryCopy } from '@/lib/i18n/gallery-copy'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import type { Locale } from '@/lib/i18n/config'
import { FEATURED_SHOWCASE_SLUGS, SHOWCASE_CATEGORIES, getShowcaseCase, getShowcaseSkill, getShowcaseCreator, getShowcaseCreatorHref, getShowcaseImageSrc, getShowcaseEvidenceLabel, getShowcaseAccessLabel, getShowcaseTags, localizeShowcase } from '@/lib/showcase'

export function HomeShowcaseStatic({ locale }: { locale: Locale }) {
  const href = (path: string) => getLocalizedNavigationHref(path, locale)
  const t = (en: Parameters<typeof galleryCopy>[1], zh: string) => galleryCopy(locale, en, zh)
  return <section className="border-b border-[#e4e0d8] bg-[#fbfaf6] px-6 py-14 md:py-20" aria-labelledby="home-showcase-title">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#006b4f]">{t('Made with skills', '用技能做出来的作品')}</p>
          <h2 id="home-showcase-title" className="mt-3 font-display text-3xl font-normal tracking-tight md:text-5xl">{t('Your next project starts here.', '你的下一个作品，从这里开始。')}</h2>
          <p className="mt-4 text-sm leading-relaxed text-[#6d675e]">{t('See the result. Copy a task. Make it yours with the skill behind it.', '看效果，复制任务，用背后的技能制作自己的版本。')}</p></div>
        <Link href={href('/showcase')} className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-[#006b4f]">{t('Explore the gallery', '查看 Skill Gallery')}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      <div className="mt-8 grid gap-7 sm:grid-cols-3">{FEATURED_SHOWCASE_SLUGS.map(slug => {
        const item = getShowcaseCase(slug)!
        const skill = getShowcaseSkill(item.skillSlug)
        const creator = getShowcaseCreator(skill.creatorId)
        const creatorPath = getShowcaseCreatorHref(creator)
        const category = SHOWCASE_CATEGORIES.find(entry => entry.id === item.category)!
        return <article key={slug} className="group min-w-0">
          <EditorialLink eventName="showcase_open" eventData={{ case_slug: slug, skill_slug: item.skillSlug, placement: 'home' }} href={href(`/showcase/${slug}`)} prefetch={false} className="block rounded-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#006b4f]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-[#e4e0d8] bg-[#eeece5] transition-colors group-hover:border-[#006b4f]/50">
              <Image src={getShowcaseImageSrc(item.media[0].src, 'card')} alt={localizeShowcase(item.media[0].alt, locale)} fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 380px" className={`${item.cardFit === 'contain' ? 'object-contain p-4' : 'object-cover object-top'} motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.025]`} />
              <span className="absolute left-3 top-3 rounded bg-[#fbfaf6]/95 px-2 py-1 font-mono text-[10px] text-[#1d1b18] shadow-sm">{localizeShowcase(category.label, locale)}</span>
            </div>
            <div className="pt-4"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#6d675e]"><span className="truncate">{skill.name}</span><span>/</span><span>{getShowcaseEvidenceLabel(item, locale)}</span></div>
              <div className="mt-2 flex items-start justify-between gap-3"><h3 className="text-base font-semibold leading-snug tracking-tight text-[#1d1b18] group-hover:text-[#006b4f]">{localizeShowcase(item.title, locale)}</h3><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[#6d675e]" /></div>
              <p className="mt-2 line-clamp-2 min-h-[2.875rem] text-sm leading-relaxed text-[#6d675e]">{localizeShowcase(item.description, locale)}</p></div>
          </EditorialLink>
          {getShowcaseTags(item).map(tag => <Link key={tag.id} prefetch={false} href={href(`/showcase?tag=${tag.id}`)} className="mt-3 inline-flex min-h-9 items-center rounded-full border border-[#e4e0d8] px-3 text-xs text-[#006b4f]">{localizeShowcase(tag.label, locale)}</Link>)}
          <div className="mt-4 flex min-w-0 items-center justify-between gap-3 border-t border-[#e4e0d8] pt-3">
            <EditorialLink eventName="showcase_creator_open" eventData={{ creator_id: creator.id, role: t('Skill by', '技能作者') }} href={creatorPath.startsWith('/') ? href(creatorPath) : creatorPath} target={creatorPath.startsWith('/') ? undefined : '_blank'} rel={creatorPath.startsWith('/') ? undefined : 'noopener noreferrer'} className="inline-flex min-h-11 min-w-0 items-center gap-2.5 hover:text-[#006b4f]">
              <GitHubOwnerAvatar owner={creator.githubUsername} size="sm" linked={false} /><span><span className="block text-[10px] text-[#6d675e]">{t('Skill by', '技能作者')}</span><span className="text-xs font-medium">{creator.name} ↗</span></span>
            </EditorialLink>
            <Link href={href(`/skills/${item.skillSlug}`)} className="shrink-0 rounded border border-[#e4e0d8] px-2 py-1 text-[10px] text-[#6d675e]" title={`${skill.name} · ${skill.sourceLicense}`}>{getShowcaseAccessLabel(skill, locale)}</Link>
          </div>
        </article>
      })}</div>
    </div>
  </section>
}
