import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { withTimeout } from '@/lib/async'
import { getAgentOutcomeStatsMap, getAllSkills, searchSkillsStrict, type SkillOutcomeStats, type SkillRecord } from '@/lib/db/skills'
import { augmentQueryForIntent, dedupeRankedSkills, getRecommendationReasons, normalizeMatchScore, rankSkillsForQuery, toRegistrySkill } from '@/lib/registry'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'
import { getSkillSupplyProfile } from '@/lib/supply'
import { classifySearchMatch, isDirectSkillLookup, type SearchMatchType } from '@/lib/search-match'

export const revalidate = 300

const SEARCH_CANDIDATE_LIMIT = 750
const SEARCH_QUERY_TIMEOUT_MS = 1000
const SEARCH_EXACT_QUERY_TIMEOUT_MS = 8000
const SEARCH_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
}
const DIRECT_LOOKUP_CACHE_HEADERS = {
  'Cache-Control': 'no-store',
}

const getSearchCandidatePool = unstable_cache(
  async () => {
    try {
      return await getAllSkills('quality', undefined, SEARCH_CANDIDATE_LIMIT)
    } catch (error) {
      // Keep the cache itself healthy during a transient database outage. The
      // caller can still merge this curated set with an exact query result.
      console.warn('Public skill search cache fallback:', error)
      return CURATED_SKILL_SNAPSHOT
    }
  },
  ['skills-search-candidate-pool-v2'],
  { revalidate: 300, tags: ['public-skill-directory'] }
)

function clampLimit(value: string | null) {
  const parsed = Number(value || 10)
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : 10, 1), 50)
}

function mergeSkillPools(...pools: SkillRecord[][]) {
  const seen = new Set<string>()
  const merged: SkillRecord[] = []

  for (const pool of pools) {
    for (const skill of pool) {
      const key = skill.slug || skill.github_repo || skill.id
      if (!key || seen.has(key)) continue
      seen.add(key)
      merged.push(skill)
    }
  }

  return merged
}

