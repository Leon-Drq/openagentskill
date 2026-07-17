import { unstable_cache } from 'next/cache'
import {
  LAST_VERIFIED_APPROVED_SKILL_COUNT,
  getApprovedRegistrySkillCount,
} from '@/lib/registry-stats'

const HOME_STATS_SNAPSHOT = {
  // The last exact count observed before the registry stats cache was added.
  // A fallback is explicitly rendered with "+" so an upstream timeout cannot
  // look like the registry lost indexed skills.
  totalSkills: LAST_VERIFIED_APPROVED_SKILL_COUNT,
  totalDownloads: 860_000,
  activePlatforms: 104,
  agentSubmissions: 2_635,
}

const HOME_STATS_QUERY_TIMEOUT_MS = 1_500

export interface HomeSkillCount {
  value: number
  exact: boolean
}

async function fetchApprovedSkillCount(): Promise<HomeSkillCount> {
  const result = await getApprovedRegistrySkillCount(HOME_STATS_QUERY_TIMEOUT_MS)
  if (result === null) {
    return { value: HOME_STATS_SNAPSHOT.totalSkills, exact: false }
  }

  if (!result.exact) {
    return {
      value: Math.max(result.count, HOME_STATS_SNAPSHOT.totalSkills),
      exact: false,
    }
  }

  return { value: result.count, exact: true }
}

const getCachedApprovedSkillCount = unstable_cache(
  fetchApprovedSkillCount,
  ['home-approved-skill-count-v2'],
  { revalidate: 300 }
)

export async function getHomePageData() {
  const totalSkills = await getCachedApprovedSkillCount()

  return {
    stats: {
      ...HOME_STATS_SNAPSHOT,
      totalSkills: totalSkills.value,
      totalSkillsExact: totalSkills.exact,
    },
    activities: [],
    featuredSkills: [],
  }
}
