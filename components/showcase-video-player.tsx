'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { getShowcaseImageSrc, localizeShowcase, type ShowcaseCase } from '@/lib/showcase'
import type { Locale } from '@/lib/i18n/config'

/** No video source is attached until an explicit click. Used by cards and detail. */
export function ShowcaseVideoPlayer({ item, locale, compact = false, priority = false }: {
  item: ShowcaseCase; locale: Locale; compact?: boolean; priority?: boolean
}) {
  const [started, setStarted] = useState(false)
  const [failed, setFailed] = useState(false)
  const zh = locale === 'zh'
  const title = localizeShowcase(item.title, locale)
  const poster = getShowcaseImageSrc(item.media[0].src, compact ? 'card' : 'preview')
  return <div className={`relative overflow-hidden bg-[#1d1b18] ${compact ? 'aspect-[16/10]' : 'aspect-video'}`} data-video-preview={item.slug}>
    {started && !failed ? <video controls playsInline autoPlay preload="none" src={item.videoUrl} poster={poster} aria-label={title} className="h-full w-full object-contain"
      onError={() => setFailed(true)} onPlay={(event) => {
        // Only one preview should produce sound, even when several cards are open.
        document.querySelectorAll('video').forEach((video) => { if (video !== event.currentTarget) video.pause() })
        trackAnalyticsEvent('showcase_media_play', { case_slug: item.slug, skill_slug: item.skillSlug })
      }} /> : <>
      <Image src={poster} alt={localizeShowcase(item.media[0].alt, locale)} fill sizes={compact ? '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 380px' : '(max-width: 1023px) 100vw, 680px'} preload={priority} className="object-contain" />
      {failed ? <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1d1b18]/85 p-4 text-center text-sm text-white">
        <p>{zh ? '视频暂时无法加载' : 'Preview could not load'}</p>
        <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">{zh ? '打开原视频' : 'Open original video'}</a>
        <button type="button" onClick={() => { setFailed(false); setStarted(true) }} className="min-h-11 px-4 underline underline-offset-4">{zh ? '重试播放' : 'Retry preview'}</button>
      </div> : <button type="button" onClick={() => setStarted(true)} aria-label={`${zh ? '播放预览' : 'Play preview'} · ${title}`} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/10 text-white transition-colors hover:bg-black/25 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-[#1d1b18]/75 shadow-sm"><Play className="ml-1 h-5 w-5" fill="currentColor" aria-hidden="true" /></span>
        <span className="rounded bg-[#1d1b18]/80 px-3 py-1.5 text-xs font-medium">{zh ? '播放预览' : 'Play preview'}</span>
      </button>}
    </>}
  </div>
}