type ExactSearchResult = {
  records: SkillRecord[]
  error: unknown | null
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || searchParams.get('task') || ''
  const category = searchParams.get('category')
  const platform = searchParams.get('platform')
  const track = searchParams.get('track')
  const safety = searchParams.get('safety')
  const includeBlocked = searchParams.get('include_blocked') === 'true'
  const minStars = Number(searchParams.get('min_stars') || searchParams.get('minStars') || 0)
  const format = searchParams.get('format') || 'json'
  const limit = clampLimit(searchParams.get('limit'))
  const shortlistLimit = Math.max(limit * 8, 30)
  const lookupIntent = isDirectSkillLookup(query)
  const databaseQuery = lookupIntent ? query : augmentQueryForIntent(query)

  try {
    const [candidatePool, exactResult, outcomeStatsMap] = await Promise.all([
      withTimeout(
        getSearchCandidatePool(),
        SEARCH_QUERY_TIMEOUT_MS,
        'public skill search candidate query'
      ).catch((error) => {
        console.warn('Public skill search fallback:', error)
        return CURATED_SKILL_SNAPSHOT
      }),
      query.trim()
        ? withTimeout(
            searchSkillsStrict(databaseQuery, 120),
            SEARCH_EXACT_QUERY_TIMEOUT_MS,
            'public skill exact search query'
          ).then((records): ExactSearchResult => ({ records, error: null })).catch((error): ExactSearchResult => {
            console.warn('Public skill exact search fallback:', error)
            return { records: [], error }
          })
        : Promise.resolve({ records: [] as SkillRecord[], error: null } as ExactSearchResult),
      withTimeout(
        getAgentOutcomeStatsMap(),
        SEARCH_QUERY_TIMEOUT_MS,
        'public skill outcome stats query'
      ).catch((): Record<string, SkillOutcomeStats> => ({})),
    ])
    if (lookupIntent && exactResult.error) {
      return NextResponse.json(
        {
          error: 'Live registry search is temporarily unavailable. Retry this request.',
          query,
          meta: { lookup_intent: true, retryable: true },
        },
        { status: 503, headers: { ...DIRECT_LOOKUP_CACHE_HEADERS, 'Retry-After': '15', 'X-Registry-Data-State': 'degraded' } }
      )
    }
    const exactPool = exactResult.records
    const skills = mergeSkillPools(exactPool, candidatePool, CURATED_SKILL_SNAPSHOT)
    const responseCacheHeaders = lookupIntent ? DIRECT_LOOKUP_CACHE_HEADERS : SEARCH_CACHE_HEADERS
    const rankedCandidates = dedupeRankedSkills(rankSkillsForQuery(skills, query, outcomeStatsMap))
      .filter(({ skill }) => {
        if (category && skill.category.toLowerCase() !== category.toLowerCase()) return false
        if (track && getSkillSupplyProfile(skill).track.slug !== track) return false
        if (Number.isFinite(minStars) && minStars > 0 && Number(skill.github_stars || 0) < minStars) return false
        if (platform) {
          const platformText = [
            ...(skill.frameworks || []),
            ...(skill.tags || []),
            skill.description,
            skill.long_description || '',
          ].join(' ').toLowerCase()
          if (!platformText.includes(platform.toLowerCase())) return false
        }
        return true
      })
      .map((candidate) => ({
        ...candidate,
        matchType: classifySearchMatch(candidate.skill, query),
      }))
      .filter(({ matchType }) => !lookupIntent || matchType !== 'related')
      .slice(0, shortlistLimit)
    const topSearchScore = rankedCandidates[0]?.score || 0
    const ranked = rankedCandidates
      .map(({ skill, score, semanticRelevance, rankingSignals, matchType }) => ({
        skill,
        score: normalizeMatchScore(score, topSearchScore, semanticRelevance),
        rawScore: score,
        semanticRelevance,
        matchType,
        rankingSignals,
        registrySkill: toRegistrySkill(skill, null, outcomeStatsMap[skill.slug] || null),
      }))
      .filter(({ registrySkill }) => {
        if (!includeBlocked && registrySkill.safety_gate.blocked) return false
        if (safety && safety !== 'all' && registrySkill.safety_gate.tier !== safety) return false
        return true
      })
      .slice(0, limit)

    if (format === 'text') {
      const text = ranked.map(({ score, matchType, registrySkill: item }, index) => {
        return `${index + 1}. ${item.name} (${item.slug})
   Match type: ${matchType}
   Match score: ${score}
   ${item.description}
   Supply: ${item.supply_profile.track.shortLabel} | Scenario: ${item.supply_profile.scenario.label}
   Safety: ${item.safety_gate.label} | Policy: ${item.safety_gate.auto_install_policy}
   Trust: ${item.trust.score}/100 ${item.trust.label} | Audit: ${item.audit.audit_score}/100 ${item.audit.risk_label}
   Install: ${item.install}
   URL: ${item.urls.web}
   Install API: ${item.urls.install_api}`
      }).join('\n---\n')

      return new NextResponse(
        `OpenAgentSkill Registry Search
Query: ${query || 'top skills'}
Found: ${ranked.length}
---
${text}`,
        {
          headers: {
            ...responseCacheHeaders,
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Agent-Friendly': 'true',
          },
        }
      )
    }

    return NextResponse.json(
      {
        query,
        filters: {
          category,
          platform,
          track,
          safety,
          include_blocked: includeBlocked,
          min_stars: Number.isFinite(minStars) ? minStars : 0,
        },
        total: ranked.length,
        skills: ranked.map(({ skill, score, rawScore, semanticRelevance, rankingSignals, matchType, registrySkill }, index) => ({
          rank: index + 1,
          match_type: matchType,
          match_score: score,
          raw_match_score: rawScore,
          semantic_relevance: semanticRelevance,
          ranking_signals: rankingSignals,
          ...registrySkill,
          recommendation_reasons: getRecommendationReasons(skill, query, score),
        })),
        meta: {
          endpoint: '/api/skills/search',
          canonical_agent_endpoint: '/api/agent/resolve',
          ranking_model: 'hybrid-v2-task-fit-quality-outcomes',
          shortlist_policy: 'Return one best match plus up to four distinct alternatives; suppress unrelated direct-name matches.',
          lookup_intent: lookupIntent,
          exact_match_found: ranked.some(({ matchType }) => matchType === 'exact'),
          match_counts: ranked.reduce<Record<SearchMatchType, number>>((counts, item) => {
            counts[item.matchType] += 1
            return counts
          }, { exact: 0, near: 0, related: 0 }),
          no_match_message: lookupIntent && ranked.length === 0
            ? 'No exact or near Skill listing was found. Related task recommendations are intentionally suppressed for direct name lookups.'
            : null,
          safety_policy: 'Blocked candidates are excluded by default. Pass include_blocked=true only for manual audit workflows.',
          agent_friendly: true,
          api_version: '1.0',
          generated_at: new Date().toISOString(),
        },
      },
      { headers: responseCacheHeaders }
    )
  } catch (error) {
    console.error('Public skill search API error:', error)
    return NextResponse.json({ error: 'Failed to search skills' }, { status: 503 })
  }
}
