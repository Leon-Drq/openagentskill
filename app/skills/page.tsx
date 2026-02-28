import { Metadata } from 'next'
import { getAllSkills, getCategories, convertSkillRecordToManifest, type SkillSortMode } from '@/lib/db/skills'
import { SkillsPageClient } from '@/components/skills-page-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Browse Agent Skills — Open Agent Skill',
  description: 'Explore AI agent skills across all platforms. Find the perfect skills for your autonomous agents.',
  openGraph: {
    title: 'Browse Agent Skills — Open Agent Skill',
    description: 'Explore AI agent skills across all platforms.',
    type: 'website',
  },
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; category?: string }>
}) {
  const params = await searchParams
  const sort = (params.sort as SkillSortMode) || 'downloads'
  const category = params.category || 'all'

  const [records, categories] = await Promise.all([
    getAllSkills(sort, category),
    getCategories(),
  ])

  let skills = records.map(convertSkillRecordToManifest)

  if (params.q) {
    const query = params.q.toLowerCase()
    skills = skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        skill.technical.githubRepo?.toLowerCase().includes(query)
    )
  }

  return (
    <SkillsPageClient
      skills={skills}
      query={params.q}
      sort={sort}
      category={category}
      categories={categories}
    />
  )
}
