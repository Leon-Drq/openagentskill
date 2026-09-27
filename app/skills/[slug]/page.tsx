import SkillContent, { generateMetadata as buildMetadata } from './content'

export const revalidate = 300

// On-demand ISR avoids prebuilding the entire registry on every deployment.
export function generateStaticParams() { return [] }

type Props = { params: Promise<{ slug: string }> }

export function generateMetadata({ params }: Props) {
  return buildMetadata({ params, searchParams: Promise.resolve({}) })
}

export default function SkillDetailPage({ params }: Props) {
  return <SkillContent params={params} searchParams={Promise.resolve({})} />
}
