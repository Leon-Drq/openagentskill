import 'server-only'
import { unstable_cache } from 'next/cache'
import { getAllSkills, getSkillStats, getAgentOutcomeStatsMapStrict } from '@/lib/db/skills'
import { getRankingDefinition, rankSkillsForDefinition, type RankingDefinition } from '@/lib/rankings'
import { rankingCandidates } from '@/lib/ranking-landing'
import { isDirectorySnapshot } from '@/lib/skills/directory'

const defaultReaders = { skills: getAllSkills, stats: getSkillStats, outcomes: getAgentOutcomeStatsMapStrict }

export async function loadRankingLanding(ranking: RankingDefinition, readers = defaultReaders, now = Date.now()) {
  const usesOutcomes = ['highest-quality', 'agent-usage', 'success-rate', 'safe-auto-install', 'agent-platform'].includes(ranking.kind)
  const sort = ranking.kind === 'most-starred' ? 'stars' : ranking.kind === 'recently-updated' ? 'fresh' : ranking.kind === 'new-this-week' ? 'new' : 'quality'
  try {
    const [skills, stats] = await Promise.all([
      readers.skills(sort, undefined, 480),
      usesOutcomes ? readers.outcomes() : ranking.kind === 'use-case' ? Promise.resolve({}) : readers.stats(),
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

export const getRankingLanding = unstable_cache(async (slug: string) => {
  const ranking = getRankingDefinition(slug)
  if (!ranking) throw new Error('Unknown ranking')
  return loadRankingLanding(ranking)
}, ['ranking-landing-v1'], { revalidate: 300, tags: ['public-skill-directory', 'public-skill-stats', 'public-skill-outcomes'] })
