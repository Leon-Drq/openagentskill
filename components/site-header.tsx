'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  BookOpenText,
  Bot,
  Braces,
  ChevronDown,
  GitCompareArrows,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  Newspaper,
  Package,
  Plus,
  ShieldCheck,
  Sparkles,
  Terminal,
  TrendingUp,
  Trophy,
  UserRound,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { GitHubStarButton } from '@/components/github-star-button'
import { LanguageSwitcher } from '@/components/language-switcher'
import { MobileNav } from '@/components/mobile-nav'
import { useI18n } from '@/lib/i18n/context'
import { getBasePathname, getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { cn } from '@/lib/utils'

type NavLabelKey =
  | 'skills'
  | 'browseSkills'
  | 'trending'
  | 'rankings'
  | 'tasks'
  | 'packs'
  | 'compare'
  | 'aiSkillFinder'
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
  | 'docs'

type NavItem = {
  href: string
  labelKey: NavLabelKey
  icon: LucideIcon
  prefetch?: false
}

const skillsItems: NavItem[] = [
  { href: '/skills', labelKey: 'browseSkills', icon: LayoutGrid },
  { href: '/trending', labelKey: 'trending', icon: TrendingUp },
  { href: '/rankings', labelKey: 'rankings', icon: Trophy },
  { href: '/tasks', labelKey: 'tasks', icon: ListChecks },
  { href: '/skill-packs', labelKey: 'packs', icon: Package },
  { href: '/compare', labelKey: 'compare', icon: GitCompareArrows },
]

const agentItems: NavItem[] = [
  { href: '/agent', labelKey: 'agentEntry', icon: Bot },
  { href: '/agent/integration-kit', labelKey: 'integrationKit', icon: Braces },
  { href: '/api-docs', labelKey: 'apiDocs', icon: Braces },
  { href: '/cli', labelKey: 'cli', icon: Terminal },
  { href: '/safety', labelKey: 'safety', icon: ShieldCheck },
  { href: '/outcomes', labelKey: 'outcomes', icon: Activity },
]

const creatorItems: NavItem[] = [
  { href: '/submit', labelKey: 'submitSkill', icon: Plus },
  { href: '/creator', labelKey: 'creatorConsole', icon: UserRound },
  { href: '/creator-kit', labelKey: 'creatorKit', icon: Wrench },
]

const learnItems: NavItem[] = [
  { href: '/guides', labelKey: 'guides', icon: GraduationCap },
  { href: '/blog', labelKey: 'blog', icon: Newspaper },
  { href: '/use-cases', labelKey: 'useCases', icon: Sparkles },
]

function isActivePath(pathname: string, href: string) {
  const baseHref = href.split('#')[0]
  const basePathname = getBasePathname(pathname)
  return basePathname === baseHref || basePathname.startsWith(`${baseHref}/`)
}

function NavDropdown({
  pathname,
  labelKey,
  items,
}: {
  pathname: string
  labelKey: NavLabelKey
  items: NavItem[]
}) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const active = items.some((item) => isActivePath(pathname, item.href))

  const warmRoute = (href: string) => {
    router.prefetch(href)
  }

  return (
    <div
      className="relative h-full"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setOpen(false)
          event.currentTarget.querySelector<HTMLButtonElement>('button')?.focus()
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-16 items-center gap-1 whitespace-nowrap border-b-2 border-transparent px-2 text-sm text-secondary transition-colors hover:text-foreground',
          active && 'border-[#006b4f] text-foreground'
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {t.nav[labelKey]}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      <div
        role="menu"
        aria-label={t.nav[labelKey]}
        aria-hidden={!open}
        className={cn(
          'absolute left-0 top-[calc(100%-1px)] z-50 w-64 overflow-hidden rounded-[8px] border border-border bg-background p-1.5 shadow-[0_18px_55px_rgba(29,27,24,0.12)] transition-[opacity,transform,visibility] duration-150',
          open
            ? 'visible translate-y-0 opacity-100'
            : 'pointer-events-none invisible -translate-y-1 opacity-0'
        )}
      >
        {items.map((item) => {
          const Icon = item.icon
          const itemActive = isActivePath(pathname, item.href)
          const href = getLocalizedNavigationHref(item.href, locale)

          return (
            <Link
              key={item.href}
              href={href}
              prefetch={item.prefetch}
              role="menuitem"
              tabIndex={open ? 0 : -1}
              onPointerEnter={() => warmRoute(href)}
              onPointerDown={() => warmRoute(href)}
              onFocus={() => warmRoute(href)}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-sm transition-colors',
                itemActive ? 'bg-muted text-foreground' : 'text-secondary hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-border bg-card text-foreground">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-medium">{t.nav[item.labelKey]}</span>
            </Link>
          )
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

  const resolveHref = getLocalizedNavigationHref('/resolve', locale)
  const docsHref = getLocalizedNavigationHref('/docs', locale)

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

        <nav className="hidden h-full min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex" aria-label="Primary navigation">
          <NavDropdown pathname={pathname} labelKey="skills" items={skillsItems} />

          <Link
            href={resolveHref}
            prefetch={false}
            onPointerEnter={() => warmRoute(resolveHref)}
            onPointerDown={() => warmRoute(resolveHref)}
            onFocus={() => warmRoute(resolveHref)}
            className={cn(
              'flex h-16 shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-2 text-sm transition-colors',
              isActivePath(pathname, '/resolve') ? 'border-[#006b4f] text-foreground' : 'text-secondary hover:text-foreground'
            )}
            aria-current={isActivePath(pathname, '/resolve') ? 'page' : undefined}
          >
            {t.nav.aiSkillFinder}
          </Link>

          <NavDropdown pathname={pathname} labelKey="forAgents" items={agentItems} />
          <NavDropdown pathname={pathname} labelKey="forCreators" items={creatorItems} />
          <NavDropdown pathname={pathname} labelKey="learn" items={learnItems} />

          <Link
            href={docsHref}
            prefetch={false}
            onPointerEnter={() => warmRoute(docsHref)}
            onPointerDown={() => warmRoute(docsHref)}
            onFocus={() => warmRoute(docsHref)}
            className={cn(
              'flex h-16 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-2 text-sm transition-colors',
              isActivePath(pathname, '/docs') ? 'border-[#006b4f] text-foreground' : 'text-secondary hover:text-foreground'
            )}
            aria-current={isActivePath(pathname, '/docs') ? 'page' : undefined}
          >
            <BookOpenText className="h-3.5 w-3.5" aria-hidden="true" />
            {t.nav.docs}
          </Link>
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
