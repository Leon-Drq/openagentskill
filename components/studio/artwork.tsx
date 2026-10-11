import type { Locale } from '@/lib/i18n/config'
import { studioCopy } from '@/lib/i18n/studio-copy'
import { studioUiCopy } from '@/lib/i18n/studio-ui-copy'
import { studioImage } from '@/lib/studio/catalog'
import styles from './studio.module.css'

/** This composition uses the three real sample files, never invented product screenshots. */
export function Artwork({ locale }: { locale: Locale }) {
  const c = studioCopy(locale)
  const ui = studioUiCopy(locale)
  return <div className={styles.artwork}>
    <svg className={styles.orbits} viewBox="0 0 600 500" fill="none" aria-hidden="true">
      <ellipse cx="300" cy="260" rx="272" ry="190" transform="rotate(-24 300 260)" />
      <ellipse cx="300" cy="260" rx="248" ry="164" transform="rotate(-24 300 260)" />
      <path d="M28 40h16m-8-8v16M550 455h16m-8-8v16" />
    </svg>
    <span className={styles.artworkLabel}>{ui.collection}</span>
    <div className={styles.posterPortrait}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={studioImage('portrait')} width={1080} height={1350} alt={c.portrait} fetchPriority="high" />
    </div>
    <div className={styles.posterSquare}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={studioImage('square')} width={1080} height={1080} alt={c.square} fetchPriority="high" />
    </div>
    <div className={styles.posterWide}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={studioImage('wide')} width={1200} height={630} alt={c.wide} fetchPriority="high" />
    </div>
    <span className={styles.artworkCaption}>SVG / 1200 × 630 / 1080 × 1080 / 1080 × 1350</span>
  </div>
}
