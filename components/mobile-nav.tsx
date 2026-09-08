'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, Plus, X } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { GitHubStarButton } from '@/components/github-star-button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useI18n } from '@/lib/i18n/context'
import { getShowcaseNavLabel } from '@/lib/i18n/showcase-label'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { getShellCopy } from '@/lib/i18n/shell-content'
import { cn } from '@/lib/utils'

import { SITE_NAVIGATION, getNavigationCopy, navigationLabel, isNavigationPath, isNavigationSectionActive } from '@/lib/site-navigation'

export function MobileNav() {
  const { t, locale } = useI18n()
  const shell = getShellCopy(locale)
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const panel = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

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
        const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href], button, summary, select, [tabindex="0"]') || []).filter(el => el.getClientRects().length && !el.hasAttribute('disabled'))
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

  return (
    <div className="xl:hidden">
      <button
        ref={trigger}
        aria-expanded={isOpen}
        type="button"
        onClick={() => setIsOpen(true)}
        className="-mr-2 flex h-10 w-10 items-center justify-center rounded-[8px] text-secondary transition-colors hover:bg-muted hover:text-foreground"
        aria-label={shell.openMenu}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={shell.mobileNavigation}
          className="fixed inset-0 overflow-y-auto overscroll-contain bg-background text-foreground"
          style={{ zIndex: 9999 }}
        >
          <div className="brand-grain pointer-events-none fixed inset-0 opacity-70" />
          <div className="relative z-10 flex h-16 items-center justify-between border-b border-border px-6">
            <span className="flex items-center gap-2 font-sans text-base font-semibold text-foreground">
              <BrandMark className="h-7 w-7" />
              OpenAgentSkill
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="-mr-2 flex h-10 w-10 items-center justify-center rounded-[8px] text-secondary transition-colors hover:bg-muted hover:text-foreground"
              aria-label={shell.closeMenu}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <nav
            className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col px-6 py-5"
            aria-label={shell.mobileNavigation}
          >
            <div className="divide-y divide-border border-y border-border">
              {SITE_NAVIGATION.map(section => (
                <div key={section.id} data-mobile-section={section.id} className="py-1">
                  <Link href={getLocalizedNavigationHref(section.href, locale)} prefetch={false} onClick={() => setIsOpen(false)}
                    aria-current={isNavigationPath(pathname, section.href) ? 'page' : undefined}
                    className={cn('block rounded px-3 py-3 text-base font-semibold', isNavigationSectionActive(pathname, section) && 'text-[#006b4f]')}>
                    {navigationLabel(section, locale, t.nav, getShowcaseNavLabel(locale))}
                  </Link>
                  {section.items && <details className="group px-3" open={isNavigationSectionActive(pathname, section) || section.id === 'skills'}>
                    <summary className="flex cursor-pointer list-none items-center justify-between pb-3 text-sm text-secondary">
                      {getNavigationCopy(locale).more}
                      <ChevronDown className="h-4 w-4 group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <ul className="grid gap-x-6 pb-3 sm:grid-cols-2">
                      {section.items.map(item => <li key={item.href}>
                        <Link href={getLocalizedNavigationHref(item.href, locale)} prefetch={false} onClick={() => setIsOpen(false)}
                          aria-current={isNavigationPath(pathname, item.href) ? 'page' : undefined}
                          className={cn('block rounded px-3 py-2.5 text-sm hover:bg-muted', isNavigationPath(pathname, item.href) ? 'bg-muted text-foreground' : 'text-secondary')}>
                          {navigationLabel(item, locale, t.nav, getShowcaseNavLabel(locale))}
                        </Link>
                      </li>)}
                    </ul>
                  </details>}
                </div>
              ))}
            </div>

            <div className="mt-auto pt-5">
              <div className="mb-3 flex items-center justify-between gap-4 border-t border-border pt-4">
                <span className="font-mono text-xs uppercase text-secondary">{shell.mobileLanguage}</span>
                <LanguageSwitcher />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href={getLocalizedNavigationHref('/submit', locale)}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-[8px] border border-border bg-card/70 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  {t.nav.submitSkill}
                </Link>
                <GitHubStarButton fullWidth className="h-10" />
              </div>
            </div>
          </nav>
        </div>,
        document.body
      )}
    </div>
  )
}
