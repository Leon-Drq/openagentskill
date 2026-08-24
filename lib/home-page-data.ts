import { unstable_cache } from 'next/cache'
import {
  LAST_VERIFIED_APPROVED_SKILL_COUNT,
  getApprovedRegistrySkillCount,
} from '@/lib/registry-stats'
import { getAgentOutcomeStatsMapStrict } from '@/lib/db/skills'
import { getLatestRankingSnapshot } from '@/lib/ranking-snapshots'
import { getGitHubOwner } from '@/lib/github-owner'

const HOME_STATS_SNAPSHOT = {
  // The last exact count observed before the registry stats cache was added.
  // A fallback is explicitly rendered with "+" so an upstream timeout cannot
  // look like the registry lost indexed skills.
  totalSkills: LAST_VERIFIED_APPROVED_SKILL_COUNT,
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

async function fetchEvidenceStats() {
  try {
    const statsMap = await getAgentOutcomeStatsMapStrict()
    const rows = Object.values(statsMap)

    return {
      totalVerifiedInstalls: rows.reduce(
        (sum, row) => sum + Number(row.verified_installs || 0),
        0
      ),
      totalOutcomes: rows.reduce(
        (sum, row) => sum + Number(row.total_outcomes || 0),
        0
      ),
      provenSkills: rows.filter((row) => Number(row.total_outcomes || 0) > 0).length,
      evidenceExact: true,
    }
  } catch {
    // Never replace missing first-party evidence with a marketing estimate.
    return {
      totalVerifiedInstalls: 0,
      totalOutcomes: 0,
      provenSkills: 0,
      evidenceExact: false,
    }
  }
}

const getCachedEvidenceStats = unstable_cache(
  fetchEvidenceStats,
  ['home-evidence-stats-v1'],
  { revalidate: 300 }
)

export async function getHomePageData() {
  const [totalSkills, evidence, popularitySnapshot, trendingSnapshot] = await Promise.all([
    getCachedApprovedSkillCount(),
    getCachedEvidenceStats(),
    getLatestRankingSnapshot('most-starred-agent-skills'),
    getLatestRankingSnapshot('trending'),
  ])
  const leaderboardSnapshot = popularitySnapshot || trendingSnapshot

  return {
    stats: {
      ...HOME_STATS_SNAPSHOT,
      ...evidence,
      totalSkills: totalSkills.value,
      totalSkillsExact: totalSkills.exact,
    },
    activities: [],
    featuredSkills: [...(leaderboardSnapshot?.items || [])]
      .sort((a, b) => Number(b.github_stars || 0) - Number(a.github_stars || 0))
      .slice(0, 10)
      .map((item, index) => ({
        slug: item.slug,
        name: item.name,
        description: item.description,
        github_stars: item.github_stars,
        downloads: 0,
        rank: index + 1,
        badge: item.badge,
        reason: item.reason,
        category: item.category,
        github_repo: item.repository,
        github_owner: item.github_owner || getGitHubOwner({ repository: item.repository }),
        author_name: item.author_name || null,
      })),
    rankingGeneratedAt: leaderboardSnapshot?.generated_at || null,
  }
}
