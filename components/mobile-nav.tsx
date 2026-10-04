'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, Plus, X } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { HeaderNavigationContent } from '@/components/header-navigation-content'
import { GitHubStarButton } from '@/components/github-star-button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NavUserMenu } from '@/components/nav-user-menu'
import { useI18n } from '@/lib/i18n/context'
import { getShowcaseNavLabel } from '@/lib/i18n/showcase-label'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { getShellCopy } from '@/lib/i18n/shell-content'
import { cn } from '@/lib/utils'
import { HEADER_NAVIGATION, getNavigationCopy, navigationLabel, isNavigationPath, isNavigationSectionActive } from '@/lib/site-navigation'
import styles from './site-header.module.css'

export function MobileNav() {
  const { t, locale } = useI18n()
  const shell = getShellCopy(locale)
  const [isOpen, setIsOpen] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>(null)
  const pathname = usePathname()
  const panel = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = () => setIsOpen(false)

  useEffect(() => {
    if (!isOpen) return
    const triggerElement = trigger.current
    const htmlOverflow = document.documentElement.style.overflow
    const bodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setIsOpen(false) }
      if (event.key === 'Tab') {
        const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href], button, select, [tabindex="0"]') || []).filter(el => el.getClientRects().length && !el.hasAttribute('disabled'))
        const first = elements[0], last = elements.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    const breakpoint = window.matchMedia('(min-width: 1280px)')
    const onResize = () => { if (breakpoint.matches) setIsOpen(false) }
    document.addEventListener('keydown', onKey)
    breakpoint.addEventListener('change', onResize)
    return () => {
      document.documentElement.style.overflow = htmlOverflow
      document.body.style.overflow = bodyOverflow
      document.removeEventListener('keydown', onKey)
      breakpoint.removeEventListener('change', onResize)
      triggerElement?.focus()
    }
  }, [isOpen])

  return <>
    <button ref={trigger} aria-expanded={isOpen} aria-controls="mobile-navigation-panel" type="button"
      onClick={() => { setOpenSection(null); setIsOpen(true) }} className={styles.mobileTrigger} aria-label={shell.openMenu}>
      <Menu size={21} aria-hidden="true" />
    </button>

    {isOpen && typeof document !== 'undefined' && createPortal(
      <div ref={panel} id="mobile-navigation-panel" role="dialog" aria-modal="true" aria-label={shell.mobileNavigation} className={styles.mobilePanel}>
        <div className={styles.mobileTop}>
          <Link href={getLocalizedNavigationHref('/', locale)} onClick={close} className={styles.brand}>
            <BrandMark className="h-7 w-7" /><span>OpenAgentSkill</span>
          </Link>
          <button type="button" onClick={close} className={styles.mobileClose} aria-label={shell.closeMenu}><X size={21} aria-hidden="true" /></button>
        </div>

        <nav className={styles.mobileBody} aria-label={shell.mobileNavigation}>
          <div className={styles.mobileSections}>
            {HEADER_NAVIGATION.map(section => {
              const expanded = openSection === section.id
              const label = navigationLabel(section, locale, t.nav, getShowcaseNavLabel(locale))
              return <div key={section.id} data-mobile-section={section.id}>
                <div className={styles.mobileSectionRow}>
                  <Link href={getLocalizedNavigationHref(section.href, locale)} prefetch={false} onClick={close}
                    aria-current={isNavigationPath(pathname, section.href) ? 'page' : undefined}
                    className={cn(isNavigationSectionActive(pathname, section) && styles.mobileActive)}>{label}</Link>
                  {section.items && <button type="button" className={styles.mobileClose} aria-expanded={expanded}
                    aria-controls={`mobile-nav-${section.id}`} aria-label={`${getNavigationCopy(locale).toggle}: ${label}`}
                    onClick={() => setOpenSection(expanded ? null : section.id)}>
                    <ChevronDown size={18} className={cn(styles.chevron, expanded && styles.rotated)} aria-hidden="true" />
                  </button>}
                </div>
                {section.items && <div id={`mobile-nav-${section.id}`} className={styles.mobileContent} hidden={!expanded}>
                  <HeaderNavigationContent section={section} onNavigate={close} profileEnabled={expanded} />
                </div>}
              </div>
            })}
          </div>

          <div className={styles.mobileBottom}>
            <NavUserMenu mobile onNavigate={close} />
            <div className={styles.mobileUtilities}>
              <Link href={getLocalizedNavigationHref('/submit', locale)} prefetch={false} onClick={close} className={styles.mobileSubmit}>
                <Plus size={17} aria-hidden="true" />{t.nav.submitSkill}
              </Link>
              <GitHubStarButton variant="navigation" />
            </div>
            <div className={styles.mobileLanguage}><span>{shell.mobileLanguage}</span><LanguageSwitcher /></div>
          </div>
        </nav>
      </div>,
      document.body
    )}
  </>
}
