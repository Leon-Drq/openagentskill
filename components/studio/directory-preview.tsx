import Link from '@/components/crawl-link'
import type { Locale } from '@/lib/i18n/config'
import { studioCopy } from '@/lib/i18n/studio-copy'
import { STUDIO_SKILL, studioHref, studioImage } from '@/lib/studio/catalog'
import styles from './studio.module.css'

export function DirectoryStudioPreview({ locale }: { locale: Locale }) {
  const c = studioCopy(locale)
  return <article className={styles.directoryPreview}>
    <Link href={studioHref(STUDIO_SKILL.path, locale)} aria-label={c.previewLink}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={studioImage('wide')} alt="" width={1200} height={630} loading="lazy" />
    </Link>
    <div><span className={styles.badge}>{c.preview}</span><h3>{STUDIO_SKILL.name}</h3><p className={styles.body}>{c.skillLead}</p>
      <Link href={studioHref(STUDIO_SKILL.path, locale)} className={styles.textLink}>{c.previewLink} →</Link>
    </div>
  </article>
}
