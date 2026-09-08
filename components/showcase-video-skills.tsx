'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { SHOWCASE_VIDEO_SKILLS } from '@/lib/showcase-video-skills'
import { localizeShowcase } from '@/lib/showcase'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import type { Locale } from '@/lib/i18n/config'

export function ShowcaseVideoSkills({ locale }: { locale: Locale }) {
  const zh = locale === 'zh'
  const sectionRef = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    // The target is mounted after the query transition, so native hash scrolling
    // can run before it exists. Also covers a shared URL opened directly.
    if (window.location.hash === '#video-skills' && sectionRef.current) {
      sectionRef.current.open = true
      sectionRef.current.scrollIntoView({ block: 'start' })
    }
  }, [])
  return <details ref={sectionRef} id="video-skills" className="mt-12 scroll-mt-24 rounded-lg border border-[#e4e0d8] p-5 sm:p-6">
    <summary className="min-h-11 cursor-pointer text-sm font-semibold text-[#006b4f]">{zh ? '相关视频技能 · 5 个工具' : 'Related video skills · 5 tools'}</summary>
    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#6d675e]">{zh ? '想制作产品演示或剪辑视频？查看以下技能的使用条件。它们是工具推荐，不是上方案例的作者归属，也不代表本站实测；没有对应成片的技能不计入作品数量。' : 'Making a product demo or editing footage? Explore these tools and their requirements. Recommendations do not imply authorship of the examples above or platform testing; skills without a showcased output are not counted as examples.'}</p>
    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {SHOWCASE_VIDEO_SKILLS.map((skill) => <li key={skill.slug} className="min-w-0 rounded-lg border border-[#e4e0d8] bg-white/50 p-4">
        <div><Link prefetch={false} href={getLocalizedNavigationHref(`/skills/${skill.slug}`, locale)} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#006b4f] underline-offset-4 hover:underline">{skill.name} <span aria-hidden="true" className="ml-2">→</span></Link></div>
        <div>
          <p className="text-sm leading-relaxed">{localizeShowcase(skill.purpose, locale)}</p>
          <p className="mt-2 text-xs leading-relaxed text-[#6d675e]">{localizeShowcase(skill.requirements, locale)}</p>
          <a href={skill.source} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center text-xs text-[#6d675e] underline underline-offset-4">{zh ? '查看来源版本' : 'View inspected source'}</a>
        </div>
      </li>)}
    </ul>
  </details>
}
