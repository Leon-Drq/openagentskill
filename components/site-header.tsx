'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageSwitcher } from '@/components/language-switcher'
import { MobileNav } from '@/components/mobile-nav'
import { NavUserMenu } from '@/components/nav-user-menu'
import { useI18n } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', labelKey: 'home', exact: true },
  { href: '/skills', labelKey: 'skills' },
  { href: '/use-cases', label: 'Use Cases' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/collections', label: 'Stacks' },
  { href: '/blog', label: 'Blog' },
  { href: '/docs', labelKey: 'docs' },
  { href: '/api-docs', labelKey: 'apiDocs' },
  { href: '/activity', labelKey: 'activity' },
  { href: '/submit', labelKey: 'submit' },
] as const

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function GitHubIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export function SiteHeader() {
  const { t } = useI18n()
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-70">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-foreground font-display text-sm font-semibold leading-none">
            O
          </span>
          <span className="hidden truncate font-display text-base font-semibold tracking-tight sm:inline sm:text-lg">
            OpenAgentSkill
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href, 'exact' in item ? item.exact : false)
              const label = 'label' in item ? item.label : t.nav[item.labelKey]

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-2.5 py-1.5 text-sm transition-colors',
                    active ? 'text-foreground' : 'text-secondary hover:text-foreground'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <a
              href="https://github.com/Leon-Drq/openagentskill"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center border border-transparent text-secondary transition-colors hover:border-border hover:text-foreground"
              aria-label="OpenAgentSkill on GitHub"
            >
              <GitHubIcon />
            </a>
            <a
              href="https://x.com/openagentskill"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center border border-transparent text-secondary transition-colors hover:border-border hover:text-foreground"
              aria-label="OpenAgentSkill on X"
            >
              <XIcon />
            </a>
          </div>

          <NavUserMenu />
          <LanguageSwitcher />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
