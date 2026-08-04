import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LocalizedCorePage } from '@/components/localized-core-page'
import { getMarketCorePageMeta } from '@/lib/i18n/market-core-pages'
import {
  getLocalizedCorePath,
  isLocalizedCorePageSlug,
  LOCALIZED_CORE_PAGE_SLUGS,
  MARKET_LOCALES,
  type LocalizedCorePageSlug,
  type MarketLocale,
} from '@/lib/i18n/market-routing'
import { getLocalizedCoreLanguageAlternates } from '@/lib/seo/localized-pages'
import { getSearchMetadataCopy } from '@/lib/seo/search-metadata'

const SITE_URL = 'https://www.openagentskill.com'

export const revalidate = 300
export const dynamicParams = false

export function generateStaticParams() {
  return MARKET_LOCALES.flatMap((locale) =>
    LOCALIZED_CORE_PAGE_SLUGS.map((page) => ({ locale, page }))
  )
}

function getRoute(locale: string, page: string) {
  if (!MARKET_LOCALES.includes(locale as MarketLocale)) return null
  if (!isLocalizedCorePageSlug(page)) return null
  return {
    locale: locale as MarketLocale,
    page: page as LocalizedCorePageSlug,
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; page: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const [{ locale, page }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const route = getRoute(locale, page)
  if (!route) return {}

  const directoryCopy = route.page === 'skills' ? getSearchMetadataCopy(route.locale) : null
  const coreCopy = getMarketCorePageMeta(route.locale, route.page)
  const title = directoryCopy?.directoryTitle || coreCopy.title
  const description = directoryCopy?.directoryDescription || coreCopy.description
  const canonical = `${SITE_URL}${getLocalizedCorePath(route.locale, route.page)}`
  const hasSearchVariant = Object.values(resolvedSearchParams).some((value) => {
    const normalized = Array.isArray(value) ? value[0] : value
    return Boolean(normalized?.trim())
  })

  return {
    title,
    description,
    other: {
      'content-language': directoryCopy?.htmlLanguage || route.locale,
    },
    alternates: {
      canonical,
      ...(hasSearchVariant ? {} : { languages: getLocalizedCoreLanguageAlternates(route.page) }),
    },
    robots: {
      index: !hasSearchVariant,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'OpenAgentSkill',
      locale: directoryCopy?.openGraphLocale || route.locale,
      type: 'website',
      images: [
        {
          url: 'https://www.openagentskill.com/opengraph-image?v=3',
          width: 1200,
          height: 630,
          alt: title,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://www.openagentskill.com/opengraph-image?v=3'],
    },
  }
}

export default async function LocalizedCoreRoutePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; page: string }>
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const [{ locale, page }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const route = getRoute(locale, page)
  if (!route) notFound()

  const queryValue = resolvedSearchParams.q
  const query = Array.isArray(queryValue) ? queryValue[0] : queryValue

  return <LocalizedCorePage locale={route.locale} page={route.page} query={query} />
}
