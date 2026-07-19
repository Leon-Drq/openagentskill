'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, Braces, FileJson2, Menu, Plus, SearchCheck, ShieldCheck, Terminal, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { GitHubStarButton } from '@/components/github-star-button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useI18n } from '@/lib/i18n/context'
import { getBasePathname, getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/resolve', labelKey: 'resolve' },
  { href: '/skills', labelKey: 'skills' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/skill-packs', label: 'Packs' },
  { href: '/compare', label: 'Compare' },
  { href: '/api-docs', labelKey: 'apiDocs' },
  { href: '/docs', labelKey: 'docs' },
] as const

const agentItems: Array<{
  href: string
  label: string
  description: string
  icon: LucideIcon
  prefetch?: false
}> = [
  {
    href: '/resolve',
    label: 'Resolve Workbench',
    description: 'Task to skill plan',
    icon: SearchCheck,
  },
  {
    href: '/agent',
    label: 'Agent Entry',
    description: 'Low-noise registry map',
    icon: Braces,
  },
  {
    href: '/agent/integration-kit',
    label: 'Integration Kit',
    description: 'Codex, Claude, Cursor templates',
    icon: Braces,
  },
  {
    href: '/api/agent/tasks',
    label: 'Tasks API',
    description: 'Task catalog for agents',
    icon: Braces,
    prefetch: false,
  },
  {
    href: '/api-docs#agent-resolve',
    label: 'Resolve API',
    description: 'Turn a task into a safe install plan',
    icon: Braces,
  },
  {
    href: '/outcomes',
    label: 'Outcome Loop',
    description: 'Real agent success signals',
    icon: Activity,
  },
  {
    href: '/safety',
    label: 'Safety Gate',
    description: 'Verified, reviewed, experimental, blocked',
    icon: ShieldCheck,
  },
  {
    href: '/cli',
    label: 'CLI',
    description: 'Resolve and install from terminal',
    icon: Terminal,
  },
  {
    href: '/.well-known/agent-manifest.json',
    label: 'Agent Manifest',
    description: 'Machine-readable registry contract',
    icon: FileJson2,
    prefetch: false,
  },
  {
    href: '/api/agent/discovery',
    label: 'GitHub Discovery',
    description: 'Auto-import status',
    icon: Activity,
    prefetch: false,
  },
  {
    href: '/evals/resolve',
    label: 'Evals',
    description: 'Recommendation quality benchmark',
    icon: Activity,
  },
]

function isActivePath(pathname: string, href: string) {
  const baseHref = href.split('#')[0]
  const basePathname = getBasePathname(pathname)
  return basePathname === baseHref || basePathname.startsWith(`${baseHref}/`)
}

export function MobileNav() {
  const { t, locale } = useI18n()
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
    <div className="xl:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="-mr-2 flex h-10 w-10 items-center justify-center rounded-[8px] text-secondary transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Render through a portal so the overlay is not clipped by the sticky header. */}
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
              onClick={() => setIsOpen(false)}
              className="-mr-2 flex h-10 w-10 items-center justify-center rounded-[8px] text-secondary transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <nav
            className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col px-6 py-5"
            aria-label="Mobile navigation"
          >
            <div>
              <p className="mb-2 font-mono text-xs uppercase text-secondary">Browse</p>
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href)
                  const label = 'label' in item ? item.label : t.nav[item.labelKey]

                  return (
                    <li key={item.href}>
                      <Link
                        href={getLocalizedNavigationHref(item.href, locale)}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'flex items-center justify-between border-b border-border py-3 text-lg transition-colors',
                          active ? 'text-foreground' : 'text-secondary hover:text-foreground'
                        )}
                        aria-current={active ? 'page' : undefined}
                      >
                        {label}
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-[#006b4f]" aria-hidden="true" />}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="mt-5">
              <p className="mb-2 font-mono text-xs uppercase text-secondary">For Agents</p>
              <ul className="grid gap-2">
                {agentItems.map((item) => {
                  const active = isActivePath(pathname, item.href)
                  const Icon = item.icon

                  return (
                    <li key={item.href}>
                      <Link
                        href={getLocalizedNavigationHref(item.href, locale)}
                        prefetch={item.prefetch}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'flex gap-3 rounded-[8px] border border-border bg-card/70 p-3 transition-colors',
                          active ? 'border-[#006b4f]/50 text-foreground' : 'text-secondary hover:border-foreground/40 hover:text-foreground'
                        )}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-border bg-background text-foreground">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{item.label}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-secondary">{item.description}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="mt-auto pt-5">
              <div className="mb-3 flex items-center justify-between gap-4 border-t border-border pt-4">
                <span className="font-mono text-xs uppercase text-secondary">Language</span>
                <LanguageSwitcher />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href={getLocalizedNavigationHref('/submit', locale)}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-[8px] border border-border bg-card/70 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  Submit Skill
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
