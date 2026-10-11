'use client'

import Link from '@/components/crawl-link'
import { useI18n } from '@/lib/i18n/context'
import { CREATOR_BLOG_SLUG, localizedBlogPath, type BlogLocale } from '@/lib/blog/routes'
import styles from './editorial.module.css'

type Teaser = { title: string; summary: string; eyebrow: string }

/** Only teaser copy crosses the client boundary, not the full article catalog. */
export function CreatorGuideFeature({ copy, slug = CREATOR_BLOG_SLUG }: { copy: Record<BlogLocale, Teaser>; slug?: string }) {
  const { locale } = useI18n()
  const article = copy[locale]
  return <section aria-labelledby={`${slug}-title`} className={styles.feature} lang={locale === 'zh' ? 'zh-CN' : locale}>
    <p className={styles.eyebrow}>{article.eyebrow}</p>
    <h2 id={`${slug}-title`} className={styles.featureTitle}>
      <Link href={localizedBlogPath(slug, locale)} prefetch={false}>{article.title}</Link>
    </h2>
    <p className={styles.summary}>{article.summary}</p>
  </section>
}
