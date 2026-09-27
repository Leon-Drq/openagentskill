import { notFound } from 'next/navigation'
import SkillDetailPage, { generateMetadata as skillMetadata } from '@/components/skill-detail-page'
import { isLocale } from '@/lib/i18n/config'

export const revalidate = 300
export function generateStaticParams() { return [] }

type Props = { params: Promise<{ locale: string; slug: string }> }

async function detailProps({ params }: Props) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  return { params: Promise.resolve({ slug }), searchParams: Promise.resolve({ lang: locale }) }
}

export async function generateMetadata(props: Props) {
  return skillMetadata(await detailProps(props))
}

export default async function Page(props: Props) {
  return <SkillDetailPage {...await detailProps(props)} />
}
