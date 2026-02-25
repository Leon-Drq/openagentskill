import { HomePageEnhanced } from '@/components/home-page-enhanced'
import { getRecentActivity, getPlatformStats } from '@/lib/db/activity'
import { mockSkills } from '@/lib/mock-data'
import { createPublicClient } from '@/lib/supabase/public'

export const dynamic = 'force-dynamic'

async function getFeaturedSkills() {
  try {
    const supabase = createPublicClient()
    if (!supabase) return null
    const { data, error } = await supabase
      .from('skills')
      .select('slug, name, description, github_stars, downloads')
      .eq('ai_review_approved', true)
      .order('downloads', { ascending: false })
      .limit(6)
    if (error) {
      return null
    }
    return data && data.length > 0 ? data : null
  } catch {
    return null
  }
}

function getMockFeaturedSkills() {
  return mockSkills
    .sort((a, b) => b.stats.downloads - a.stats.downloads)
    .slice(0, 6)
    .map(s => ({
      slug: s.slug,
      name: s.name,
      description: s.description,
      github_stars: s.stats.stars,
      downloads: s.stats.downloads,
    }))
}

function getMockStats() {
  const totalDownloads = mockSkills.reduce((sum, s) => sum + s.stats.downloads, 0)
  const allPlatforms = new Set<string>()
  mockSkills.forEach(s =>
    (s.compatibility || []).forEach(c => allPlatforms.add(c.platform))
  )
  return {
    totalSkills: mockSkills.length,
    totalDownloads,
    activePlatforms: Math.max(allPlatforms.size, 8),
    agentSubmissions: 3,
  }
}

export default async function Page() {
  // Fetch all data independently — each has its own fallback
  const [dbStats, dbActivities, dbSkills] = await Promise.all([
    getPlatformStats().catch(() => null),
    getRecentActivity(8).catch(() => null),
    getFeaturedSkills(),
  ])

  // Use database data if available, otherwise fall back to mock data
  const stats = dbStats || getMockStats()
  const activities = dbActivities || []
  const featuredSkills = dbSkills || getMockFeaturedSkills()

  return <HomePageEnhanced stats={stats} activities={activities} featuredSkills={featuredSkills} />
}
