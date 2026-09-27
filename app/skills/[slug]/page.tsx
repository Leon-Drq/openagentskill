import SkillDetailPage, { generateMetadata as skillMetadata } from '@/components/skill-detail-page'

export const revalidate = 300

// Generate long-tail pages on their first request, then reuse the full page.
export function generateStaticParams() { return [] }

type Props = { params: Promise<{ slug: string }> }

export function generateMetadata({ params }: Props) {
  return skillMetadata({ params, searchParams: Promise.resolve({}) })
}

export default function Page({ params }: Props) {
  return <SkillDetailPage params={params} searchParams={Promise.resolve({})} />
}
