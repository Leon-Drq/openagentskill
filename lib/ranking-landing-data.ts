import 'server-only'
import { unstable_cache } from 'next/cache'
import { getSkillDirectory, getAgentOutcomeStatsMapStrict } from '@/lib/db/skills'
import { getRankingDefinition, rankSkillsForDefinition, type RankingDefinition } from '@/lib/rankings'
import { rankingCandidates } from '@/lib/ranking-landing'
import { isDirectorySnapshot } from '@/lib/skills/directory'
import { getSavedDirectory, getSavedDirectoryInfo } from '@/lib/skills/saved-directory'
import { isDataPaused } from '@/lib/data-maintenance'

const defaultReaders = {
  skills: async (...args: Parameters<typeof getSkillDirectory>) => {
    const result = await getSkillDirectory(...args)
    // Do not recache a degraded selection as a fresh, successful ranking.
    if (result.degraded) throw new Error('Ranking directory unavailable')
    return result.records
  },
  outcomes: getAgentOutcomeStatsMapStrict,
}

export async function loadRankingLanding(ranking: RankingDefinition, readers = defaultReaders, now = Date.now()) {
  const usesOutcomes = ['highest-quality', 'agent-usage', 'success-rate', 'safe-auto-install', 'agent-platform'].includes(ranking.kind)
  const sort = ranking.kind === 'most-starred' ? 'stars' : ranking.kind === 'recently-updated' ? 'fresh' : ranking.kind === 'new-this-week' ? 'new' : 'quality'
  try {
    const [skills, stats] = await Promise.all([
      readers.skills(sort, undefined, 480),
      // Stars, dates and use-case fit do not depend on the event/statistics DB.
      usesOutcomes ? readers.outcomes() : Promise.resolve({}),
    ])
    const saved = skills.some(isDirectorySnapshot)
    if (saved && ranking.kind === 'new-this-week') return { items: [], candidateCount: 0, source: 'unavailable' as const }
    const candidates = rankingCandidates(skills, ranking, now)
    return { items: rankSkillsForDefinition(candidates, ranking, stats, 30), candidateCount: candidates.length,
      source: saved ? 'saved-directory' as const : 'directory' as const }
  } catch {
    // Failed outcome reads must not become zero-risk or zero-failure evidence.
    return { items: [], candidateCount: 0, source: 'unavailable' as const }
  }
}

const getCachedRankingLanding = unstable_cache(async (slug: string) => {
  const ranking = getRankingDefinition(slug)
  if (!ranking) throw new Error('Unknown ranking')
  const result = await loadRankingLanding(ranking)
  // Throwing retains the previous successful Data Cache value on revalidation.
  // A cold miss is handled outside the cache, never stored as a zero-item list.
  if (result.source !== 'directory') throw new Error('Ranking refresh unavailable')
  return result
}, ['ranking-landing-v2-success-only'], { revalidate: 900, tags: ['public-skill-directory', 'public-skill-outcomes'] })

type Landing = Awaited<ReturnType<typeof loadRankingLanding>> & { savedFrom?: string; savedThrough?: string }

// The emergency read model has its own keyspace. Reuse its projection without
// ever overwriting the live cache or recalculating 480 profiles per visitor.
const getSavedRankingLanding = unstable_cache(async (slug: string, savedVersion: string): Promise<Landing> => {
  const ranking = getRankingDefinition(slug)!
  const sort = ranking.kind === 'most-starred' ? 'stars' : ranking.kind === 'new-this-week' ? 'new' : ranking.kind === 'recently-updated' ? 'fresh' : 'quality'
  const saved = getSavedDirectory(sort)
  if (!saved || saved.savedThrough !== savedVersion) throw new Error('Saved ranking expired or changed')
  const candidates = rankingCandidates(saved.records, ranking)
  if (!candidates.length) throw new Error('No current eligible saved candidates')
  return {
    items: rankSkillsForDefinition(candidates, ranking, {}, 30), candidateCount: candidates.length,
    source: 'saved-directory', savedFrom: saved.savedFrom, savedThrough: saved.savedThrough,
  }
}, ['saved-ranking-selection-v1'], { revalidate: 300 })

export async function getRankingLanding(slug: string): Promise<Landing> {
  const ranking = getRankingDefinition(slug)
  if (!ranking) throw new Error('Unknown ranking')
  if (!isDataPaused()) {
    try { return await getCachedRankingLanding(slug) } catch { /* Use only eligible saved metadata below. */ }
  }
  // Never infer current agent outcomes/safety from an archived metadata pool.
  if (['most-starred', 'new-this-week', 'recently-updated', 'use-case'].includes(ranking.kind)) {
    const saved = getSavedDirectoryInfo()
    if (saved) {
      try { return await getSavedRankingLanding(slug, saved.savedThrough) } catch { /* Not a current list. */ }
    }
  }
  return { items: [], candidateCount: 0, source: 'unavailable' }
}
