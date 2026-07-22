'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Activity, BookOpenText, Bot, Braces, ChevronDown, FileJson2, Plus, SearchCheck, ShieldCheck, Terminal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { GitHubStarButton } from '@/components/github-star-button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { MobileNav } from '@/components/mobile-nav'
import { useI18n } from '@/lib/i18n/context'
import { getBasePathname, getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { cn } from '@/lib/utils'

const primaryNavItems = [
  { href: '/resolve', labelKey: 'resolve' },
  { href: '/skills', labelKey: 'skills' },
  { href: '/tasks', labelKey: 'tasks' },
  { href: '/skill-packs', labelKey: 'packs' },
  { href: '/compare', labelKey: 'compare' },
] as const

const resourceItems = [
  { href: '/docs', labelKey: 'docs', icon: BookOpenText },
  { href: '/api-docs', labelKey: 'apiDocs', icon: Braces },
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
    description: 'Start here',
    icon: Bot,
  },
  {
    href: '/agent/integration-kit',
    label: 'Integration Kit',
    description: 'Codex, Claude, Cursor',
    icon: Braces,
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
    href: '/outcomes',
    label: 'Outcome Loop',
    description: 'Real agent success signals',
    icon: Activity,
  },
  {
    href: '/safety',
    label: 'Safety Gate',
    description: 'Trust policy',
    icon: ShieldCheck,
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
    href: '/evals/resolve',
    label: 'Evals',
    description: 'Recommendation benchmark',
    icon: Activity,
  },
]

function isActivePath(pathname: string, href: string) {
  const baseHref = href.split('#')[0]
  const basePathname = getBasePathname(pathname)
  return basePathname === baseHref || basePathname.startsWith(`${baseHref}/`)
}

function ForAgentsDropdown({ pathname }: { pathname: string }) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const active = agentItems.some((item) => isActivePath(pathname, item.href))

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
          'flex h-16 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-2.5 text-sm text-secondary transition-colors hover:text-foreground',
          active && 'border-[#006b4f] text-foreground'
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bot className="h-3.5 w-3.5" aria-hidden="true" />
        {t.nav.forAgents}
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
                  href={getLocalizedNavigationHref(item.href, locale)}
                  prefetch={false}
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

function ResourcesDropdown({ pathname }: { pathname: string }) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const active = resourceItems.some((item) => isActivePath(pathname, item.href))

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
          'flex h-16 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-2.5 text-sm text-secondary transition-colors hover:text-foreground',
          active && 'border-[#006b4f] text-foreground'
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {t.nav.docs}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%-1px)] z-50 w-48 overflow-hidden rounded-[8px] border border-border bg-background p-1.5 shadow-[0_18px_55px_rgba(29,27,24,0.12)]"
        >
          {resourceItems.map((item) => {
            const Icon = item.icon
            const itemActive = isActivePath(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={getLocalizedNavigationHref(item.href, locale)}
                prefetch={false}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 rounded-[6px] px-3 py-2.5 text-sm transition-colors',
                  itemActive ? 'bg-muted text-foreground' : 'text-secondary hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="font-medium">{t.nav[item.labelKey]}</span>
              </Link>
            )
          })}
        </div>
      )}
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
        <Link prefetch={false} href={getLocalizedNavigationHref('/', locale)} className="flex min-w-0 shrink-0 items-center gap-2.5 transition-opacity hover:opacity-70">
          <BrandMark className="h-7 w-7 text-foreground" />
          <span className="hidden truncate font-sans text-base font-semibold sm:inline sm:text-lg">
            OpenAgentSkill
          </span>
          <span className="hidden rounded-[6px] border border-border px-2 py-0.5 font-mono text-[10px] uppercase text-secondary md:inline-flex">
            Registry
          </span>
        </Link>

        <nav className="hidden h-full min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex" aria-label="Primary navigation">
            {primaryNavItems.map((item) => {
              const active = isActivePath(pathname, item.href)
              const label = t.nav[item.labelKey]
              const href = getLocalizedNavigationHref(item.href, locale)

              return (
                <Link
                  key={item.href}
                  href={href}
                  prefetch={false}
                  onPointerEnter={() => warmRoute(href)}
                  onFocus={() => warmRoute(href)}
                  className={cn(
                    'flex h-16 shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-2 text-sm transition-colors',
                    active ? 'border-[#006b4f] text-foreground' : 'text-secondary hover:text-foreground'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {label}
                </Link>
              )
            })}
            <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
            <ResourcesDropdown pathname={pathname} />
            <ForAgentsDropdown pathname={pathname} />
        </nav>

        <div className="ml-auto flex h-full shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-2 xl:flex">
            <GitHubStarButton />
            <Link
              href={getLocalizedNavigationHref('/submit', locale)}
              prefetch={false}
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
