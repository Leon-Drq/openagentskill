'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'

export function MobileNav() {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 -mr-2 text-secondary hover:text-foreground transition-colors"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-[#F8F7F3] dark:bg-[#1a1a1a] border-l border-border shadow-xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-[#F8F7F3] dark:bg-[#1a1a1a]">
          <span className="font-display font-semibold text-sm">Menu</span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-secondary hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 bg-[#F8F7F3] dark:bg-[#1a1a1a] h-full">
          <ul className="space-y-1">
            <li>
              <Link
                href="/skills"
                className={`block py-3 px-3 text-sm font-serif rounded transition-colors ${
                  pathname === '/skills' ? 'bg-muted text-foreground' : 'text-secondary hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {t.nav.skills}
              </Link>
            </li>
            <li>
              <Link
                href="/submit"
                className={`block py-3 px-3 text-sm font-serif rounded transition-colors ${
                  pathname === '/submit' ? 'bg-muted text-foreground' : 'text-secondary hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {t.nav.submit}
              </Link>
            </li>
            <li>
              <Link
                href="/docs"
                className={`block py-3 px-3 text-sm font-serif rounded transition-colors ${
                  pathname === '/docs' ? 'bg-muted text-foreground' : 'text-secondary hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {t.nav.docs}
              </Link>
            </li>
            <li>
              <Link
                href="/activity"
                className={`block py-3 px-3 text-sm font-serif rounded transition-colors ${
                  pathname === '/activity' ? 'bg-muted text-foreground' : 'text-secondary hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {t.nav.activity}
              </Link>
            </li>
          </ul>

          {/* Divider */}
          <div className="my-4 border-t border-border" />

          {/* External Links */}
          <ul className="space-y-1">
            <li>
              <a
                href="https://github.com/Leon-Drq/openagentskill"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 py-3 px-3 text-sm font-serif text-secondary hover:text-foreground hover:bg-muted/50 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a
                href="https://twitter.com/drq_ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 py-3 px-3 text-sm font-serif text-secondary hover:text-foreground hover:bg-muted/50 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Twitter
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}
