import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { getGitHubOwner } from '@/lib/github-owner'
import { isMcpOnlySkillRecord } from '@/lib/skills/registry-scope'
import type { SkillRecord } from '@/lib/db/skills'
import { TRENDING_LIMIT, TRENDING_METHODOLOGY_VERSION, isTrendingSnapshot, trendingWindow, type TrendingEvidence, type TrendingItem, type TrendingSnapshot } from '@/lib/trending'

export interface ActivityCandidate {
  skill: SkillRecord
  activity: Omit<TrendingEvidence, 'window_start' | 'window_end'>
  score: number
  candidate_count: number
}

async function readActivityPage(windowEnd: string, offset: number): Promise<ActivityCandidate[]> {
  const client = createAdminClient({ requestTimeoutMs: 15_000 })
  const { data, error } = await client.rpc('get_trending_activity_candidates', {
    window_end: windowEnd, page_offset: offset, page_size: 100,
  })
  if (error || !Array.isArray(data)) throw new Error(`Trending aggregation failed: ${error?.message || 'invalid response'}`)
  return data as ActivityCandidate[]
}

/** Background-only aggregation. Public page requests read the small persisted snapshot. */
export async function buildTrendingSnapshot(generatedAt: string, readPage = readActivityPage): Promise<TrendingSnapshot> {
  const window = trendingWindow(new Date(generatedAt))
  const items: TrendingItem[] = []
  const seen = new Set<string>()
  let candidates = 0
  let complete = false
  // Each page is already ordered over ALL recently active public records, not a quality shortlist.
  // Fail closed if the bounded job cannot finish; never replace a complete snapshot with a partial one.
  for (let offset = 0; offset < 20_000; offset += 100) {
    const data = await readPage(window.end, offset)
    for (const row of data) {
      candidates = Number(row.candidate_count)
      const skill = row.skill
      if (seen.has(skill.slug) || isMcpOnlySkillRecord(skill)) continue
      seen.add(skill.slug)
      if (row.activity.total_events <= 0) continue
      items.push({
        rank: items.length + 1, score: Number(row.score), slug: skill.slug,
        name: skill.name, description: skill.description, category: skill.category,
        github_stars: Number(skill.github_stars || 0), github_forks: Number(skill.github_forks || 0),
        quality_score: Number(skill.quality_score || 0),
        install: skill.install_command || '', repository: skill.repository || `https://github.com/${skill.github_repo}`,
        updated_at: skill.updated_at, github_owner: getGitHubOwner(skill), author_name: skill.author_name,
        badge: `${row.activity.total_events} interactions / 7 UTC days`,
        reason: 'Recent on-site activity; command copies are not confirmed installs. Review the source before use.',
        activity: { ...row.activity, window_start: window.start, window_end: window.end },
      })
      if (items.length === TRENDING_LIMIT) break
    }
    if (items.length === TRENDING_LIMIT || data.length < 100) { complete = true; break }
  }
  if (!complete) throw new Error('Trending aggregation exceeded its bounded pagination budget')
  const snapshot: TrendingSnapshot = {
    ranking_slug: 'trending', snapshot_date: generatedAt.slice(0, 10), generated_at: generatedAt,
    methodology_version: TRENDING_METHODOLOGY_VERSION, item_count: items.length, items,
    source_counts: { skills: candidates, event_skills: candidates, recent_event_skills: candidates, outcome_skills: 0 },
  }
  if (!isTrendingSnapshot(snapshot)) throw new Error('Trending snapshot failed validation')
  return snapshot
}
