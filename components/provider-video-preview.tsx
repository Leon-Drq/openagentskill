'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Play } from 'lucide-react'

export function ProviderVideoPreview({ src, poster, title, zh }: { src: string; poster: string; title: string; zh: boolean }) {
  const [started, setStarted] = useState(false)
  const [failed, setFailed] = useState(false)
  return <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-[#1d1b18]" data-provider-video>
    {started && !failed ? <video src={src} poster={poster} controls playsInline autoPlay preload="none" aria-label={title} className="h-full w-full object-contain" onError={() => setFailed(true)} /> : <>
      <Image src={poster} alt={title} fill unoptimized sizes="(max-width: 767px) 100vw, 960px" className="object-contain" />
      {failed ? <div role="status" className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-sm text-white">{zh ? '视频暂时无法加载，可在原站查看案例。' : 'Preview unavailable. View the example on Skillry.'}</div>
        : <button type="button" onClick={() => setStarted(true)} aria-label={`${zh ? '播放案例' : 'Play example'}: ${title}`} className="absolute inset-0 flex items-center justify-center bg-black/10 text-white hover:bg-black/25 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"><span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-black/60"><Play size={22} aria-hidden="true" /></span></button>}
    </>}
  </div>
}
