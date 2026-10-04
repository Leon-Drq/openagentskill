import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Bookmark, LayoutDashboard, Settings2, Sparkles, CircleUserRound, ArrowUpRight } from 'lucide-react'
import { I18nProvider } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/config'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { accountCopy } from '@/lib/i18n/account-copy'
import { accountHref, type AccountTab } from '@/lib/account-workspace'
import { publicWebsite } from '@/lib/creator-profile'
import { MarketingPageShell } from './marketing-page'
import styles from './account-workspace.module.css'

export function AccountWorkspaceShell({ children, locale, active, name, avatarUrl }: {
  children: ReactNode; locale: Locale; active: AccountTab | 'creator'; name: string; avatarUrl?: string | null
}) {
  const c = (key: Parameters<typeof accountCopy>[1]) => accountCopy(locale, key)
  const links = [
    { key: 'overview' as const, icon: LayoutDashboard, href: accountHref('overview', locale) },
    { key: 'bookmarks' as const, icon: Bookmark, href: accountHref('bookmarks', locale) },
    { key: 'points' as const, icon: Sparkles, href: accountHref('points', locale) },
    { key: 'settings' as const, icon: Settings2, href: accountHref('settings', locale) },
    { key: 'creator' as const, icon: CircleUserRound, href: getLocalizedNavigationHref('/creator', locale) },
  ]
  const avatar = publicWebsite(avatarUrl)
  return <I18nProvider initialLocale={locale}><MarketingPageShell>
    <div className={styles.workspace} data-account-workspace>
      <aside className={styles.sidebar}>
        <div className={styles.identity}>
          <span className={styles.avatar}>{avatar ? <Image src={avatar} alt="" width={48} height={48} unoptimized /> : name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{name}</strong><small>{c('private')}</small></div>
        </div>
        <nav aria-label={c('workspace')} className={styles.navigation}>
          {links.map(({ key, icon: Icon, href }) => <Link href={href} key={key} prefetch={false} aria-current={active === key ? 'page' : undefined}><Icon size={18} aria-hidden="true" />{c(key)}</Link>)}
        </nav>
        <Link className={styles.discover} href={getLocalizedNavigationHref('/skills', locale)}>{c('browse')}<ArrowUpRight size={16} aria-hidden="true" /></Link>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  </MarketingPageShell></I18nProvider>
}
