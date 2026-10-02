import { connection } from 'next/server'
import SkillsContent, { generateMetadata as buildMetadata } from './content'

export const revalidate = 300

// Query variants still use /render-query/skills. Shared database reads retain
// their caches; the directory HTML must not depend on database health at build.
export function generateMetadata() {
  return buildMetadata({ searchParams: Promise.resolve({}) })
}

export default async function SkillsPage() {
  await connection()
  return <SkillsContent searchParams={Promise.resolve({})} />
}
