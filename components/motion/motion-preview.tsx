'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import type { MotionEntry, MotionLocale } from '@/lib/motion/shared'
import { motionCopy } from '@/lib/motion/copy'
import styles from './motion.module.css'

export function MotionPreview({ entry, locale, compact = false }: {
  entry: MotionEntry; locale: MotionLocale; compact?: boolean
}) {
  const c = motionCopy(locale)
  const video = useRef<HTMLVideoElement>(null)
  const manuallyPaused = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [reduced, setReduced] = useState(true)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { setReduced(preference.matches); if (preference.matches) video.current?.pause() }
    const hide = () => { if (document.hidden) video.current?.pause() }
    update()
    preference.addEventListener('change', update)
    document.addEventListener('visibilitychange', hide)
    return () => { preference.removeEventListener('change', update); document.removeEventListener('visibilitychange', hide) }
  }, [])
  useEffect(() => {
    const element = video.current
    if (!compact || !element || reduced) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !manuallyPaused.current) {
        void element.play().catch(error => {
          if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') setFailed(true)
        })
      } else element.pause()
    }, { threshold: 0.4 })
    observer.observe(element)
    return () => { observer.disconnect(); element.pause() }
  }, [compact, reduced])
  const play = () => {
    if (!video.current) return
    if (failed) { setFailed(false); video.current.load() }
    void video.current.play().catch(error => {
      // Pointer leave can interrupt a pending play while metadata is loading.
      if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') setFailed(true)
    })
  }
  return <div className={`${styles.preview} ${compact ? styles.compact : ''}`}>
    <video ref={video} src={entry.videoUrl} poster={entry.posterUrl}
      width={entry.width} height={entry.height} preload="none" muted playsInline
      loop={!reduced} controls={!compact} aria-label={`${entry.title} — ${c.sample}`}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
      onError={() => { setPlaying(false); setFailed(true) }} data-original-motion-video>
      <a href={entry.sourceUrl}>{c.reference}</a>
    </video>
    {compact && <div className={styles.previewControls}>
      <button type="button" onClick={() => { manuallyPaused.current = playing; if (playing) video.current?.pause(); else play() }}
        aria-label={playing ? c.pause : c.play} aria-pressed={playing}>
        {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        <span>{playing ? c.pause : c.play}</span>
      </button>
    </div>}
    {failed && <p className={styles.notice}>{c.loadError} <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">{c.reference} ↗</a></p>}
    {reduced && !compact && <p className={styles.notice}>{c.reducedMotion}</p>}
  </div>
}
