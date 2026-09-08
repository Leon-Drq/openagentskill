'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { getShowcaseNavLabel } from '@/lib/i18n/showcase-label'
import { getNavigationCopy, navigationLabel, type NavigationLink } from '@/lib/site-navigation'

const hubs = {
  creators: [{ href: '/creator', label: 'creatorConsole' }, { href: '/creator-kit', label: 'creatorKit' }, { href: '/submit', label: 'submitSkill' }],
  rankings: [{ href: '/trending', label: 'trending' }, { href: '/skills', label: 'browseSkills' }],
  useCases: [{ href: '/tasks', label: 'tasks' }, { href: '/skill-packs', label: 'packs' }, { href: '/compare', label: 'compare' }],
  developers: [{ href: '/agent/integration-kit', label: 'integrationKit' }, { href: '/safety', label: 'safety' }, { href: '/outcomes', label: 'outcomes' }],
} satisfies Record<string, NavigationLink[]>
export function NavigationHubLinks({ hub }: { hub: keyof typeof hubs }) {
  const { t, locale } = useI18n()
  return <nav aria-label={getNavigationCopy(locale).more} className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-3 border-b border-border px-6 py-5 text-sm text-secondary">
    {hubs[hub].map(link => <Link key={link.href} href={getLocalizedNavigationHref(link.href, locale)} prefetch={false} className="underline underline-offset-4 hover:text-foreground">
      {navigationLabel(link, locale, t.nav, getShowcaseNavLabel(locale))}
    </Link>)}
  </nav>
}
