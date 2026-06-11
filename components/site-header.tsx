'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, Bot, Braces, ChevronDown, FileJson2, Github, Plus, Terminal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { LanguageSwitcher } from '@/components/language-switcher'
import { MobileNav } from '@/components/mobile-nav'
import { NavUserMenu } from '@/components/nav-user-menu'
import { useI18n } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

const primaryNavItems = [
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
    href: '/agent',
    label: 'Agent Entry',
    description: 'Start here',
    icon: Bot,
  },
  {
    href: '/api/agent/tasks',
    label: 'Tasks API',
    description: 'Jobs to routes',
    icon: Braces,
    prefetch: false,
  },
  {
    href: '/api-docs#agent-resolve',
    label: 'Resolve API',
    description: 'Task to skill plan',
    icon: Braces,
  },
  {
    href: '/cli',
    label: 'CLI',
    description: 'Terminal handoffs',
    icon: Terminal,
  },
  {
    href: '/.well-known/agent-manifest.json',
    label: 'Manifest',
    description: 'Machine-readable contract',
    icon: FileJson2,
    prefetch: false,
  },
  {
    href: '/openapi.json',
    label: 'OpenAPI',
    description: 'Tool schema',
    icon: FileJson2,
    prefetch: false,
  },
  {
    href: '/api/agent/discovery',
    label: 'Discovery',
    description: 'GitHub indexer status',
    icon: Activity,
    prefetch: false,
  },
  {
    href: '/api/agent/evals',
    label: 'Evals',
    description: 'Recommendation benchmark',
    icon: Activity,
    prefetch: false,
  },
]

function isActivePath(pathname: string, href: string) {
  const baseHref = href.split('#')[0]
  return pathname === baseHref || pathname.startsWith(`${baseHref}/`)
}

function ForAgentsDropdown({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false)
  const active = pathname === '/cli'

  return (
    <div
      className="relative h-full"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-16 items-center gap-1.5 border-b-2 border-transparent px-2.5 text-sm text-secondary transition-colors hover:text-foreground',
          active && 'border-[#006b4f] text-foreground'
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bot className="h-3.5 w-3.5" aria-hidden="true" />
        For Agents
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%-1px)] z-50 w-[330px] overflow-hidden rounded-[8px] border border-border bg-background shadow-[0_18px_55px_rgba(29,27,24,0.12)]"
        >
          <div className="border-b border-border bg-muted/35 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Agent registry surfaces</p>
            <p className="mt-1 text-xs leading-5 text-secondary">Resolve, install, and audit skills without opening the directory UI.</p>
          </div>
          <div className="grid p-1.5">
            {agentItems.map((item) => {
              const Icon = item.icon
              const itemActive = isActivePath(pathname, item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={item.prefetch}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex gap-3 rounded-[6px] px-3 py-3 text-left transition-colors',
                    itemActive ? 'bg-muted text-foreground' : 'text-secondary hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-border bg-card text-foreground">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-secondary">{item.description}</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function SiteHeader() {
  const { t } = useI18n()
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/82">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5 transition-opacity hover:opacity-70">
          <BrandMark className="h-7 w-7 text-foreground" />
          <span className="hidden truncate font-sans text-base font-semibold sm:inline sm:text-lg">
            OpenAgentSkill
          </span>
          <span className="hidden rounded-[6px] border border-border px-2 py-0.5 font-mono text-[10px] uppercase text-secondary md:inline-flex">
            Registry
          </span>
        </Link>

        <div className="flex h-full items-center gap-2 sm:gap-3">
          <nav className="hidden h-full items-center gap-1 lg:flex" aria-label="Primary navigation">
            {primaryNavItems.map((item) => {
              const active = isActivePath(pathname, item.href)
              const label = 'label' in item ? item.label : t.nav[item.labelKey]

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex h-16 items-center border-b-2 border-transparent px-2.5 text-sm transition-colors',
                    active ? 'border-[#006b4f] text-foreground' : 'text-secondary hover:text-foreground'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                </Link>
              )
            })}
            <ForAgentsDropdown pathname={pathname} />
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <a
              href="https://github.com/Leon-Drq/openagentskill"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-border text-secondary transition-colors hover:border-foreground/40 hover:text-foreground"
              aria-label="OpenAgentSkill on GitHub"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link
              href="/submit"
              className="hidden h-9 items-center gap-2 rounded-[8px] bg-[#006b4f] px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 md:flex"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Submit Skill
            </Link>
          </div>

          <NavUserMenu />
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
