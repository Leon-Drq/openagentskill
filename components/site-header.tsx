'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Plus } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { GitHubStarButton } from '@/components/github-star-button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { MobileNav } from '@/components/mobile-nav'
import { useI18n } from '@/lib/i18n/context'
import { getShowcaseNavLabel } from '@/lib/i18n/showcase-label'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { cn } from '@/lib/utils'

import { SITE_NAVIGATION, getNavigationCopy, navigationLabel, isNavigationPath, isNavigationSectionActive, type NavigationSection } from '@/lib/site-navigation'

function NavDropdown({ pathname, section }: { pathname: string; section: NavigationSection }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const label = navigationLabel(section, locale, t.nav, getShowcaseNavLabel(locale))
  const href = getLocalizedNavigationHref(section.href, locale)
  const warmRoute = (target: string) => router.prefetch(target)
  const id = `desktop-nav-${section.id}`
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])
  return (
    <div ref={root} className="relative h-full" data-nav-section={section.id}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}
      onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); root.current?.querySelector('button')?.focus() } }}>
      <div className={cn('flex h-16 items-center border-b-2 border-transparent text-sm text-secondary', isNavigationSectionActive(pathname, section) && 'border-[#006b4f] text-foreground')}>
        <Link href={href} prefetch={false} onPointerEnter={() => router.prefetch(href)} onPointerDown={() => warmRoute(href)} onFocus={() => router.prefetch(href)}
          onClick={() => setOpen(false)} className="flex h-full items-center whitespace-nowrap pl-2 pr-1 hover:text-foreground"
          aria-current={isNavigationPath(pathname, section.href) ? 'page' : undefined}>{label}</Link>
        <button type="button" className="flex h-10 w-7 items-center justify-center rounded hover:bg-muted"
          aria-label={`${getNavigationCopy(locale).toggle}: ${label}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
          <ChevronDown className={cn('h-3.5 w-3.5', open && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>
      <div id={id} aria-hidden={!open} className={cn(
        'absolute right-0 top-[calc(100%-1px)] z-50 w-64 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain rounded-[8px] border border-border bg-background p-1.5 shadow-[0_18px_55px_rgba(29,27,24,0.12)]',
        !open && 'invisible pointer-events-none'
      )}>
        {section.items?.map(item => {
          const target = getLocalizedNavigationHref(item.href, locale)
          return <Link key={item.href} href={target} prefetch={false} tabIndex={open ? 0 : -1}
            onPointerEnter={() => router.prefetch(target)} onFocus={() => router.prefetch(target)} onClick={() => setOpen(false)}
            aria-current={isNavigationPath(pathname, item.href) ? 'page' : undefined}
            className={cn('block rounded-[6px] px-3 py-3 text-sm hover:bg-muted', isNavigationPath(pathname, item.href) ? 'bg-muted text-foreground' : 'text-secondary')}>
            {navigationLabel(item, locale, t.nav, getShowcaseNavLabel(locale))}
          </Link>
        })}
      </div>
    </div>
  )
}

export function SiteHeader() {
  const { t, locale } = useI18n()
  const pathname = usePathname()
  const router = useRouter()

  const warmRoute = (href: string) => {
    router.prefetch(href)
  }


  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/82">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <Link href={getLocalizedNavigationHref('/', locale)} className="flex min-w-0 shrink-0 items-center gap-2.5 transition-opacity hover:opacity-70">
          <BrandMark className="h-7 w-7 text-foreground" />
          <span className="hidden truncate font-sans text-base font-semibold sm:inline sm:text-lg">
            OpenAgentSkill
          </span>
          <span className="hidden rounded-[6px] border border-border px-2 py-0.5 font-mono text-[10px] uppercase text-secondary 2xl:inline-flex">
            Registry
          </span>
        </Link>

        <nav className="hidden h-full min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex" aria-label={getNavigationCopy(locale).navigation} data-primary-navigation>
          {SITE_NAVIGATION.map(section => section.items ? (
            <NavDropdown key={section.id} pathname={pathname} section={section} />
          ) : (
            <Link key={section.id} data-nav-section={section.id} href={getLocalizedNavigationHref(section.href, locale)} prefetch={false}
              onPointerEnter={() => warmRoute(getLocalizedNavigationHref(section.href, locale))}
              onFocus={() => warmRoute(getLocalizedNavigationHref(section.href, locale))}
              className={cn('flex h-16 items-center whitespace-nowrap border-b-2 border-transparent px-2 text-sm text-secondary hover:text-foreground', isNavigationSectionActive(pathname, section) && 'border-[#006b4f] text-foreground')}
              aria-current={isNavigationPath(pathname, section.href) ? 'page' : undefined}>
              {navigationLabel(section, locale, t.nav, getShowcaseNavLabel(locale))}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex h-full shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-2 xl:flex">
            <GitHubStarButton />
            <Link
              href={getLocalizedNavigationHref('/submit', locale)}
              className="flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-[8px] border border-border bg-card/70 px-3 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t.nav.submitSkill}
            </Link>
          </div>

          <div className="xl:hidden">
            <GitHubStarButton className="h-9" compact />
          </div>
          <div className="xl:hidden">
            <LanguageSwitcher compact />
          </div>
          <div className="hidden xl:block">
            <LanguageSwitcher showName={false} />
          </div>
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
