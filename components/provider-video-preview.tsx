'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Play } from 'lucide-react'

export function ProviderVideoPreview({ src, poster, title, zh, compact = false }: { src: string; poster: string; title: string; zh: boolean; compact?: boolean }) {
  const [started, setStarted] = useState(false)
  const [failed, setFailed] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)
  return <div className={`relative overflow-hidden bg-[#1d1b18] ${compact ? 'aspect-[16/10]' : 'aspect-video rounded-xl border border-border'}`} data-provider-video>
    {started && !failed ? <video src={src} poster={posterFailed ? undefined : poster} controls playsInline autoPlay preload="none" aria-label={title} className="h-full w-full object-contain" onError={() => setFailed(true)} onPlay={event => {
      document.querySelectorAll('video').forEach(video => { if (video !== event.currentTarget) video.pause() })
    }} /> : <>
      {!posterFailed && <Image src={poster} alt={title} fill unoptimized sizes={compact ? '(max-width: 639px) 100vw, 380px' : '(max-width: 767px) 100vw, 960px'} className="object-contain" onError={() => setPosterFailed(true)} />}
      {failed ? <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 p-4 text-center text-sm text-white">
        <p>{zh ? '视频暂时无法加载' : 'Preview could not load'}</p>
        <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">{zh ? '打开原视频' : 'Open original video'}</a>
        <button type="button" onClick={() => { setFailed(false); setStarted(true) }} className="min-h-11 underline">{zh ? '重试播放' : 'Retry preview'}</button>
      </div>
        : <button type="button" onClick={() => setStarted(true)} aria-label={`${zh ? '播放案例' : 'Play example'}: ${title}`} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/10 text-white hover:bg-black/25 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"><span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-black/60"><Play size={22} aria-hidden="true" /></span><span className="rounded bg-black/70 px-3 py-1.5 text-xs">{zh ? '播放预览' : 'Play preview'}</span></button>}
    </>}
  </div>
}
