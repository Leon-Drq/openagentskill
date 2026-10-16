import { notFound } from 'next/navigation'
import SkillsContent, { generateMetadata as englishMetadata } from '@/app/skills/content'
import { generateMetadata as localizedMetadata } from '@/app/[locale]/[page]/content'
import { isPublicCacheLocale } from '@/lib/public-cached-routing'
import { parseDirectoryBrowseVariant } from '@/lib/skills/browse-cache'
import { I18nProvider } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/config'

export const revalidate = 900
export function generateStaticParams() { return [] }
type Props = { params: Promise<{ locale: string; variant: string }> }

async function inputs(params: Props['params']) {
  const { locale, variant: key } = await params
  const variant = parseDirectoryBrowseVariant(key)
  if (!isPublicCacheLocale(locale) || !variant) notFound()
  return { locale: locale as Locale, query: { ...variant.params, lang: locale } }
}

export async function generateMetadata({ params }: Props) {
  const { locale, query } = await inputs(params)
  return locale === 'en' ? englishMetadata({ searchParams: Promise.resolve(query) }) :
    localizedMetadata({ params: Promise.resolve({ locale, page: 'skills' }), searchParams: Promise.resolve(query) })
}

export default async function Page({ params }: Props) {
  const { locale, query } = await inputs(params)
  return <I18nProvider initialLocale={locale}><SkillsContent searchParams={Promise.resolve(query)} requireHealthy /></I18nProvider>
}
