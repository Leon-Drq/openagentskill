import { HomePageEnhanced } from '@/components/home-page-enhanced'
import { getRecentActivity, getPlatformStats } from '@/lib/db/activity'
import { createPublicClient } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'

async function getFeaturedSkills() {
  try {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('skills')
      .select('slug, name, description, github_stars, downloads')
      .eq('ai_review_approved', true)
      .order('downloads', { ascending: false })
      .limit(6)
    if (error) {
      console.error('getFeaturedSkills error:', error)
      return []
    }
    return data || []
  } catch (e) {
    console.error('getFeaturedSkills exception:', e)
    return []
  }
}

export default async function Page() {
  let stats = { 
    totalSkills: 0, 
    totalDownloads: 0, 
    activePlatforms: 8,
    agentSubmissions: 0 
  }
  let activities: Awaited<ReturnType<typeof getRecentActivity>> = []
  let featuredSkills: Awaited<ReturnType<typeof getFeaturedSkills>> = []

  // Fetch independently so one failure doesn't block others
  const [fetchedStats, fetchedActivities, fetchedSkills] = await Promise.all([
    getPlatformStats().catch(() => stats),
    getRecentActivity(8).catch(() => [] as Awaited<ReturnType<typeof getRecentActivity>>),
    getFeaturedSkills(),
  ])
  stats = fetchedStats
  activities = fetchedActivities
  featuredSkills = fetchedSkills

  return <HomePageEnhanced stats={stats} activities={activities} featuredSkills={featuredSkills} />
}
