import type { Metadata } from 'next'
import { getLocaleFromSearchParam } from '@/lib/i18n/market-routing'
import { getPartnershipCopy } from '@/lib/i18n/partnership-copy'
import { CONTACT_EMAIL } from '@/lib/partnerships'

export type PartnershipPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }
const SITE = 'https://www.openagentskill.com'

export async function partnershipPageData(kind: 'contact' | 'sponsor', { searchParams }: PartnershipPageProps) {
  const params = await searchParams
  const locale = getLocaleFromSearchParam(params.lang)
  const copy = getPartnershipCopy(locale)
  const title = kind === 'contact' ? copy.contactTitle.replace(/[.。]$/, '') : copy.sponsorLabel
  const description = kind === 'contact' ? copy.contactIntro : copy.sponsorIntro
  const url = `${SITE}/${kind}`
  const metadata: Metadata = {
    title, description,
    alternates: { canonical: url },
    // Match existing auxiliary-page policy: localized query variants aren't new landing URLs.
    robots: { index: !Object.values(params).some(Boolean), follow: true },
    openGraph: { title, description, url, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
  const schema = [
    {
      '@context': 'https://schema.org', '@type': kind === 'contact' ? 'ContactPage' : 'WebPage',
      '@id': `${url}#${kind}`, url, name: title, description, inLanguage: locale,
      isPartOf: { '@id': `${SITE}/#website` },
      ...(kind === 'contact' ? {
        mainEntity: {
          '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'OpenAgentSkill', email: CONTACT_EMAIL,
          contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: CONTACT_EMAIL, url, availableLanguage: ['English', 'Chinese'] },
        },
      } : {}),
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'OpenAgentSkill', item: SITE },
        { '@type': 'ListItem', position: 2, name: title, item: url },
      ],
    },
  ]
  return { locale, copy, metadata, schema }
}
