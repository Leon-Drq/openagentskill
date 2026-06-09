import type { Metadata } from 'next'
import { HomePageEnhanced } from '@/components/home-page-enhanced'
import { getRecentActivity, getPlatformStats } from '@/lib/db/activity'
import { createPublicClient } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Agent Skills Registry & Recommendation API',
  description:
    'Let your AI agent find and install the right skill automatically. OpenAgentSkill is an AI agent skills registry, audit layer, and recommendation API for Codex, Claude Code, Cursor, and other agent workflows.',
  alternates: {
    canonical: 'https://www.openagentskill.com',
  },
}

async function getFeaturedSkills() {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('skills')
    .select('slug, name, description, github_stars, downloads, quality_score')
    .eq('ai_review_approved', true)
    .order('quality_score', { ascending: false })
    .order('github_stars', { ascending: false })
    .limit(6)
  if (error) return []
  return data || []
}

export default async function Page() {
  const [stats, activities, featuredSkills] = await Promise.all([
    getPlatformStats(),
    getRecentActivity(8),
    getFeaturedSkills(),
  ])

  return (
    <HomePageEnhanced
      stats={stats}
      activities={activities}
      featuredSkills={featuredSkills}
    />
  )
}
