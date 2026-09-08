'use client'

import { galleryCopy } from '@/lib/i18n/gallery-copy'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ShowcaseCard } from '@/components/showcase-card'
import { useI18n } from '@/lib/i18n/context'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { FEATURED_SHOWCASE_SLUGS, getShowcaseCase, getShowcaseSkill, getShowcasesForSkill } from '@/lib/showcase'

export function HomeShowcase() {
  const { locale } = useI18n()
  return (
    <section className="border-b border-[#e4e0d8] bg-[#fbfaf6] px-6 py-14 md:py-20" aria-labelledby="home-showcase-title">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#006b4f]">{galleryCopy(locale, "Made with skills", "用技能做出来的作品")}</p>
            <h2 id="home-showcase-title" className="mt-3 font-display text-3xl font-normal tracking-tight md:text-5xl">{galleryCopy(locale, "Your next project starts here.", "你的下一个作品，从这里开始。")}</h2>
            <p className="mt-4 text-sm leading-relaxed text-[#6d675e]">{galleryCopy(locale, "See the result. Copy a task. Make it yours with the skill behind it.", "看效果，复制任务，用背后的技能制作自己的版本。")}</p>
          </div>
          <Link href={getLocalizedNavigationHref('/showcase', locale)} className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-[#006b4f]">{galleryCopy(locale, "Explore the gallery", "查看 Skill Gallery")}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <div className="mt-8 grid gap-7 sm:grid-cols-3">{FEATURED_SHOWCASE_SLUGS.map((slug) => <ShowcaseCard key={slug} item={getShowcaseCase(slug)!} placement="home" />)}</div>
      </div>
    </section>
  )
}

export function SkillShowcase({ skillSlug }: { skillSlug: string }) {
  const { locale } = useI18n()
  const cases = getShowcasesForSkill(skillSlug)
  if (!cases.length) return null
  return (
    <section id="showcase" className="mb-10 scroll-mt-24 rounded-lg border border-[#e4e0d8] bg-[#fbfaf6] p-5 sm:p-6" aria-labelledby="skill-showcase-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#006b4f]">{galleryCopy(locale, "See what it makes", "先看效果")}</p>
          <h2 id="skill-showcase-title" className="mt-2 font-display text-2xl font-normal">{galleryCopy(locale, "Examples you can start from", "作品与可复制任务")}</h2>
        </div>
        <Link href={getLocalizedNavigationHref(`/showcase?q=${encodeURIComponent(getShowcaseSkill(skillSlug).name)}`, locale)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#006b4f]">{galleryCopy(locale, "View all", "查看全部")}<ArrowRight className="h-3 w-3" aria-hidden="true" /></Link>
      </div>
      <div className={`mt-6 grid gap-6 ${cases.length > 1 ? 'sm:grid-cols-2' : 'max-w-md'}`}>{cases.slice(0, 2).map((item) => <ShowcaseCard key={item.slug} item={item} placement="skill" />)}</div>
    </section>
  )
}
