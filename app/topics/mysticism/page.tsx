import { permanentRedirect } from 'next/navigation'
import { getLocaleFromSearchParam, getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { MYSTICISM_USE_CASE } from '@/lib/mysticism-collection'

// Retain the briefly published address without a second competing landing page.
export default async function LegacyMysticismTopic({ searchParams }: {
  searchParams: Promise<{ lang?: string | string[] }>
}) {
  const locale = getLocaleFromSearchParam((await searchParams).lang)
  permanentRedirect(getLocalizedNavigationHref(`/use-cases/${MYSTICISM_USE_CASE}`, locale))
}
