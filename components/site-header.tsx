'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { GitHubStarButton } from '@/components/github-star-button'
import { HeaderNavigationContent } from '@/components/header-navigation-content'
import { LanguageSwitcher } from '@/components/language-switcher'
import { MobileNav } from '@/components/mobile-nav'
import { NavUserMenu } from '@/components/nav-user-menu'
import { useI18n } from '@/lib/i18n/context'
import { getShowcaseNavLabel } from '@/lib/i18n/showcase-label'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { cn } from '@/lib/utils'
import { HEADER_NAVIGATION, getNavigationCopy, navigationLabel, isNavigationPath, isNavigationSectionActive, type NavigationSection } from '@/lib/site-navigation'
import styles from './site-header.module.css'

function NavDropdown({ pathname, section, open, onOpen }: {
  pathname: string
  section: NavigationSection
  open: boolean
  onOpen: (id: string | null) => void
}) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const label = navigationLabel(section, locale, t.nav, getShowcaseNavLabel(locale))
  const href = getLocalizedNavigationHref(section.href, locale)
  const warmRoute = (href: string) => router.prefetch(href)
  const id = `desktop-nav-${section.id}`

  useEffect(() => {
    clearTimeout(hoverTimeout.current)
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onOpen(null)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => { document.removeEventListener('pointerdown', dismiss); clearTimeout(hoverTimeout.current) }
  }, [open, onOpen])

  return <div ref={root} className={styles.navSection} data-nav-section={section.id}
    onPointerEnter={() => clearTimeout(hoverTimeout.current)}
    onPointerLeave={event => { if (event.pointerType === 'mouse' && !root.current?.contains(document.activeElement)) hoverTimeout.current = setTimeout(() => onOpen(null), 150) }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) onOpen(null) }}
    onKeyDown={event => {
      if (event.key === 'Escape' && open) { event.stopPropagation(); onOpen(null); trigger.current?.focus() }
    }}>
    <div className={cn(styles.navItem, isNavigationSectionActive(pathname, section) && styles.active)}>
      <Link href={href} prefetch={false}
        onPointerDown={() => warmRoute(href)}
        onPointerEnter={event => { if (event.pointerType === 'mouse') onOpen(section.id); router.prefetch(href) }}
        onFocus={() => router.prefetch(href)} onClick={() => onOpen(null)}
        aria-current={isNavigationPath(pathname, section.href) ? 'page' : undefined}>
        {label}
      </Link>
      <button ref={trigger} type="button" className={styles.submenuTrigger}
        aria-label={`${getNavigationCopy(locale).toggle}: ${label}`} aria-expanded={open} aria-controls={id}
        onClick={() => onOpen(open ? null : section.id)}>
        <ChevronDown size={14} className={cn(styles.chevron, open && styles.rotated)} aria-hidden="true" />
      </button>
    </div>
    <div id={id} aria-hidden={!open} inert={!open}
      className={cn(styles.megaMenu, section.id === 'creators' && styles.creatorMenu, !open && styles.closed)}>
      <HeaderNavigationContent section={section} onNavigate={() => onOpen(null)} profileEnabled={open} />
    </div>
  </div>
}

export function SiteHeader() {
  const { t, locale } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const [openSection, setOpenSection] = useState<string | null>(null)

  return <header className={styles.header}>
    <div className={styles.inner}>
      <Link href={getLocalizedNavigationHref('/', locale)} className={styles.brand} aria-label="OpenAgentSkill">
        <BrandMark className="h-7 w-7 text-foreground" />
        <span>OpenAgentSkill</span>
      </Link>

      <nav className={styles.primaryNav} aria-label={getNavigationCopy(locale).navigation} data-primary-navigation>
        {HEADER_NAVIGATION.map(section => section.items ? (
          <NavDropdown key={section.id} pathname={pathname} section={section} open={openSection === section.id} onOpen={setOpenSection} />
        ) : (
          <Link key={section.id} data-nav-section={section.id} href={getLocalizedNavigationHref(section.href, locale)} prefetch={false}
            onPointerEnter={() => { setOpenSection(null); router.prefetch(getLocalizedNavigationHref(section.href, locale)) }}
            onFocus={() => router.prefetch(getLocalizedNavigationHref(section.href, locale))}
            onPointerDown={() => router.prefetch(getLocalizedNavigationHref(section.href, locale))}
            className={cn(styles.directLink, isNavigationSectionActive(pathname, section) && styles.active)}
            aria-current={isNavigationPath(pathname, section.href) ? 'page' : undefined}>
            {navigationLabel(section, locale, t.nav, getShowcaseNavLabel(locale))}
          </Link>
        ))}
      </nav>

      <div className={styles.actions}>
        <div className={styles.desktopUtility}><GitHubStarButton variant="navigation" /></div>
        <LanguageSwitcher showName={false} className={styles.language} />
        <div className={styles.desktopUtility}><NavUserMenu /></div>
        <MobileNav />
      </div>
    </div>
  </header>
}
