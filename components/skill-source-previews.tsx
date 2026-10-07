import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { previewCopy, previewText, type SkillSourcePreview } from '@/lib/skill-preview-shared'

export function SkillSourcePreviews({ preview, locale }: { preview: SkillSourcePreview; locale: string }) {
  return (
    <section id="visual-previews" className="scroll-mt-28 border-t border-border py-9 sm:py-12" aria-labelledby="source-preview-title">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#006b4f]">{previewText(preview.format, locale)}</p>
      <h2 id="source-preview-title" className="mt-2 font-display text-3xl font-normal">{previewCopy('title', locale)}</h2>
      <p className="mt-4 text-sm leading-7 text-secondary">{previewText(preview.note, locale)}</p>
      <div className="mt-6 space-y-6">
        {preview.media.map(media => (
          <figure key={media.src} className="overflow-hidden rounded-[12px] border border-border bg-card">
            <a href={media.src} target="_blank" rel="noreferrer" className="block bg-[#eeece5]/35 p-2 sm:p-4" aria-label={`${previewCopy('full', locale)}: ${previewText(media.title, locale)}`}>
              <Image src={media.previewSrc} alt={previewText(media.alt, locale)} width={media.width} height={media.height} sizes="(max-width: 1023px) 100vw, 760px" className="h-auto w-full" />
            </a>
            <figcaption className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm">
              <div><p className="text-[10px] text-secondary">{previewCopy(media.kind, locale)}</p><h3 className="mt-1 font-medium">{previewText(media.title, locale)}</h3></div>
              <a href={media.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 text-xs text-[#006b4f]">{previewCopy('source', locale)}<ArrowUpRight size={14} aria-hidden="true" /></a>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-5 text-xs leading-6 text-secondary">{previewCopy('note', locale)}</p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-secondary">
        <a href={preview.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">{preview.repository}</a>
        <a href={preview.licenseUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">{previewCopy('license', locale)}: {preview.license}</a>
      </p>
    </section>
  )
}
