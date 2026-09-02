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
  // Keep this deploy-time safety net close to the latest verified production
  // value. It is used only on a cold cache when the counter is unavailable.
  totalSkills: LAST_VERIFIED_APPROVED_SKILL_COUNT,
}

const HOME_STATS_QUERY_TIMEOUT_MS = 2_000

export interface HomeSkillCount {
  value: number
  exact: boolean
}

async function fetchExactApprovedSkillCount(): Promise<HomeSkillCount> {
  const result = await getApprovedRegistrySkillCount(HOME_STATS_QUERY_TIMEOUT_MS)
  if (!result?.exact) {
    // Do not turn a timeout or planner estimate into a five-minute cached
    // regression. Rejecting lets Next keep serving the last successful value
    // during stale-while-revalidate; the caller owns the cold-cache fallback.
    throw new Error('Exact approved skill count is temporarily unavailable')
  }

  return { value: result.count, exact: true }
}

const getCachedExactApprovedSkillCount = unstable_cache(
  fetchExactApprovedSkillCount,
  ['home-approved-skill-count-v3'],
  { revalidate: 300 }
)

async function getStableApprovedSkillCount(): Promise<HomeSkillCount> {
  try {
    return await getCachedExactApprovedSkillCount()
  } catch {
    // This path is intentionally outside unstable_cache. A transient database
    // failure can never overwrite a newer cached count with this snapshot.
    return { value: HOME_STATS_SNAPSHOT.totalSkills, exact: false }
  }
}

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
    getStableApprovedSkillCount(),
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
