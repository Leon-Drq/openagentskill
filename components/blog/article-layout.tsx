import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from '@/components/crawl-link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import styles from './editorial.module.css'

interface ArticleLayoutProps {
  language: string
  backHref: string
  backLabel: string
  eyebrow: string
  title: string
  summary: string
  byline: string
  dateLabel: string
  dateTime: string
  date: string
  children: ReactNode
}

/** One editorial shell; language selection stays in the shared site header. */
export function ArticleLayout({ language, backHref, backLabel, eyebrow, title, summary, byline, dateLabel, dateTime, date, children }: ArticleLayoutProps) {
  return <div className="min-h-screen bg-background text-foreground">
    <SiteHeader />
    <main className={styles.shell}>
      <article lang={language} className={styles.article}>
        <header className={styles.header}>
          <Link href={backHref} className={`${styles.back} ${styles.link}`}><ArrowLeft size={16} aria-hidden="true" />{backLabel}</Link>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.summary}>{summary}</p>
          <div className={styles.meta}>
            <span>{byline}</span>
            <span>{dateLabel}: <time dateTime={dateTime}>{date}</time></span>
          </div>
        </header>
        {children}
      </article>
    </main>
    <SiteFooter />
  </div>
}
