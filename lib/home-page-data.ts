import { withTimeout } from '@/lib/async'
import { createPublicClient } from '@/lib/supabase/public'

const HOME_STATS_SNAPSHOT = {
  totalSkills: 20_000,
  totalDownloads: 860_000,
  activePlatforms: 104,
  agentSubmissions: 2_635,
}

const HOME_STATS_QUERY_TIMEOUT_MS = 2500

async function getApprovedSkillCount() {
  const supabase = createPublicClient()
  const { count, error } = await withTimeout(
    supabase
      .from('skills')
      .select('slug', { count: 'exact', head: true })
      .eq('ai_review_approved', true),
    HOME_STATS_QUERY_TIMEOUT_MS,
    'home approved skill count query'
  ).catch((queryError) => {
    console.warn('Home stats skill count fallback:', queryError)
    return { count: null, error: queryError }
  })

  if (error || typeof count !== 'number') return HOME_STATS_SNAPSHOT.totalSkills
  return Math.max(count, HOME_STATS_SNAPSHOT.totalSkills)
}

export async function getHomePageData() {
  const totalSkills = await getApprovedSkillCount()

  return {
    stats: {
      ...HOME_STATS_SNAPSHOT,
      totalSkills,
    },
    activities: [],
    featuredSkills: [],
  }
}
