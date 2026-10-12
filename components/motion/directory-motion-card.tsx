'use client'

import { ArrowUpRight, Film, X } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MotionPreview } from './motion-preview'
import { motionCopy } from '@/lib/motion/copy'
import { motionTagLabel, type MotionEntry } from '@/lib/motion/shared'
import type { Locale } from '@/lib/i18n/config'

export function DirectoryMotionCard({ entry, locale }: { entry: MotionEntry; locale: Locale }) {
  const language = locale === 'zh' ? 'zh' : 'en'
  const c = motionCopy(language)
  const tags = entry.tags.map(tag => motionTagLabel(tag, language))
  const previewLabel = language === 'zh' ? '预览与详情' : 'Preview & details'
  return <Dialog>
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-[12px] border border-border bg-card transition-colors hover:border-[#006b4f]/50" data-directory-skill data-motion-skill={entry.id}>
      <div className="flex min-h-12 items-center justify-between gap-2 border-b border-border px-4 py-1">
        <span className="text-[10px] font-medium text-[#006b4f]">{tags.slice(0, 2).join(' · ')}</span>
        <span className="rounded-full border border-[#006b4f]/25 bg-[#006b4f]/5 px-2 py-1 text-[10px] font-medium text-[#006b4f]" data-motion-paid>{c.paid}</span>
      </div>
      <MotionPreview entry={entry} locale={language} compact />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="break-words text-base font-semibold leading-snug [overflow-wrap:anywhere]">
          <DialogTrigger className="text-left hover:text-[#006b4f]">{entry.title}</DialogTrigger>
        </h3>
        <a href={entry.sourcePost || entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 min-h-8 break-words text-[11px] text-secondary hover:text-[#006b4f]">{language === 'zh' ? '原作' : 'Original'} · @{entry.sourceAuthor} ↗</a>
        <p className="mt-3 text-sm leading-6 text-secondary">{c.preview} · {c.reproduction}</p>
        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-4 text-xs text-secondary">
          <span>{entry.width} × {entry.height}</span><span>{entry.sourceKind === 'prompt' ? 'Prompt' : 'Skill'}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/45 px-5 py-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-secondary"><Film size={14} aria-hidden="true" />{c.preview}</span>
        <DialogTrigger aria-label={`${previewLabel}: ${entry.title}`} className="inline-flex min-h-10 items-center gap-1 text-xs text-[#006b4f]">{previewLabel}<ArrowUpRight size={14} aria-hidden="true" /></DialogTrigger>
      </div>
    </article>
    <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto rounded-[12px] p-0 sm:max-w-5xl" data-motion-dialog>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background px-5 py-4">
        <div className="min-w-0"><p className="mb-1 text-xs text-[#006b4f]">{c.paid} · {c.preview}</p>
          <DialogTitle className="break-words text-lg leading-7">{entry.title}</DialogTitle>
        </div>
        <DialogClose aria-label={language === 'zh' ? '关闭预览' : 'Close preview'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border hover:bg-muted"><X size={18} aria-hidden="true" /></DialogClose>
      </div>
      <div className="grid min-w-0 gap-6 px-5 pb-6 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <MotionPreview entry={entry} locale={language} />
          <DialogDescription className="mt-3 text-xs leading-6 text-secondary">{c.sampleNote}</DialogDescription>
          <div className="mt-5 border-t border-border pt-4">
            <h4 className="text-sm font-semibold">{c.source}</h4>
            <p className="mt-2 break-words text-xs leading-6 text-secondary">{c.sourceLead}</p>
            <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs text-[#006b4f] underline underline-offset-4">{c.reference} · @{entry.sourceAuthor}<ArrowUpRight size={14} /></a>
            {entry.sourceRepo && <a href={entry.sourceRepo} target="_blank" rel="noopener noreferrer" className="block py-3 text-xs text-[#006b4f] underline underline-offset-4">{c.repository} ↗</a>}
          </div>
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">{c.includes}</h4>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-secondary">{c.deliverables.map(item => <li key={item} className="flex gap-2"><span aria-hidden="true" className="text-[#006b4f]">·</span>{item}</li>)}</ul>
          <div className="mt-6 rounded-[12px] border border-border bg-card p-4">
            <p className="text-sm font-semibold">{c.access}</p>
            <p className="mt-2 text-xs leading-6 text-secondary">{c.accessBody}</p>
            <button type="button" disabled className="mt-3 min-h-11 w-full rounded-lg border border-border px-3 py-2 text-xs text-secondary opacity-60">{c.accessDisabled}</button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
}
