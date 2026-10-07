'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, ImageOff } from 'lucide-react'
import { useState } from 'react'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import type { Locale } from '@/lib/i18n/config'
import { getShowcaseEvidenceLabel, getShowcaseImageSrc, localizeShowcase, type ShowcaseCardData } from '@/lib/showcase-shared'
import { previewCopy, previewText, type SkillPreviewCardData } from '@/lib/skill-preview-shared'

interface Props {
  slug: string
  name: string
  locale: Locale
  category: string
  showcase?: ShowcaseCardData | null
  sourcePreview?: SkillPreviewCardData | null
  sourceGalleryHref?: string
  provider?: { image?: string; exampleLabel: string }
}

export function SkillCardPreview({ slug, name, locale, category, showcase, sourcePreview, sourceGalleryHref, provider }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const media = provider?.image ? {
    src: provider.image, alt: `${name} — ${provider.exampleLabel}`, label: provider.exampleLabel,
    href: `/skills/${slug}#showcase`, contain: true,
  } : showcase?.media[0] ? {
    src: getShowcaseImageSrc(showcase.media[0].src, 'card'), alt: localizeShowcase(showcase.media[0].alt, locale),
    label: getShowcaseEvidenceLabel(showcase, locale), href: `/showcase/${showcase.slug}`,
    contain: showcase.cardFit === 'contain' || ['slides', 'image', 'document'].includes(showcase.category),
  } : sourcePreview ? {
    src: sourcePreview.media.cardSrc, alt: previewText(sourcePreview.media.alt, locale),
    label: previewCopy(sourcePreview.media.kind, locale), href: `/skills/${slug}#visual-previews`, contain: true,
  } : null

  if (!media || failedSrc === media.src) return (
    <div className="border-b border-border bg-[#eeece5]/35 px-5 py-4" data-skill-capability>
      <p className="flex items-center gap-2 text-xs text-secondary"><ImageOff size={14} aria-hidden="true" />{previewCopy(media ? 'unavailable' : 'empty', locale)}</p>
      <Link href={getLocalizedNavigationHref(`/skills/${slug}`, locale)} prefetch={false} className="mt-1 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[#006b4f]" aria-label={`${previewCopy('guide', locale)}: ${name}`}>
        {previewCopy('guide', locale)}<ArrowRight size={14} aria-hidden="true" />
      </Link>
      {sourceGalleryHref && <a href={sourceGalleryHref} target="_blank" rel="noreferrer" className="flex min-h-10 items-center gap-1 text-xs text-[#006b4f]">{previewCopy('source', locale)}<ArrowUpRight size={12} aria-hidden="true" /></a>}
    </div>
  )
  return (
    <Link href={getLocalizedNavigationHref(media.href, locale)} prefetch={false} className="block border-b border-border focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#006b4f]" aria-label={`${previewCopy('view', locale)}: ${name}`} data-skill-preview>
      <div className="relative aspect-[16/10] overflow-hidden bg-[#eeece5]/45">
        <Image src={media.src} alt={media.alt} fill sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 360px"
          className={media.contain ? 'object-contain p-2' : 'object-cover object-top'} onError={() => setFailedSrc(media.src)} />
      </div>
      <div className="flex min-h-10 items-center justify-between gap-2 bg-background/60 px-4 py-2 text-[10px] text-secondary">
        <span>{media.label}</span><span className="text-right">{sourcePreview && !showcase && !provider?.image ? previewText(sourcePreview.format, locale) : category}</span>
      </div>
    </Link>
  )
}
