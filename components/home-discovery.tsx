import Link from '@/components/crawl-link'
import { ArrowRight } from 'lucide-react'
import { DISCOVERY_TASKS, discoveryCopy } from '@/lib/discovery'
import type { Locale } from '@/lib/i18n/config'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'

// Server-rendered topic links connect the homepage to the existing SEO hubs.
export function HomeDiscovery({ locale }: { locale: Locale }) {
  const c = discoveryCopy(locale)
  return <section className="border-b border-[#e4e0d8] bg-[#fbfaf6] px-6 py-14 md:py-20" aria-labelledby="home-discovery-title">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#006b4f]">{c.categories}</p>
          <h2 id="home-discovery-title" className="mt-3 font-display text-3xl font-normal tracking-tight md:text-5xl">{c.explore}</h2>
          <p className="mt-4 text-sm text-secondary">{c.taskNote}</p>
        </div>
        <Link href={getLocalizedNavigationHref('/skills', locale)} prefetch={false} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#006b4f]">{c.browse}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DISCOVERY_TASKS.map(item => <li key={item.id}>
          <Link href={getLocalizedNavigationHref(item.href, locale)} prefetch={false} className="flex min-h-24 items-center justify-between gap-4 rounded-[12px] border border-[#e4e0d8] bg-background/60 px-5 py-4 text-sm font-medium transition-colors hover:border-[#006b4f]/50 hover:text-[#006b4f]">
            {item.label[locale]}<ArrowRight className="h-4 w-4 shrink-0 text-[#006b4f]" aria-hidden="true" />
          </Link>
        </li>)}
      </ul>
    </div>
  </section>
}
