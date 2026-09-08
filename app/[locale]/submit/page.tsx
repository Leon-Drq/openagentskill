import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SubmitPage from '@/app/submit/page'
import { I18nProvider } from '@/lib/i18n/context'
import { submissionCopy } from '@/lib/i18n/submission-copy'
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
    title: submissionCopy(marketLocale, 'Paste one link. Make your skill discoverable.', '粘贴一个链接，让 Skill 被发现'),
    description: submissionCopy(marketLocale, 'Repository, subdirectory, and SKILL.md URLs are supported. We save first and review asynchronously—no star, README, category, or tag gate.', '支持仓库、子目录和 SKILL.md 链接。先保存，再异步审核；不要求 Star、README、分类或标签。'),
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
  const marketLocale = getLocale(locale)
  if (!marketLocale) notFound()

  // The root layout cannot reliably infer nested dynamic segments during SSR.
  // Seed this client page with the route locale so its first render matches the
  // selected language instead of briefly rendering the English fallback.
  return (
    <I18nProvider initialLocale={marketLocale}>
      <SubmitPage />
    </I18nProvider>
  )
}
