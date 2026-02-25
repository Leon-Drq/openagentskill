import { HomePageEnhanced } from '@/components/home-page-enhanced'
import { getRecentActivity, getPlatformStats } from '@/lib/db/activity'
import { createClient } from '@/lib/supabase/server'

async function getFeaturedSkills() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('skills')
      .select('slug, name, description, github_stars, downloads')
      .eq('ai_review_approved', true)
      .order('downloads', { ascending: false })
      .limit(6)
    if (error) {
      console.error('[v0] getFeaturedSkills error:', error)
      return []
    }
    console.log('[v0] getFeaturedSkills result:', data?.length, 'skills')
    return data || []
  } catch (e) {
    console.error('[v0] getFeaturedSkills exception:', e)
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
    getPlatformStats().catch((e) => {
      console.error('[v0] getPlatformStats failed:', e)
      return stats
    }),
    getRecentActivity(8).catch((e) => {
      console.error('[v0] getRecentActivity failed:', e)
      return [] as Awaited<ReturnType<typeof getRecentActivity>>
    }),
    getFeaturedSkills(),
  ])
  stats = fetchedStats
  activities = fetchedActivities
  featuredSkills = fetchedSkills
  console.log('[v0] Homepage data loaded:', { totalSkills: stats.totalSkills, activities: activities.length, skills: featuredSkills.length })

  return <HomePageEnhanced stats={stats} activities={activities} featuredSkills={featuredSkills} />
}
