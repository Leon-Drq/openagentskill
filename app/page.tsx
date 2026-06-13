import type { Metadata } from 'next'
import { HomePageEnhanced } from '@/components/home-page-enhanced'
import { getHomePageData } from '@/lib/home-page-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'The Skill Layer for AI Agents',
  description:
    'The skill layer for AI agents. Let your AI agent find, compare, and install the right reusable skill automatically. OpenAgentSkill is npm for AI Agent Skills.',
  alternates: {
    canonical: 'https://www.openagentskill.com',
  },
}

export default async function Page() {
  const { stats, activities, featuredSkills } = await getHomePageData()

  return (
    <HomePageEnhanced
      stats={stats}
      activities={activities}
      featuredSkills={featuredSkills}
    />
  )
}
