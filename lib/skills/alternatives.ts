import { unstable_cache } from 'next/cache'
import { convertSkillRecordToManifest, getSkillDirectory, type SkillRecord } from '@/lib/db/skills'
import { getPlatformHints, getSkillQualityProfile } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'
import { packCacheJson, unpackCacheJson } from '@/lib/cache/packed-json'

/** One shared candidate projection, rather than 1,200 quality/trust analyses
 * for every target skill. Store only public fields needed for ranking/display.
 */
export function projectAlternativeCandidates(records: SkillRecord[]) {
  const merged = new Map(CURATED_SKILL_SNAPSHOT.map(record => [record.slug, record]))
  for (const record of records) merged.set(record.slug, record)
  return [...merged.values()].map(record => {
    const quality = getSkillQualityProfile(record)
    const trust = getSkillTrustProfile(record)
    return {
      skill: {
        slug: record.slug, name: record.name, description: record.description,
        category: record.category, github_stars: record.github_stars, github_repo: record.github_repo,
        github_last_pushed_at: record.github_last_pushed_at, updated_at: record.updated_at,
        tags: (record.tags || []).map(tag => tag.toLowerCase()),
        frameworks: (record.frameworks || []).map(framework => framework.toLowerCase()),
      },
      quality: { score: quality.score, label: quality.label }, trust: { score: trust.score },
      platforms: [...new Set([...(record.frameworks || []), ...getPlatformHints(record)])],
      installCommand: convertSkillRecordToManifest(record).technical.installCommand || `npx skills add ${record.github_repo}`,
      installReady: Boolean(record.install_command || record.github_repo),
    }
  })
}

type Candidates = ReturnType<typeof projectAlternativeCandidates>
const getPackedCandidates = unstable_cache(async () => {
  const result = await getSkillDirectory('quality', undefined, 1200)
  // Never replace a healthy cached page with outage-induced empty/fallback data.
  if (result.degraded) throw new Error('Alternative candidates temporarily unavailable')
  return packCacheJson(projectAlternativeCandidates(result.records))
}, ['alternative-candidates-v1'], { revalidate: 900, tags: ['public-skill-directory'] })

export async function getAlternativeCandidates(): Promise<Candidates> {
  return unpackCacheJson<Candidates>(await getPackedCandidates())
}

export function rankAlternatives(target: SkillRecord, candidates: Candidates, limit = 16) {
  const targetTags = new Set((target.tags || []).map(tag => tag.toLowerCase()))
  const targetFrameworks = new Set((target.frameworks || []).map(framework => framework.toLowerCase()))
  return candidates.filter(candidate => candidate.skill.slug !== target.slug).map(candidate => {
    const { skill, quality, trust, installReady } = candidate
    let score = skill.category === target.category ? 28 : 0
    score += skill.tags.filter(tag => targetTags.has(tag)).length * 8
    score += skill.frameworks.filter(framework => targetFrameworks.has(framework)).length * 6
    score += Math.min(18, Math.log10(Math.max(1, skill.github_stars || 1)) * 4)
    score += quality.score / 5
    score += trust.score / 6
    if (installReady) score += 5
    if (skill.github_last_pushed_at) score += 3
    return { ...candidate, score }
  }).filter(item => item.score >= 32)
    .sort((a, b) => b.score - a.score || b.skill.github_stars - a.skill.github_stars)
    .slice(0, limit)
}
