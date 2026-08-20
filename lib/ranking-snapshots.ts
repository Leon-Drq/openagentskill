import 'server-only'

import { unstable_cache } from 'next/cache'
import {
  getAgentOutcomeStatsMap,
  getAllSkills,
  getSkillEventDailyStatsMap,
  getSkillEventStatsMap,
  getSkillStats,
  type SkillAgentStats,
  type SkillEventDailyStats,
  type SkillEventStats,
  type SkillOutcomeStats,
} from '@/lib/db/skills'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import {
  CORE_RANKINGS,
  rankSkillsForDefinition,
  type RankedSkill,
  type RankingDefinition,
} from '@/lib/rankings'
import { rankHotSkills, rankTrendingSkills, type GrowthRankedSkill } from '@/lib/seo/growth-directories'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'

export const RANKING_METHODOLOGY_VERSION = 'ranking-v2-daily-2026-08'
const SNAPSHOT_ITEM_LIMIT = 30
const SNAPSHOT_RETENTION_DAYS = 90

export interface RankingSnapshotItem {
  rank: number
  score: number
  badge: string
  reason: string
  slug: string
  name: string
  description: string
  category: string
  github_stars: number
  github_forks: number
  quality_score: number
  install: string
  repository: string
  updated_at: string
}

export interface RankingSnapshot {
  ranking_slug: string
  snapshot_date: string
  generated_at: string
  methodology_version: string
  item_count: number
  items: RankingSnapshotItem[]
  source_counts: {
    skills: number
    event_skills: number
    recent_event_skills: number
    outcome_skills: number
  }
}

type SnapshotRow = RankingSnapshot & {
  updated_at: string
}

function utcDate(value = new Date()) {
  return value.toISOString().slice(0, 10)
}

function serializeRankedSkill(item: RankedSkill | GrowthRankedSkill): RankingSnapshotItem {
  const quality = getSkillQualityProfile(item.skill)
  return {
    rank: item.rank,
    score: Math.round(Number(item.score || 0) * 100) / 100,
    badge: item.badge,
    reason: item.reason,
    slug: item.skill.slug,
    name: item.skill.name,
    description: item.skill.description,
    category: item.skill.category,
    github_stars: Number(item.skill.github_stars || 0),
    github_forks: Number(item.skill.github_forks || 0),
    quality_score: quality.score,
    install: item.skill.install_command || `npx skills add ${item.skill.github_repo}`,
    repository: item.skill.repository || `https://github.com/${item.skill.github_repo}`,
    updated_at: item.skill.github_last_pushed_at || item.skill.updated_at,
  }
}

function usesOutcomeStats(definition: RankingDefinition) {
  return definition.kind === 'agent-usage' || definition.kind === 'success-rate' || definition.kind === 'safe-auto-install'
}

function createSnapshotRow(
  rankingSlug: string,
  ranked: Array<RankedSkill | GrowthRankedSkill>,
  generatedAt: string,
  sourceCounts: RankingSnapshot['source_counts']
): SnapshotRow {
  const items = ranked.slice(0, SNAPSHOT_ITEM_LIMIT).map(serializeRankedSkill)
  return {
    ranking_slug: rankingSlug,
    snapshot_date: utcDate(new Date(generatedAt)),
    generated_at: generatedAt,
    methodology_version: RANKING_METHODOLOGY_VERSION,
    item_count: items.length,
    items,
    source_counts: sourceCounts,
    updated_at: generatedAt,
  }
}

