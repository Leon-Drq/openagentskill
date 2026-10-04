'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Search } from 'lucide-react'
import { DiscoveryCategories } from '@/components/discovery-navigation'
import { CreatorMenuProfile } from '@/components/creator-menu-profile'
import { useI18n } from '@/lib/i18n/context'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { getNavigationAccountCopy } from '@/lib/i18n/navigation-account-copy'
import { getShowcaseNavLabel } from '@/lib/i18n/showcase-label'
import { discoveryCopy } from '@/lib/discovery'
import { SITE_NAVIGATION, getNavigationCopy, navigationLabel, type NavigationSection } from '@/lib/site-navigation'
import styles from './site-header.module.css'

export function HeaderNavigationContent({ section, onNavigate, profileEnabled = false }: {
  section: NavigationSection
  onNavigate: () => void
  profileEnabled?: boolean
}) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const label = (item: NavigationSection | NonNullable<NavigationSection['items']>[number]) => navigationLabel(item, locale, t.nav, getShowcaseNavLabel(locale))
  const links = (items: NonNullable<NavigationSection['items']>) => <ul className={styles.menuLinks}>
    {items.map(item => <li key={item.href}>
      <Link href={getLocalizedNavigationHref(item.href, locale)} prefetch={false} onClick={onNavigate}
        onPointerEnter={() => router.prefetch(getLocalizedNavigationHref(item.href, locale))}
        onFocus={() => router.prefetch(getLocalizedNavigationHref(item.href, locale))}>
        <span>{label(item)}</span><ArrowRight size={16} aria-hidden="true" />
      </Link>
    </li>)}
  </ul>

  if (section.id === 'skills') return <>
    <DiscoveryCategories variant="navigation" onNavigate={onNavigate} />
    <div className={styles.shortcuts}>
      {section.items?.filter(item => !['/skills', '/resolve'].includes(item.href)).map(item => <Link key={item.href}
        href={getLocalizedNavigationHref(item.href, locale)} prefetch={false} onClick={onNavigate}>{label(item)}<ArrowRight size={14} aria-hidden="true" /></Link>)}
      <Link href={getLocalizedNavigationHref('/skills#skill-search', locale)} prefetch={false} onClick={onNavigate}>
        <Search size={15} aria-hidden="true" />{discoveryCopy(locale).search}
      </Link>
    </div>
  </>

  if (section.id === 'creators') return <div className={styles.creatorLinks}>
    {links(section.items || [])}
    {profileEnabled && <CreatorMenuProfile onNavigate={onNavigate} />}
  </div>

  const resources = SITE_NAVIGATION.find(item => item.id === 'resources')!
  const developers = SITE_NAVIGATION.find(item => item.id === 'developers')!
  const groups = [
    { title: getNavigationCopy(locale).resources, items: resources.items!.slice(0, 3) },
    { title: getNavigationCopy(locale).developers, items: developers.items! },
    { title: getNavigationAccountCopy(locale).community, items: resources.items!.slice(3) },
  ]
  return <div className={styles.resourceGroups}>
    {groups.map(group => <section key={group.title}><h3>{group.title}</h3>{links(group.items)}</section>)}
  </div>
}
