import { Metadata } from 'next'
import { getAllSkills, getCategories, convertSkillRecordToManifest, type SkillSortMode, getSkillStats } from '@/lib/db/skills'
import { SkillsPageClient } from '@/components/skills-page-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Browse 90+ AI Agent Skills',
  description: 'Discover AI agent skills for MCP servers, web automation, coding agents, RAG, data processing, and more. Filter by category, GitHub stars, popularity, or recent updates.',
  keywords: ['AI agent skills', 'MCP servers', 'Claude tools', 'GPT plugins', 'LangChain tools', 'agent marketplace'],
  openGraph: {
    title: 'Browse 90+ AI Agent Skills — Open Agent Skill',
    description: 'Discover high-star AI agent skills, MCP servers, browser automation tools, and agent frameworks.',
    type: 'website',
    url: 'https://www.openagentskill.com/skills',
  },
  alternates: {
    canonical: 'https://www.openagentskill.com/skills',
  },
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; category?: string }>
}) {
  const params = await searchParams
  const sort = (params.sort as SkillSortMode) || 'quality'
  const category = params.category || 'all'

  const [records, categories, statsMap] = await Promise.all([
    getAllSkills(sort, category),
    getCategories(),
    getSkillStats(),
  ])

  let skills = records.map((r) => ({
    ...convertSkillRecordToManifest(r),
    agentStats: statsMap[r.slug] || null,
  }))

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
