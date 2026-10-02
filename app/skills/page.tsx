import { connection } from 'next/server'
import SkillsContent, { generateMetadata as buildMetadata } from './content'

export const revalidate = 300

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// Filters share this request-time route with the unfiltered directory. Shared
// database reads retain their caches; no database work runs during the build.
export function generateMetadata({ searchParams }: Props) {
  return buildMetadata({ searchParams })
}

export default async function SkillsPage({ searchParams }: Props) {
  await connection()
  return <SkillsContent searchParams={searchParams} />
}
