import Link from 'next/link'
import type { Locale } from '@/lib/i18n/config'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { getShowcaseTags, localizeShowcase } from '@/lib/showcase-shared'
import { ShowcasePriceBadge, showcaseTagClass } from './showcase-pricing'

/** One tag family on cards, home previews and the work detail page. */
export function ShowcaseTags({ item, locale }: { item: { slug: string; skillSlug: string }; locale: Locale }) {
  return <div className="mt-3 flex min-h-8 flex-wrap items-center gap-2" data-showcase-tags>
    <ShowcasePriceBadge slug={item.skillSlug} locale={locale} />
    {getShowcaseTags(item).map(tag => <Link key={tag.id} prefetch={false}
      href={getLocalizedNavigationHref(`/showcase?tag=${tag.id}`, locale)}
      className={`${showcaseTagClass} bg-[#f4f2ed] text-[#625d53] transition-colors hover:border-[#b8c8bb] hover:bg-[#eaf0e9] hover:text-[#006b4f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006b4f]`}>
      {localizeShowcase(tag.label, locale)}
    </Link>)}
  </div>
}
