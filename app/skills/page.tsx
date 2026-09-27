import SkillsContent, { generateMetadata as buildMetadata } from './content'

export const revalidate = 300

// Do not read Next's request searchParams here: even an empty query opts the
// complete route out of ISR. Proxy sends query variants to /render-query/skills.
export function generateMetadata() {
  return buildMetadata({ searchParams: Promise.resolve({}) })
}

export default function SkillsPage() {
  return <SkillsContent searchParams={Promise.resolve({})} requireHealthy />
}
