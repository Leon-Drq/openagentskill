import { notFound } from 'next/navigation'
import LocalizedContent, { generateMetadata as metadata } from '@/app/[locale]/[page]/content'
import { isPublicCacheLocale } from '@/lib/public-cached-routing'
import { isLocalizedCorePageSlug } from '@/lib/i18n/market-routing'
import { I18nProvider } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/config'

export const revalidate = 900
export function generateStaticParams() { return [] }
type Props = { params: Promise<{ locale: string; page: string }> }
async function inputs(params: Props['params']) {
  const { locale, page } = await params
  if (!isPublicCacheLocale(locale) || locale === 'en' || page === 'skills' || !isLocalizedCorePageSlug(page)) notFound()
  return { locale: locale as Locale, params: Promise.resolve({ locale, page }), searchParams: Promise.resolve({ lang: locale }) }
}
export async function generateMetadata({ params }: Props) { return metadata(await inputs(params)) }
export default async function Page({ params }: Props) {
  const input = await inputs(params)
  return <I18nProvider initialLocale={input.locale}><LocalizedContent {...input} requireHealthy /></I18nProvider>
}
