'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from '@/components/crawl-link'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, BookmarkMinus } from 'lucide-react'
import type { Locale } from '@/lib/i18n/config'
import { accountCopy } from '@/lib/i18n/account-copy'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import type { SavedSkill } from '@/lib/account-workspace'
import styles from './account-workspace.module.css'

export function ProfileClient({ items, locale }: { items: SavedSkill[]; locale: Locale }) {
  const router = useRouter()
  const [pending, setPending] = useState<string[]>([])
  const [error, setError] = useState(false)
  const c = (key: Parameters<typeof accountCopy>[1]) => accountCopy(locale, key)
  async function remove(slug: string) {
    setPending(values => [...values, slug])
    setError(false)
    try {
      // The same authenticated API as directory cards preserves votes when unsaving.
      const result = await fetch('/api/skills/engagement', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, saved: false }) })
      if (!result.ok) throw new Error('remove failed')
      router.refresh()
    } catch { setError(true) }
    finally { setPending(values => values.filter(value => value !== slug)) }
  }
  return <>
    {error && <p role="alert" className={styles.notice}>{c('unavailable')}</p>}
    <div className={styles.cards}>{items.map(item => <article className={styles.card} key={item.slug}>
      <div className={styles.cardSource}>{item.source === 'Skillry' && <Image src="/brands/skillry.png" width={18} height={18} alt="" />}<span>{item.source}</span></div>
      <h3>{item.available ? <Link href={getLocalizedNavigationHref(`/skills/${item.slug}`, locale)}>{item.name}</Link> : item.name}</h3>
      <p className={styles.cardDescription}>{item.available ? item.description : c('retired')}</p>
      <div className={styles.cardActions}>
        {item.available ? <Link className={styles.textLink} href={getLocalizedNavigationHref(`/skills/${item.slug}`, locale)}>{c('view')}<ArrowUpRight size={14} aria-hidden="true" /></Link> : <span />}
        <button type="button" className={styles.remove} disabled={pending.includes(item.slug)} onClick={() => remove(item.slug)} aria-label={`${c('remove')} · ${item.name}`}><BookmarkMinus size={15} aria-hidden="true" />{pending.includes(item.slug) ? c('removing') : c('remove')}</button>
      </div>
    </article>)}</div>
  </>
}
