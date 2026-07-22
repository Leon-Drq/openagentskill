import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CollectionDetailPage from '@/app/collections/[slug]/page'
import { getSkillStackBySlug, SKILL_STACKS } from '@/lib/collections'
import { getLocalizedCollectionContent } from '@/lib/i18n/curated-content'
import { MARKET_LOCALES, type MarketLocale } from '@/lib/i18n/market-routing'

const SITE_URL = 'https://www.openagentskill.com'

export const dynamicParams = false

export function generateStaticParams() {
  return MARKET_LOCALES.flatMap((locale) => SKILL_STACKS.map((stack) => ({ locale, slug: stack.slug })))
}

function getRoute(locale: string, slug: string) {
  if (!MARKET_LOCALES.includes(locale as MarketLocale)) return null
  if (!getSkillStackBySlug(slug)) return null
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

  const stack = getSkillStackBySlug(route.slug)
  if (!stack) return {}
  const localizedStack = getLocalizedCollectionContent(route.locale, stack)
  const canonical = `${SITE_URL}/${route.locale}/collections/${route.slug}`

  return {
    title: localizedStack.title,
    description: localizedStack.description,
    other: { 'content-language': route.locale },
    alternates: {
      canonical,
      languages: {
        en: `${SITE_URL}/collections/${route.slug}`,
        'x-default': `${SITE_URL}/collections/${route.slug}`,
        ...Object.fromEntries(MARKET_LOCALES.map((code) => [code, `${SITE_URL}/${code}/collections/${route.slug}`])),
      },
    },
    openGraph: {
      title: `${localizedStack.title} - OpenAgentSkill`,
      description: localizedStack.description,
      url: canonical,
      type: 'article',
    },
  }
}

export default async function LocalizedCollectionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const route = getRoute(locale, slug)
  if (!route) notFound()

  return (
    <CollectionDetailPage
      params={Promise.resolve({ slug: route.slug })}
      searchParams={Promise.resolve({ lang: route.locale })}
    />
  )
}
