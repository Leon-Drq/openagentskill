import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LocalizedCorePage } from '@/components/localized-core-page'
import { getMarketCorePageMeta } from '@/lib/i18n/market-core-pages'
import {
  getLocalizedCorePath,
  isLocalizedCorePageSlug,
  MARKET_LOCALES,
  type LocalizedCorePageSlug,
  type MarketLocale,
} from '@/lib/i18n/market-routing'
import { getLocalizedCoreLanguageAlternates } from '@/lib/seo/localized-pages'

const SITE_URL = 'https://www.openagentskill.com'

export const revalidate = 300
export const dynamicParams = false

export function generateStaticParams() {
  return MARKET_LOCALES.flatMap((locale) =>
    ['resolve', 'skills', 'agent-skill', 'agent-skills-registry', 'docs'].map((page) => ({ locale, page }))
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
}: {
  params: Promise<{ locale: string; page: string }>
}): Promise<Metadata> {
  const { locale, page } = await params
  const route = getRoute(locale, page)
  if (!route) return {}

  const copy = getMarketCorePageMeta(route.locale, route.page)
  const canonical = `${SITE_URL}${getLocalizedCorePath(route.locale, route.page)}`

  return {
    title: copy.title,
    description: copy.description,
    other: {
      'content-language': route.locale,
    },
    alternates: {
      canonical,
      languages: getLocalizedCoreLanguageAlternates(route.page),
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonical,
      siteName: 'OpenAgentSkill',
      locale: route.locale,
      type: 'website',
      images: [
        {
          url: 'https://www.openagentskill.com/opengraph-image?v=3',
          width: 1200,
          height: 630,
          alt: copy.title,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description,
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
