import { HomePageClient } from '@/components/home-page-client'
import { getRecentActivity, getPlatformStats } from '@/lib/db/activity'
import { createClient } from '@/lib/supabase/server'

async function getFeaturedSkills() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('skills')
      .select('slug, name, description, github_stars, downloads')
      .eq('ai_review_approved', true)
      .order('downloads', { ascending: false })
      .limit(6)
    return data || []
  } catch {
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

  try {
    const [fetchedStats, fetchedActivities, fetchedSkills] = await Promise.all([
      getPlatformStats(),
      getRecentActivity(8),
      getFeaturedSkills(),
    ])
    stats = fetchedStats
    activities = fetchedActivities
    featuredSkills = fetchedSkills
  } catch (error) {
    console.error('[v0] Failed to fetch homepage data:', error)
  }

  return <HomePageClient stats={stats} activities={activities} featuredSkills={featuredSkills} />
}
