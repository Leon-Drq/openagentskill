import { HomePageEnhanced } from '@/components/home-page-enhanced'
import { getRecentActivity, getPlatformStats } from '@/lib/db/activity'
import { createPublicClient } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'

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
