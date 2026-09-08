import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ShowcaseDetail } from '@/components/showcase-detail'
import { I18nProvider } from '@/lib/i18n/context'
import { getLocaleFromSearchParam } from '@/lib/i18n/config'
import { getShowcaseCase, getShowcaseCreator, getShowcaseSkill, localizeShowcase, SHOWCASE_CASES } from '@/lib/showcase'

const BASE_URL = 'https://www.openagentskill.com'
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

// Enumerate curated routes; the proxy also rejects unknown URLs before streaming.
export const dynamicParams = false
export function generateStaticParams() {
  return SHOWCASE_CASES.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const item = getShowcaseCase(slug)
  if (!item) notFound()
  const locale = getLocaleFromSearchParam(query.lang) || 'en'
  const title = `${localizeShowcase(item.title, locale)} — ${getShowcaseSkill(item.skillSlug).name} | OpenAgentSkill`
  const description = localizeShowcase(item.description, locale)
  const url = `${BASE_URL}/showcase/${item.slug}`
  return { title: { absolute: title }, description, alternates: { canonical: url }, robots: { index: !query.lang, follow: true },
    twitter: { card: 'summary_large_image', title, description, images: [`${BASE_URL}${item.media[0].src}`] },
    openGraph: { title, description, url, type: 'article', images: [{ url: `${BASE_URL}${item.media[0].src}`, width: item.media[0].width, height: item.media[0].height, alt: item.media[0].alt.en }] },
  }
}

export default async function ShowcaseCasePage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const item = getShowcaseCase(slug)
  if (!item) notFound()
  const locale = getLocaleFromSearchParam(query.lang) || 'en'
  const skill = getShowcaseSkill(item.skillSlug)
  const creator = getShowcaseCreator(skill.creatorId)
  const schema = {
    '@context': 'https://schema.org', '@type': 'Article', headline: localizeShowcase(item.title, locale), description: localizeShowcase(item.description, locale), inLanguage: locale,
    url: `${BASE_URL}/showcase/${item.slug}`, mainEntityOfPage: `${BASE_URL}/showcase/${item.slug}`,
    image: `${BASE_URL}${item.media[0].src}`, author: { '@type': 'Organization', name: 'OpenAgentSkill', url: BASE_URL },
    datePublished: `${item.updatedAt}T00:00:00+08:00`, dateModified: `${item.updatedAt}T00:00:00+08:00`,
    creditText: `Skill by ${creator.name}. Example by ${getShowcaseCreator(item.creatorId).name}.`,
    citation: item.sourceUrl, about: { '@type': 'CreativeWork', name: skill.name, url: `${BASE_URL}/skills/${item.skillSlug}` },
  }
  return <I18nProvider initialLocale={locale}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} /><ShowcaseDetail key={item.slug} item={item} /></I18nProvider>
}
