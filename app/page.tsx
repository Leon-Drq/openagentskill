import { HomePageEnhanced } from '@/components/home-page-enhanced'
import { getRecentActivity, getPlatformStats } from '@/lib/db/activity'
import { createPublicClient } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'

async function getFeaturedSkills() {
  const supabase = createPublicClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('skills')
    .select('slug, name, description, github_stars, downloads')
    .eq('ai_review_approved', true)
    .order('downloads', { ascending: false })
    .limit(6)
  if (error) return []
  return data || []
}

export default async function Page() {
  const [stats, activities, featuredSkills] = await Promise.all([
    getPlatformStats().catch(() => null),
    getRecentActivity(8).catch(() => []),
    getFeaturedSkills(),
  ])

  const resolvedStats = stats ?? {
    totalSkills: 0,
    totalDownloads: 0,
    activePlatforms: 0,
    agentSubmissions: 0,
  }

  return (
    <HomePageEnhanced
      stats={resolvedStats}
      activities={activities}
      featuredSkills={featuredSkills}
    />
  )
}
