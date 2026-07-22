import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SkillPackDetailPage from '@/app/skill-packs/[slug]/page'
import { getLocalizedPackContent } from '@/lib/i18n/curated-content'
import { MARKET_LOCALES, type MarketLocale } from '@/lib/i18n/market-routing'
import { getSkillPackBySlug, SKILL_PACKS } from '@/lib/skill-packs'

const SITE_URL = 'https://www.openagentskill.com'

export const dynamicParams = false

export function generateStaticParams() {
  return MARKET_LOCALES.flatMap((locale) => SKILL_PACKS.map((pack) => ({ locale, slug: pack.slug })))
}

function getRoute(locale: string, slug: string) {
  if (!MARKET_LOCALES.includes(locale as MarketLocale)) return null
  if (!getSkillPackBySlug(slug)) return null
  return { locale: locale as MarketLocale, slug }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const route = getRoute(locale, slug)
  if (!route) return {}

  const pack = getSkillPackBySlug(route.slug)
  if (!pack) return {}
  const localizedPack = getLocalizedPackContent(route.locale, pack)
  const canonical = `${SITE_URL}/${route.locale}/skill-packs/${route.slug}`

  return {
    title: localizedPack.title,
    description: localizedPack.description,
    other: { 'content-language': route.locale },
    alternates: {
      canonical,
      languages: {
        en: `${SITE_URL}/skill-packs/${route.slug}`,
        'x-default': `${SITE_URL}/skill-packs/${route.slug}`,
        ...Object.fromEntries(MARKET_LOCALES.map((code) => [code, `${SITE_URL}/${code}/skill-packs/${route.slug}`])),
      },
    },
    openGraph: {
      title: `${localizedPack.title} - OpenAgentSkill`,
      description: localizedPack.description,
      url: canonical,
      type: 'website',
    },
  }
}

export default async function LocalizedSkillPackDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const route = getRoute(locale, slug)
  if (!route) notFound()

  return (
    <SkillPackDetailPage
      params={Promise.resolve({ slug: route.slug })}
      searchParams={Promise.resolve({ lang: route.locale })}
    />
  )
}
