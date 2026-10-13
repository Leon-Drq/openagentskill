'use client'

import Link from '@/components/crawl-link'
import { ArrowUpRight, Film } from 'lucide-react'
import { MotionPreview } from './motion-preview'
import { motionCopy } from '@/lib/motion/copy'
import { motionDetailCopy } from '@/lib/motion/detail-copy'
import { motionSkillHref } from '@/lib/motion/routes'
import { motionTagLabel, type MotionEntry } from '@/lib/motion/shared'
import type { Locale } from '@/lib/i18n/config'
import { SkillDownloadCount } from '@/components/skill-download-count'

export function DirectoryMotionCard({ entry, locale, downloads }: { entry: MotionEntry; locale: Locale; downloads?: number | null }) {
  const language = locale === 'zh' ? 'zh' : 'en'
  const c = motionCopy(language)
  const tags = entry.tags.map(tag => motionTagLabel(tag, language))
  const details = motionDetailCopy(language).details
  const href = motionSkillHref(entry.id, locale)
  return <article className="group flex min-w-0 flex-col overflow-hidden rounded-[12px] border border-border bg-card transition-colors hover:border-[#006b4f]/50" data-directory-skill data-motion-skill={entry.id}>
    <div className="flex min-h-12 items-center justify-between gap-2 border-b border-border px-4 py-1">
      <span className="text-[10px] font-medium text-[#006b4f]">{tags.slice(0, 2).join(' · ')}</span>
      <span className="rounded-full border border-[#006b4f]/25 bg-[#006b4f]/5 px-2 py-1 text-[10px] font-medium text-[#006b4f]" data-motion-paid>{c.paid}</span>
    </div>
    <MotionPreview entry={entry} locale={language} compact />
    <div className="flex flex-1 flex-col p-5">
      <h3 className="break-words text-base font-semibold leading-snug [overflow-wrap:anywhere]">
        <Link href={href} prefetch={false} className="text-left hover:text-[#006b4f] focus-visible:outline-2 focus-visible:outline-offset-4">{entry.title}</Link>
      </h3>
      <a href={entry.sourcePost || entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 min-h-8 break-words text-[11px] text-secondary hover:text-[#006b4f]">{language === 'zh' ? '原作' : 'Original'} · @{entry.sourceAuthor} ↗</a>
      <p className="mt-3 text-sm leading-6 text-secondary">{c.preview} · {c.reproduction}</p>
      <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-4 text-xs text-secondary">
        <span>{entry.width} × {entry.height}</span><span>{entry.sourceKind === 'prompt' ? 'Prompt' : 'Skill'}</span>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/45 px-5 py-3">
      <span className="inline-flex items-center gap-1.5 text-xs text-secondary"><Film size={14} aria-hidden="true" />{c.preview}</span>
      <Link href={href} prefetch={false} aria-label={`${details}: ${entry.title}`} className="inline-flex min-h-10 items-center gap-1 text-xs text-[#006b4f] focus-visible:outline-2 focus-visible:outline-offset-4">{details}<ArrowUpRight size={14} aria-hidden="true" /></Link>
      <SkillDownloadCount count={downloads} locale={locale} />
    </div>
  </article>
}
