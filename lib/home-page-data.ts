import { getPlatformStats, getRecentActivity } from '@/lib/db/activity'
import { createPublicClient } from '@/lib/supabase/public'

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

export async function getHomePageData() {
  const [stats, activities, featuredSkills] = await Promise.all([
    getPlatformStats(),
    getRecentActivity(8),
    getFeaturedSkills(),
  ])

  return { stats, activities, featuredSkills }
}
