import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SubmitPage from '@/app/submit/page'
import { MARKET_LOCALES, type MarketLocale } from '@/lib/i18n/market-routing'

const SITE_URL = 'https://www.openagentskill.com'

export const dynamicParams = false

export function generateStaticParams() {
  return MARKET_LOCALES.map((locale) => ({ locale }))
}

function getLocale(locale: string): MarketLocale | null {
  return MARKET_LOCALES.includes(locale as MarketLocale) ? (locale as MarketLocale) : null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const marketLocale = getLocale(locale)
  if (!marketLocale) return {}

  const canonical = `${SITE_URL}/${marketLocale}/submit`
  return {
    title: 'Submit an AI Agent Skill',
    description: 'Submit a reusable AI agent skill for review, trust scoring, and agent-readable installation discovery.',
    alternates: {
      canonical,
      languages: {
        en: `${SITE_URL}/submit`,
        'x-default': `${SITE_URL}/submit`,
        ...Object.fromEntries(MARKET_LOCALES.map((code) => [code, `${SITE_URL}/${code}/submit`])),
      },
    },
  }
}

export default async function LocalizedSubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!getLocale(locale)) notFound()

  return <SubmitPage />
}