export async function generateDailyRankingSnapshots() {
  const [skills, agentStats, outcomeStats, eventStats, dailyEventStats] = await Promise.all([
    getAllSkills('quality', undefined, 1200),
    getSkillStats().catch((): Record<string, SkillAgentStats> => ({})),
    getAgentOutcomeStatsMap().catch((): Record<string, SkillOutcomeStats> => ({})),
    getSkillEventStatsMap().catch((): Record<string, SkillEventStats> => ({})),
    getSkillEventDailyStatsMap(7).catch((): Record<string, SkillEventDailyStats[]> => ({})),
  ])

  if (!skills.length) {
    throw new Error('Ranking snapshot generation returned no approved skills.')
  }

  const generatedAt = new Date().toISOString()
  const sourceCounts: RankingSnapshot['source_counts'] = {
    skills: skills.length,
    event_skills: Object.keys(eventStats).length,
    recent_event_skills: Object.keys(dailyEventStats).length,
    outcome_skills: Object.keys(outcomeStats).length,
  }

  const rows: SnapshotRow[] = CORE_RANKINGS.map((definition) =>
    createSnapshotRow(
      definition.slug,
      rankSkillsForDefinition(
        skills,
        definition,
        usesOutcomeStats(definition) ? outcomeStats : agentStats,
        SNAPSHOT_ITEM_LIMIT
      ),
      generatedAt,
      sourceCounts
    )
  )

  rows.push(
    createSnapshotRow(
      'trending',
      rankTrendingSkills(skills, eventStats, dailyEventStats, outcomeStats, SNAPSHOT_ITEM_LIMIT),
      generatedAt,
      sourceCounts
    ),
    createSnapshotRow(
      'hot',
      rankHotSkills(skills, eventStats, dailyEventStats, SNAPSHOT_ITEM_LIMIT),
      generatedAt,
      sourceCounts
    )
  )

  const supabase = createAdminClient({ requestTimeoutMs: 20_000 })
  const { error } = await supabase
    .from('ranking_snapshots')
    .upsert(rows, { onConflict: 'ranking_slug,snapshot_date' })

  if (error) throw new Error(`Failed to persist ranking snapshots: ${error.message}`)

  const retentionDate = utcDate(new Date(Date.now() - SNAPSHOT_RETENTION_DAYS * 86_400_000))
  const { error: retentionError } = await supabase
    .from('ranking_snapshots')
    .delete()
    .lt('snapshot_date', retentionDate)

  if (retentionError) {
    console.warn('[rankings-daily] Snapshot retention cleanup failed:', retentionError.message)
  }

  return {
    generated_at: generatedAt,
    methodology_version: RANKING_METHODOLOGY_VERSION,
    rankings: rows.map((row) => ({
      slug: row.ranking_slug,
      items: row.item_count,
      leader: row.items[0]
        ? `${row.items[0].name} (${formatCompactNumber(row.items[0].github_stars)} stars)`
        : null,
    })),
    source_counts: sourceCounts,
  }
}

const getCachedLatestRankingSnapshot = unstable_cache(
  async (rankingSlug: string): Promise<RankingSnapshot | null> => {
    const supabase = createPublicClient({ requestTimeoutMs: 4_000 })
    const { data, error } = await supabase
      .from('ranking_snapshots')
      .select('ranking_slug,snapshot_date,generated_at,methodology_version,item_count,items,source_counts')
      .eq('ranking_slug', rankingSlug)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`Failed to read ranking snapshot: ${error.message}`)
    return data as RankingSnapshot | null
  },
  ['latest-ranking-snapshot-v1'],
  { revalidate: 300, tags: ['ranking-snapshots'] }
)

export async function getLatestRankingSnapshot(rankingSlug: string) {
  return getCachedLatestRankingSnapshot(rankingSlug).catch(() => null)
}

export async function getRankingSnapshotHistory(rankingSlug: string, days = 30) {
  const supabase = createPublicClient({ requestTimeoutMs: 4_000 })
  const since = utcDate(new Date(Date.now() - Math.min(Math.max(days, 1), 90) * 86_400_000))
  const { data, error } = await supabase
    .from('ranking_snapshots')
    .select('ranking_slug,snapshot_date,generated_at,methodology_version,item_count,items,source_counts')
    .eq('ranking_slug', rankingSlug)
    .gte('snapshot_date', since)
    .order('snapshot_date', { ascending: true })
  if (error) throw new Error(`Failed to read ranking history: ${error.message}`)
  return (data || []) as RankingSnapshot[]
}
