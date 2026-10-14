import { notFound } from 'next/navigation'
import { ContactContent, SponsorContent } from '@/components/partnership-pages'
import { partnershipPageData } from '@/lib/seo/partnerships'
import { isPublicCacheLocale } from '@/lib/public-cached-routing'

export const revalidate = 86400
export function generateStaticParams() { return [] }
type Props = { params: Promise<{ locale: string; page: string }> }
async function data(params: Props['params']) {
  const { locale, page: target } = await params
  const variant = target.endsWith('-variant')
  const page = variant ? target.slice(0, -8) : target
  if (!isPublicCacheLocale(locale) || (page !== 'contact' && page !== 'sponsor') || (variant && locale !== 'en')) notFound()
  // Keep canonical English metadata indexable; translated query URLs stay noindex.
  return { page, ...await partnershipPageData(page, { searchParams: Promise.resolve(locale === 'en' && !variant ? {} : { lang: locale }) }) }
}
export async function generateMetadata({ params }: Props) { return (await data(params)).metadata }
export default async function Page({ params }: Props) {
  const { page, locale, schema } = await data(params)
  return page === 'contact' ? <ContactContent locale={locale} schema={schema} /> : <SponsorContent locale={locale} schema={schema} />
}
