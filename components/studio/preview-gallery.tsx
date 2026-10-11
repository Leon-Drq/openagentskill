'use client'

import { useState } from 'react'
import { Download, LayoutGrid, Maximize2 } from 'lucide-react'
import type { Locale } from '@/lib/i18n/config'
import { studioCopy } from '@/lib/i18n/studio-copy'
import { studioUiCopy } from '@/lib/i18n/studio-ui-copy'
import { STUDIO_SKILL, studioImage } from '@/lib/studio/catalog'
import styles from './studio.module.css'
import { Artwork } from './artwork'

export function PreviewGallery({ locale }: { locale: Locale }) {
  const c = studioCopy(locale)
  const ui = studioUiCopy(locale)
  const [format, setFormat] = useState<'overview' | (typeof STUDIO_SKILL.formats)[number]['id']>('overview')
  const selected = STUDIO_SKILL.formats.find(item => item.id === format) || STUDIO_SKILL.formats[0]
  return <section className={styles.gallery} aria-label={c.formats}>
    <div className={styles.stage}>
      <div key={format} className={styles.stageContent}>
        {format === 'overview' ? <Artwork locale={locale} /> : <div className={styles.singlePreview}>
          {/* Native SVG assets are actual renderer output; no image proxy needed. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={studioImage(format)} width={selected.width} height={selected.height} alt={`${STUDIO_SKILL.name} · ${c[format]}`} />
          <span>{selected.width} × {selected.height} / SVG</span>
        </div>}
      </div>
    </div>
    <div className={styles.thumbnails} role="group" aria-label={c.formats}>
      <button type="button" aria-pressed={format === 'overview'} onClick={() => setFormat('overview')} className={styles.thumbnail}><span className={styles.overviewThumb}><LayoutGrid size={25} strokeWidth={1.4} aria-hidden="true" /></span><span>{ui.overview}</span></button>
      {STUDIO_SKILL.formats.map(item => <button key={item.id} type="button" aria-pressed={format === item.id} onClick={() => setFormat(item.id)} className={styles.thumbnail}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={studioImage(item.id)} alt="" width={item.width} height={item.height} />
        <span>{c[item.id]}</span>
      </button>)}
    </div>
    <div className={styles.galleryFooter}>
      <p><Maximize2 size={14} aria-hidden="true" />{format === 'overview' ? ui.previewTitle : c.actualOutput}</p>
      {format !== 'overview' && <a className={styles.textLink} href={studioImage(format)} download={`launch-card-studio-${format}.svg`}><Download size={15} aria-hidden="true" />{c.download}</a>}
    </div>
    <p className={styles.sampleNote}>{c.sampleNote}</p>
  </section>
}
