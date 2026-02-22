import { Metadata } from 'next'
import { mockSkills } from '@/lib/mock-data'
import { getAllSkills, convertSkillRecordToManifest } from '@/lib/db/skills'
import { SkillsPageClient } from '@/components/skills-page-client'

export const metadata: Metadata = {
  title: 'Browse Agent Skills — Open Agent Skill',
  description:
    'Explore thousands of AI agent skills across all platforms. Find the perfect skills for your autonomous agents.',
  openGraph: {
    title: 'Browse Agent Skills — Open Agent Skill',
    description: 'Explore thousands of AI agent skills across all platforms.',
    type: 'website',
  },
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams

  // Get skills from database
  let dbSkills
  try {
    const records = await getAllSkills()
    dbSkills = records.map(convertSkillRecordToManifest)
  } catch (error) {
    console.error('[v0] Failed to fetch skills from database:', error)
    dbSkills = []
  }

  const allSkills = dbSkills.length > 0 ? dbSkills : mockSkills

  // Filter skills based on search
  let filteredSkills = allSkills
  if (params.q) {
    const query = params.q.toLowerCase()
    filteredSkills = filteredSkills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        skill.technical.githubRepo?.toLowerCase().includes(query)
    )
  }

  // Sort by downloads
  const sortedSkills = [...filteredSkills].sort((a, b) => b.stats.downloads - a.stats.downloads)

  return <SkillsPageClient skills={sortedSkills} query={params.q} />
}
