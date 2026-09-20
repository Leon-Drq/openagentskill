import { SponsorContent } from '@/components/partnership-pages'
import { partnershipPageData, type PartnershipPageProps } from '@/lib/seo/partnerships'

export async function generateMetadata(props: PartnershipPageProps) {
  return (await partnershipPageData('sponsor', props)).metadata
}

export default async function SponsorPage(props: PartnershipPageProps) {
  const { locale, schema } = await partnershipPageData('sponsor', props)
  return <SponsorContent locale={locale} schema={schema} />
}
