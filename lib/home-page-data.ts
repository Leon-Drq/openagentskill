import { unstable_cache } from 'next/cache'
import { getApprovedRegistrySkillCount } from '@/lib/registry-stats'
import { getAgentOutcomeStatsMapStrict } from '@/lib/db/skills'
import { getLatestRankingSnapshot } from '@/lib/ranking-snapshots'
import { getRankingLanding } from '@/lib/ranking-landing-data'
import { getGitHubOwner } from '@/lib/github-owner'
import { getRegistryCoverageStats } from '@/lib/registry-coverage'
import { isDataPaused } from '@/lib/data-maintenance'

const HOME_STATS_SNAPSHOT = {
  // Last recorded public directory count: docs/directory-recovery-2026-10-11.md.
  // This is dated historical metadata, not a current count or a lower bound.
  // Keep it outside the live cache and separate from approved-only API fallbacks.
  totalSkills: 35_296,
  totalSkillsAsOf: '2026-10-11',
}

const HOME_STATS_QUERY_TIMEOUT_MS = 2_000

export interface HomeSkillCount {
  value: number
  exact: boolean
}

async function fetchExactApprovedSkillCount(): Promise<HomeSkillCount> {
  const result = await getApprovedRegistrySkillCount(HOME_STATS_QUERY_TIMEOUT_MS)
  if (!result?.exact) {
    // Do not turn a timeout or planner estimate into a four-hour cached
    // regression. Rejecting lets Next keep serving the last successful value
    // during stale-while-revalidate; the caller owns the cold-cache fallback.
    throw new Error('Exact approved skill count is temporarily unavailable')
  }

  return { value: result.count, exact: true }
}

const getCachedExactApprovedSkillCount = unstable_cache(
  fetchExactApprovedSkillCount,
  ['home-approved-skill-count-v3'],
  { revalidate: 14400 }
)

async function getStableApprovedSkillCount(): Promise<HomeSkillCount> {
  if (isDataPaused()) return { value: HOME_STATS_SNAPSHOT.totalSkills, exact: false }
  try {
    return await getCachedExactApprovedSkillCount()
  } catch {
    // This path is intentionally outside unstable_cache. A transient database
    // failure can never overwrite a newer cached count with this snapshot.
    return { value: HOME_STATS_SNAPSHOT.totalSkills, exact: false }
  }
}

async function fetchEvidenceStats() {
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
}

const getCachedEvidenceStats = unstable_cache(
  fetchEvidenceStats,
  ['home-evidence-stats-v2'],
  { revalidate: 14400 }
)

export function getRegistryEvidenceStats() {
  if (isDataPaused()) return Promise.resolve({ totalVerifiedInstalls: 0, totalOutcomes: 0, provenSkills: 0, evidenceExact: false })
  // A failed refresh must not replace a healthy cache entry with zeroes.
  return getCachedEvidenceStats().catch(() => ({
    totalVerifiedInstalls: 0,
    totalOutcomes: 0,
    provenSkills: 0,
    evidenceExact: false,
  }))
}

export async function getHomePageData() {
  const paused = isDataPaused()
  const [totalSkills, evidence, coverage, leaderboard] = await Promise.all([
    getStableApprovedSkillCount(),
    getRegistryEvidenceStats(),
    paused ? Promise.resolve(null) : getRegistryCoverageStats(),
    getHomeLeaderboard(paused),
  ])

  return {
    stats: {
      ...HOME_STATS_SNAPSHOT,
      ...evidence,
      totalSkills: totalSkills.value,
      totalSkillsExact: totalSkills.exact,
      totalSkillsAsOf: totalSkills.exact ? null : HOME_STATS_SNAPSHOT.totalSkillsAsOf,
      dataPaused: paused,
      discoveredProjects: coverage?.discoveredProjects ?? null,
      validatedSkills: coverage?.validatedSkills ?? null,
      coverageExact: Boolean(coverage?.exact),
      coverageUpdatedAt: coverage?.updatedAt || null,
    },
    activities: [],
    featuredSkills: leaderboard.items.slice(0, 10)
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
    rankingGeneratedAt: leaderboard.generatedAt,
    rankingSource: leaderboard.source,
  }
}

async function getHomeLeaderboard(paused: boolean) {
  const unavailable = { items: [], generatedAt: null, source: 'unavailable' as const }
  if (paused) return unavailable
  const snapshot = await getLatestRankingSnapshot('most-starred-agent-skills')
  if (snapshot?.items.length) {
    return { items: snapshot.items, generatedAt: snapshot.generated_at, source: 'snapshot' as const }
  }
  // Reuse the same bounded, four-hour-cached selection as the ranking page.
  // Trending is a different population and must never masquerade as most-starred.
  const ranking = await getRankingLanding('most-starred-agent-skills')
  if (!ranking.items.length) return unavailable
  return {
    source: ranking.source,
    generatedAt: ranking.source === 'saved-directory' ? ranking.savedThrough || null : null,
    items: ranking.items.map(({ skill, badge, reason }) => ({
      slug: skill.slug, name: skill.name, description: skill.description,
      github_stars: skill.github_stars, category: skill.category,
      repository: skill.repository || `https://github.com/${skill.github_repo}`,
      github_owner: getGitHubOwner(skill), author_name: skill.author_name,
      badge, reason,
    })),
  }
}
