'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import type { Locale } from '@/lib/i18n/config'
import { studioCopy } from '@/lib/i18n/studio-copy'
import { STUDIO_SKILL, studioImage } from '@/lib/studio/catalog'
import styles from './studio.module.css'

export function PreviewGallery({ locale }: { locale: Locale }) {
  const c = studioCopy(locale)
  const [format, setFormat] = useState<(typeof STUDIO_SKILL.formats)[number]['id']>('wide')
  const selected = STUDIO_SKILL.formats.find(item => item.id === format)!
  return <section className={styles.gallery} aria-label={c.formats}>
    <div className={styles.stage}>
      {/* Native SVG assets are the actual renderer output; no image proxy needed. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={studioImage(format)} width={selected.width} height={selected.height} alt={`${STUDIO_SKILL.name} · ${c[format]}`} fetchPriority="high" />
    </div>
    <div className={styles.thumbnails} role="group" aria-label={c.formats}>
      {STUDIO_SKILL.formats.map(item => <button key={item.id} type="button" aria-pressed={format === item.id} onClick={() => setFormat(item.id)} className={styles.thumbnail}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={studioImage(item.id)} alt="" width={item.width} height={item.height} />
        <span>{c[item.id]}</span><small>{item.width} × {item.height}</small>
      </button>)}
    </div>
    <div className={styles.galleryFooter}><p>{c.actualOutput}</p>
      <a className={styles.textLink} href={studioImage(format)} download={`launch-card-studio-${format}.svg`}><Download size={15} aria-hidden="true" />{c.download}</a>
    </div>
    <p className={styles.notice}>{c.sampleNote}</p>
  </section>
}
