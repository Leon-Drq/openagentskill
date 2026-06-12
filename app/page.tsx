import type { Metadata } from 'next'
import { HomePageEnhanced } from '@/components/home-page-enhanced'
import { getHomePageData } from '@/lib/home-page-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Agent Skills Registry & Recommendation API',
  description:
    'Let your AI agent find and install the right skill automatically. OpenAgentSkill is an AI agent skills registry, audit layer, and recommendation API for Codex, Claude Code, Cursor, and other agent workflows.',
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
