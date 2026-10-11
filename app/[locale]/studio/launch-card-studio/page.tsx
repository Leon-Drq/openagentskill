import { notFound } from 'next/navigation'
import { StudioSkillPage } from '@/components/studio/studio-pages'
import { isLocale } from '@/lib/i18n/config'
import { MARKET_LOCALES } from '@/lib/i18n/market-routing'
import { studioMetadata } from '@/lib/studio/seo'
export const dynamicParams = false
export function generateStaticParams() { return MARKET_LOCALES.map(locale => ({ locale })) }
type Props = { params: Promise<{ locale: string }> }
export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale) || locale === 'en') notFound()
  return studioMetadata(locale, 'skill')
}
export default async function Page({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale) || locale === 'en') notFound()
  return <StudioSkillPage locale={locale} />
}
