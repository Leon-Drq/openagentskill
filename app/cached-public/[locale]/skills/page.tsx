import { notFound } from 'next/navigation'
import SkillsContent, { generateMetadata as englishMetadata } from '@/app/skills/content'
import { generateMetadata as localizedMetadata } from '@/app/[locale]/[page]/content'
import { isPublicCacheLocale } from '@/lib/public-cached-routing'
import { I18nProvider } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/config'

export const revalidate = 900
export function generateStaticParams() { return [] }
type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  if (!isPublicCacheLocale(locale)) notFound()
  return locale === 'en' ? englishMetadata({ searchParams: Promise.resolve({}) }) :
    localizedMetadata({ params: Promise.resolve({ locale, page: 'skills' }), searchParams: Promise.resolve({}) })
}

export default async function Page({ params }: Props) {
  const { locale } = await params
  if (!isPublicCacheLocale(locale)) notFound()
  return <I18nProvider initialLocale={locale as Locale}><SkillsContent searchParams={Promise.resolve({ lang: locale })} requireHealthy /></I18nProvider>
}
