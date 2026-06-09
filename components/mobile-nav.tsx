'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', labelKey: 'home', exact: true },
  { href: '/skills', labelKey: 'skills' },
  { href: '/use-cases', label: 'Use Cases' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/collections', label: 'Stacks' },
  { href: '/guides', label: 'Guides' },
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

export function MobileNav() {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Prevent body scroll when menu is open (lock both html and body for iOS Safari)
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
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 -mr-2 text-secondary hover:text-foreground transition-colors"
        aria-label="Open menu"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Render through a portal so the overlay is not clipped by the sticky header. */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 overflow-y-auto bg-background"
          style={{ zIndex: 9999 }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <span className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <span className="flex h-7 w-7 items-center justify-center border border-foreground text-sm leading-none">
                O
              </span>
              OpenAgentSkill
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 -mr-2 text-secondary hover:text-foreground transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="px-6 py-8">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href, 'exact' in item ? item.exact : false)
                const label = 'label' in item ? item.label : t.nav[item.labelKey]

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'block py-4 text-xl transition-colors',
                        active ? 'font-medium text-foreground' : 'text-secondary hover:text-foreground'
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>

            <div className="my-8 border-t border-border" />

            <ul className="space-y-1">
              <li>
                <a
                  href="https://github.com/Leon-Drq/openagentskill"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-4 text-xl text-secondary hover:text-foreground transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/openagentskill"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-4 text-xl text-secondary hover:text-foreground transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X
                </a>
              </li>
            </ul>
          </nav>
        </div>,
        document.body
      )}
    </div>
  )
}
