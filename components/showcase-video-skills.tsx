'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { SHOWCASE_VIDEO_SKILLS } from '@/lib/showcase-video-skills'
import { localizeShowcase } from '@/lib/showcase'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import type { Locale } from '@/lib/i18n/config'

export function ShowcaseVideoSkills({ locale }: { locale: Locale }) {
  const zh = locale === 'zh'
  const sectionRef = useRef<HTMLElement>(null)
  useEffect(() => {
    // The target is mounted after the query transition, so native hash scrolling
    // can run before it exists. Also covers a shared URL opened directly.
    if (window.location.hash === '#video-skills') sectionRef.current?.scrollIntoView({ block: 'start' })
  }, [])
  return <section ref={sectionRef} id="video-skills" aria-labelledby="video-skills-heading" className="mt-12 scroll-mt-24 border-t border-[#e4e0d8] pt-8">
    <p className="font-mono text-[10px] uppercase tracking-widest text-[#006b4f]">{zh ? '技能精选 · 非作品案例' : 'Skill selection · separate from examples'}</p>
    <h2 id="video-skills-heading" className="mt-3 font-display text-3xl">{zh ? 'AI 产品视频与剪辑' : 'AI product video & editing'}</h2>
    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#6d675e]">{zh ? '按任务选择工具。以下是技能目录入口，不计入作品数量，也不代表本站运行验证；安装前请查看详情页的当前审核状态与使用条件。' : 'Choose by task. These registry links are not extra Gallery examples or runtime verification. Read the detail page for current review status and requirements before installing.'}</p>
    <ul className="mt-6 divide-y divide-[#e4e0d8]">
      {SHOWCASE_VIDEO_SKILLS.map((skill) => <li key={skill.slug} className="grid gap-2 py-5 first:pt-0 sm:grid-cols-[1fr_2fr] sm:gap-8">
        <div><Link prefetch={false} href={getLocalizedNavigationHref(`/skills/${skill.slug}`, locale)} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#006b4f] underline-offset-4 hover:underline">{skill.name} <span aria-hidden="true" className="ml-2">→</span></Link></div>
        <div>
          <p className="text-sm leading-relaxed">{localizeShowcase(skill.purpose, locale)}</p>
          <p className="mt-2 text-xs leading-relaxed text-[#6d675e]">{localizeShowcase(skill.requirements, locale)}</p>
          <a href={skill.source} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center text-xs text-[#6d675e] underline underline-offset-4">{zh ? '查看来源版本' : 'View inspected source'}</a>
        </div>
      </li>)}
    </ul>
  </section>
}
