'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { Locale } from '@/lib/i18n/config'
import { accountCopy } from '@/lib/i18n/account-copy'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { accountXIntent, publicAccountUrl } from '@/lib/account-workspace'
import { CreatorProfileShare } from './creator-profile-share'
import styles from './account-workspace.module.css'

export function AccountPublicCard({ username, name, bio, locale }: { username: string | null; name: string; bio: string | null; locale: Locale }) {
  const c = (key: Parameters<typeof accountCopy>[1]) => accountCopy(locale, key)
  const [text, setText] = useState(c('shareText'))
  const url = username && publicAccountUrl(username)
  const intent = username && accountXIntent(username, text)
  return <section className={styles.share} aria-label={c('preview')}>
    <div>
      <p className={styles.eyebrow}>OpenAgentSkill / Profile</p>
      <h2 className={`${styles.sectionHeading} mt-3`}>{c('cardTitle')}</h2>
      <p>{c('cardIntro')}</p>
      {url && intent ? <>
        <label className={styles.draft}>{c('shareDraft')}<textarea rows={3} maxLength={220} value={text} onChange={event => setText(event.target.value)} /></label>
        <div className={styles.actions}><a href={intent} target="_blank" rel="noopener noreferrer" className={styles.primary}><span aria-hidden="true">𝕏</span>{c('shareX')}<ArrowUpRight size={15} aria-hidden="true" /></a><CreatorProfileShare username={username!} locale={locale} /></div>
        <div className={styles.actions}><Link href={getLocalizedNavigationHref(`/creators/${username}`, locale)} className={styles.textLink}>{c('openPublic')}<ArrowUpRight size={14} aria-hidden="true" /></Link><Link href={getLocalizedNavigationHref('/creator?tab=profile', locale)} className={styles.textLink}>{c('editPublic')}</Link></div>
      </> : <div className={styles.actions}><Link href={getLocalizedNavigationHref('/creator?tab=profile', locale)} className={styles.primary}>{c('createPublic')}<ArrowUpRight size={15} aria-hidden="true" /></Link></div>}
      <p className={styles.privacy}>{c('privacy')}</p>
    </div>
    <div className={styles.preview}>
      <span className={styles.eyebrow}>{c('preview')}</span>
      <div><h3 className={styles.previewName}>{name}</h3><p className={styles.previewBio}>{bio || c('cardIntro')}</p></div>
      <div className={styles.previewUrl}>{url ? `openagentskill.com/creators/${username}` : 'OpenAgentSkill'}</div>
    </div>
  </section>
}
