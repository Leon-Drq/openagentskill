import { Metadata } from 'next'
import { getAllSkills, convertSkillRecordToManifest } from '@/lib/db/skills'
import { SkillsPageClient } from '@/components/skills-page-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Browse Agent Skills — Open Agent Skill',
  description:
    'Explore AI agent skills across all platforms. Find the perfect skills for your autonomous agents.',
  openGraph: {
    title: 'Browse Agent Skills — Open Agent Skill',
    description: 'Explore AI agent skills across all platforms.',
    type: 'website',
  },
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams

  const records = await getAllSkills()
  const allSkills = records.map(convertSkillRecordToManifest)

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

  const sortedSkills = [...filteredSkills].sort((a, b) => b.stats.downloads - a.stats.downloads)

  return <SkillsPageClient skills={sortedSkills} query={params.q} />
}
