'use client'

import Image from 'next/image'
import Link from '@/components/crawl-link'
import { ArrowRight, ArrowUpRight, ImageOff } from 'lucide-react'
import { useState } from 'react'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import type { Locale } from '@/lib/i18n/config'
import { getShowcaseEvidenceLabel, getShowcaseImageSrc, localizeShowcase, type ShowcaseCardData } from '@/lib/showcase-shared'
import { previewCopy, previewText, type SkillPreviewCardData } from '@/lib/skill-preview-shared'
import { ShowcaseVideoPlayer } from '@/components/showcase-video-player'
import { ProviderVideoPreview } from '@/components/provider-video-preview'

interface Props {
  slug: string
  name: string
  locale: Locale
  category: string
  showcase?: ShowcaseCardData | null
  sourcePreview?: SkillPreviewCardData | null
  sourceGalleryHref?: string
  provider?: { image?: string; video?: string; exampleLabel: string }
}

export function SkillCardPreview({ slug, name, locale, category, showcase, sourcePreview, sourceGalleryHref, provider }: Props) {
  const [failedSources, setFailedSources] = useState<string[]>([])
  const candidates = [provider?.image ? {
    src: provider.image, alt: `${name} — ${provider.exampleLabel}`, label: provider.exampleLabel,
    href: `/skills/${slug}#showcase`, contain: true, origin: 'provider',
  } : null, showcase?.media[0] ? {
    src: getShowcaseImageSrc(showcase.media[0].src, 'card'), alt: localizeShowcase(showcase.media[0].alt, locale),
    label: getShowcaseEvidenceLabel(showcase, locale), href: `/showcase/${showcase.slug}`,
    contain: showcase.cardFit === 'contain' || ['slides', 'image', 'document'].includes(showcase.category), origin: 'showcase',
  } : null, sourcePreview ? {
    src: sourcePreview.media.cardSrc, alt: previewText(sourcePreview.media.alt, locale),
    label: previewCopy(sourcePreview.media.kind, locale), href: `/skills/${slug}#visual-previews`, contain: true, origin: 'source',
  } : null].filter(candidate => candidate !== null)
  const media = candidates.find(candidate => !failedSources.includes(candidate.src))

  // Playback is independent of poster loading. No video URL is attached to a
  // player until the visitor clicks; the caption remains a crawlable detail link.
  const video = provider?.video && provider.image ? <ProviderVideoPreview key={provider.video} src={provider.video} poster={provider.image} title={name} zh={locale === 'zh'} compact />
    : showcase?.videoUrl ? <ShowcaseVideoPlayer key={showcase.videoUrl} item={showcase} locale={locale} compact />
    : sourcePreview?.media.videoSrc ? <ProviderVideoPreview key={sourcePreview.media.videoSrc} src={sourcePreview.media.videoSrc} poster={sourcePreview.media.cardSrc} title={name} zh={locale === 'zh'} compact /> : null
  if (video) return <div className="border-b border-border" data-skill-preview="video">
    {video}
    <Link href={getLocalizedNavigationHref(provider?.video ? `/skills/${slug}#showcase` : showcase?.videoUrl ? `/showcase/${showcase.slug}` : `/skills/${slug}#visual-previews`, locale)} prefetch={false} className="flex min-h-11 items-center justify-between gap-2 px-4 py-2 text-[10px] text-secondary">
      <span>{provider?.video ? provider.exampleLabel : showcase?.videoUrl ? getShowcaseEvidenceLabel(showcase, locale) : previewCopy(sourcePreview!.media.kind, locale)}</span><span className="inline-flex items-center gap-1 text-[#006b4f]">{previewCopy('view', locale)}<ArrowRight size={12} aria-hidden="true" /></span>
    </Link>
  </div>

  if (!media) return (
    <div className="border-b border-border bg-[#eeece5]/35 px-5 py-4" data-skill-capability>
      <p className="flex items-center gap-2 text-xs text-secondary"><ImageOff size={14} aria-hidden="true" />{previewCopy(candidates.length ? 'unavailable' : 'empty', locale)}</p>
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
          className={media.contain ? 'object-contain p-2' : 'object-cover object-top'} onError={() => setFailedSources(previous => [...new Set([...previous, media.src])])} />
      </div>
      <div className="flex min-h-10 items-center justify-between gap-2 bg-background/60 px-4 py-2 text-[10px] text-secondary">
        <span>{media.label}</span><span className="text-right">{sourcePreview && media.origin === 'source' ? previewText(sourcePreview.format, locale) : category}</span>
      </div>
    </Link>
  )
}
