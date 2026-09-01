'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, Plus, X } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { GitHubStarButton } from '@/components/github-star-button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useI18n } from '@/lib/i18n/context'
import { getBasePathname, getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { getShellCopy } from '@/lib/i18n/shell-content'
import { cn } from '@/lib/utils'

type NavLabelKey =
  | 'skills'
  | 'browseSkills'
  | 'trending'
  | 'rankings'
  | 'tasks'
  | 'packs'
  | 'compare'
  | 'forAgents'
  | 'agentEntry'
  | 'integrationKit'
  | 'apiDocs'
  | 'outcomes'
  | 'safety'
  | 'cli'
  | 'forCreators'
  | 'creatorConsole'
  | 'creatorKit'
  | 'submitSkill'
  | 'learn'
  | 'guides'
  | 'blog'
  | 'useCases'

type MobileNavItem = {
  href: string
  labelKey: NavLabelKey
}

const mobileSections: Array<{ labelKey: NavLabelKey; items: MobileNavItem[] }> = [
  {
    labelKey: 'skills',
    items: [
      { href: '/skills', labelKey: 'browseSkills' },
      { href: '/trending', labelKey: 'trending' },
      { href: '/rankings', labelKey: 'rankings' },
      { href: '/tasks', labelKey: 'tasks' },
      { href: '/skill-packs', labelKey: 'packs' },
      { href: '/compare', labelKey: 'compare' },
    ],
  },
  {
    labelKey: 'forAgents',
    items: [
      { href: '/agent', labelKey: 'agentEntry' },
      { href: '/agent/integration-kit', labelKey: 'integrationKit' },
      { href: '/api-docs', labelKey: 'apiDocs' },
      { href: '/cli', labelKey: 'cli' },
      { href: '/safety', labelKey: 'safety' },
      { href: '/outcomes', labelKey: 'outcomes' },
    ],
  },
  {
    labelKey: 'forCreators',
    items: [
      { href: '/submit', labelKey: 'submitSkill' },
      { href: '/creator', labelKey: 'creatorConsole' },
      { href: '/creator-kit', labelKey: 'creatorKit' },
    ],
  },
  {
    labelKey: 'learn',
    items: [
      { href: '/guides', labelKey: 'guides' },
      { href: '/blog', labelKey: 'blog' },
      { href: '/use-cases', labelKey: 'useCases' },
    ],
  },
]

function isActivePath(pathname: string, href: string) {
  const basePathname = getBasePathname(pathname)
  return basePathname === href || basePathname.startsWith(`${href}/`)
}

export function MobileNav() {
  const { t, locale } = useI18n()
  const shell = getShellCopy(locale)
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="-mr-2 flex h-10 w-10 items-center justify-center rounded-[8px] text-secondary transition-colors hover:bg-muted hover:text-foreground"
        aria-label={shell.openMenu}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 overflow-y-auto bg-background text-foreground"
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
            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href={getLocalizedNavigationHref('/resolve', locale)}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center justify-between rounded-[8px] border px-4 py-3 text-base font-semibold transition-colors',
                  isActivePath(pathname, '/resolve')
                    ? 'border-[#006b4f]/50 bg-[#006b4f]/5 text-foreground'
                    : 'border-border bg-card/70 text-foreground hover:border-foreground/40'
                )}
                aria-current={isActivePath(pathname, '/resolve') ? 'page' : undefined}
              >
                {t.nav.aiSkillFinder}
                <span className="font-mono text-xs text-[#006b4f]">Resolve</span>
              </Link>
              <Link
                href={getLocalizedNavigationHref('/docs', locale)}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center justify-between rounded-[8px] border px-4 py-3 text-base font-semibold transition-colors',
                  isActivePath(pathname, '/docs')
                    ? 'border-[#006b4f]/50 bg-[#006b4f]/5 text-foreground'
                    : 'border-border bg-card/70 text-foreground hover:border-foreground/40'
                )}
                aria-current={isActivePath(pathname, '/docs') ? 'page' : undefined}
              >
                {t.nav.docs}
              </Link>
            </div>

            <div className="mt-4 divide-y divide-border border-y border-border">
              {mobileSections.map((section) => {
                const active = section.items.some((item) => isActivePath(pathname, item.href))

                return (
                  <details key={section.labelKey} className="group" open={active || section.labelKey === 'skills'}>
                    <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-base font-semibold text-foreground marker:content-none">
                      {t.nav[section.labelKey]}
                      <ChevronDown className="h-4 w-4 text-secondary transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <ul className="grid gap-x-6 pb-4 sm:grid-cols-2">
                      {section.items.map((item) => {
                        const itemActive = isActivePath(pathname, item.href)

                        return (
                          <li key={item.href}>
                            <Link
                              href={getLocalizedNavigationHref(item.href, locale)}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                'flex items-center justify-between rounded-[6px] px-3 py-2.5 text-sm transition-colors',
                                itemActive ? 'bg-muted text-foreground' : 'text-secondary hover:bg-muted/60 hover:text-foreground'
                              )}
                              aria-current={itemActive ? 'page' : undefined}
                            >
                              {t.nav[item.labelKey]}
                              {itemActive && <span className="h-1.5 w-1.5 rounded-full bg-[#006b4f]" aria-hidden="true" />}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </details>
                )
              })}
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
