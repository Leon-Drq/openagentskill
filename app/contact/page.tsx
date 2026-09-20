import { ContactContent } from '@/components/partnership-pages'
import { partnershipPageData, type PartnershipPageProps } from '@/lib/seo/partnerships'

export async function generateMetadata(props: PartnershipPageProps) {
  return (await partnershipPageData('contact', props)).metadata
}

export default async function ContactPage(props: PartnershipPageProps) {
  const { locale, schema } = await partnershipPageData('contact', props)
  return <ContactContent locale={locale} schema={schema} />
}
