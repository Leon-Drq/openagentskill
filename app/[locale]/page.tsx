import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { HomePageEnhanced } from '@/components/home-page-enhanced'
import type { Locale } from '@/lib/i18n/config'
import { getHomePageData } from '@/lib/home-page-data'
import {
  LOCALIZED_LANDING_PAGES,
  type LocalizedLandingPageCode,
  getLocalizedLanguageAlternates,
} from '@/lib/seo/localized-pages'

export const dynamic = 'force-dynamic'
export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(LOCALIZED_LANDING_PAGES).map((locale) => ({ locale }))
}

function getPage(locale: string) {
  if (locale in LOCALIZED_LANDING_PAGES) {
    return LOCALIZED_LANDING_PAGES[locale as LocalizedLandingPageCode]
  }
  return null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const page = getPage(locale)
  if (!page) return {}

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: `https://www.openagentskill.com/${locale}`,
      languages: getLocalizedLanguageAlternates(),
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `https://www.openagentskill.com/${locale}`,
      siteName: 'OpenAgentSkill',
      locale: page.lang,
      type: 'website',
      images: [
        {
          url: 'https://www.openagentskill.com/opengraph-image?v=3',
          width: 1200,
          height: 630,
          alt: page.title,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
      images: ['https://www.openagentskill.com/opengraph-image?v=3'],
    },
  }
}

export default async function LocalizedHomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const page = getPage(locale)
  if (!page) notFound()

  const { stats, activities, featuredSkills } = await getHomePageData()

  return (
    <HomePageEnhanced
      initialLocale={locale as Locale}
      stats={stats}
      activities={activities}
      featuredSkills={featuredSkills}
    />
  )
}
