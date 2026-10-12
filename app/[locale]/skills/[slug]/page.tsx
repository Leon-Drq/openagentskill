import { notFound } from 'next/navigation'
import { getMotionEntry } from '@/lib/motion/catalog'
import { motionDetailMetadata } from '@/lib/motion/detail'
import { MotionSkillPage } from '@/components/motion/skill-page'

export const revalidate = 300
export function generateStaticParams() { return [] }
type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params
  const entry = getMotionEntry(slug)
  if (locale !== 'zh' || !entry) notFound()
  return motionDetailMetadata(entry, locale)
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params
  const entry = getMotionEntry(slug)
  if (locale !== 'zh' || !entry) notFound()
  return <MotionSkillPage entry={entry} locale={locale} />
}
