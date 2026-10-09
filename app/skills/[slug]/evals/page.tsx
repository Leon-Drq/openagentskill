import SkillEvalContent, { generateMetadata } from './content'

export { generateMetadata }
export const revalidate = 300

// Generate on first visit; the build does not query the registry.
export function generateStaticParams() { return [] }

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <SkillEvalContent params={params} searchParams={Promise.resolve({})} />
}
