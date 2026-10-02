import { createCoalescedCache } from '@/lib/cache/coalesced'
import { PUBLIC_SKILL_FILTER } from '@/lib/skills/publication'
import { commerceFilterSlugs, getSkillCommerce, type PriceFilter } from '@/lib/skills/commerce'
import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient } from '@/lib/supabase/admin'
import { withTimeout } from '@/lib/async'
import { collectSearchResults } from '@/lib/search-results'
import { directoryCategoryTerms } from '@/lib/skills/directory'
import { normalizeSkillCategory, normalizeTopic, normalizeOutput, type SkillTaxonomy } from '@/lib/skills/taxonomy'
import { CATALOG_PAGE_SIZE, catalogPageNumber, catalogSortColumn, catalogStars } from '@/lib/skills/catalog-query'
import { isMcpOnlyCategory, isMcpOnlySkillRecord } from '@/lib/skills/registry-scope'
import { unstable_cache } from 'next/cache'
import type { Skill } from '@/lib/types'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'
import { getSearchTerms, normalizeExactSearchQuery } from '@/lib/search-query'
import { packCacheJson, unpackCacheJson } from '@/lib/cache/packed-json'
import { buildLegacySearchIndexFilter, buildEditorialSearchIndexFilter, matchesLegacySearchIndex } from '@/lib/seo/search-indexability'

export interface SkillRecord extends Partial<SkillTaxonomy> {
  id: string
  slug: string
  name: string
  description: string
  long_description: string | null
  tagline: string | null
  author_name: string
  author_email: string | null
  author_url: string | null
  repository: string
  github_repo: string
  github_stars: number
  github_forks: number
  category: string
  tags: string[]
  frameworks: string[]
  version: string
  license: string
  install_command: string | null
  npm_package: string | null
  verified: boolean
  publisher_github?: string | null
  publisher_x?: string | null
  publisher_verified?: boolean
  submission_source: string
  submitted_by_agent: string | null
  ai_review_score: any
  ai_review_approved: boolean
  listing_status?: string | null
  owner_publication?: { channel: string; static_analysis?: { riskLevel?: string; version_evidence?: unknown }; notice?: string } | null
  ai_review_issues: string[]
  ai_review_suggestions: string[]
  downloads: number
  used_by: number
  rating: number
  review_count: number
  quality_score: number
  quality_signals: Record<string, unknown> | null
  github_language: string | null
  github_last_pushed_at: string | null
  last_synced_at?: string | null
  source_ref?: string | null
  source_path?: string | null
  source_commit_sha?: string | null
  source_content_hash?: string | null
  source_sync_status?: 'untracked' | 'current' | 'changed' | 'error'
  license_source?: 'skill_frontmatter' | 'github_repository' | 'manual' | 'unknown'
  license_status?: 'detected' | 'missing' | 'unknown' | 'restricted'
  created_at: string
  updated_at: string
}

export type SkillSortMode = 'quality' | 'downloads' | 'stars' | 'new' | 'trending' | 'fresh'

const SKILLS_PAGE_SIZE = 1000
const DEFAULT_SKILL_QUERY_LIMIT = 1200
const MAX_SKILL_QUERY_LIMIT = 4000
const ALL_SKILLS_CACHE_TTL_MS = 30 * 1000
const SHARED_SKILL_CACHE_REVALIDATE_SECONDS = 300
const CATEGORY_CACHE_REVALIDATE_SECONDS = 3600
const SKILL_DIRECTORY_REQUEST_TIMEOUT_MS = 1800
const SKILL_STATS_REQUEST_TIMEOUT_MS = 3000
// Exact lookups are correctness-critical. A cold database request can take a
// few seconds, so a directory-sized timeout would turn a live skill into a
// false 404.
const SKILL_LOOKUP_TIMEOUT_MS = 7000
const SKILL_LOOKUP_CACHE_REVALIDATE_SECONDS = 300
const SKILL_EXACT_SEARCH_TIMEOUT_MS = 2500
// Cold full-text responses include source/review evidence. A 1.5s outer
// deadline could expire before a successful ~2s response had been decoded.
const SKILL_BROAD_SEARCH_TIMEOUT_MS = 3500
// Sitemap refreshes run off the interactive navigation path. Give a cold
// registry shard enough time to return the complete URL set, then let the
// shared and edge caches keep that work away from visitors.
const SITEMAP_QUERY_TIMEOUT_MS = 6500
const SITEMAP_CACHE_REVALIDATE_SECONDS = 3600

// Public directory views do not need private submission contact data or long
// editorial suggestions. Keeping that payload out of high-volume list reads
// makes the same data much cheaper to cache and send to pages.
const SKILL_DIRECTORY_SELECT = [
  'id',
  'slug',
  'name',
  'description',
  'tagline',
  'author_name',
  'author_url',
  'repository',
  'github_repo',
  'github_stars',
  'github_forks',
  'category',
  'tags',
  'frameworks',
  'version',
  'license',
  'install_command',
  'npm_package',
  'verified',
  'publisher_verified',
  'submission_source',
  'submitted_by_agent',
  'ai_review_score',
  'ai_review_approved',
  'listing_status',
  'owner_publication',
  'ai_review_issues',
  'downloads',
  'used_by',
  'rating',
  'review_count',
  'quality_score',
  'quality_signals',
  'github_language',
  'github_last_pushed_at',
  'source_ref',
  'source_path',
  'source_commit_sha',
  'source_content_hash',
  'source_sync_status',
  'created_at',
  'updated_at',
].join(',')

const SKILL_TAXONOMY_SELECT = `${SKILL_DIRECTORY_SELECT},primary_category,taxonomy_tags,output_types,taxonomy_version`

export type SkillDirectoryResult = {
  records: SkillRecord[]
  degraded: boolean
  source: 'registry-cache' | 'last-good' | 'curated-snapshot'
}

type AllSkillsCacheEntry = {
  expiresAt: number
  lastSuccessAt?: number
  value?: SkillDirectoryResult
  promise?: Promise<SkillDirectoryResult>
}

const allSkillsCache = new Map<string, AllSkillsCacheEntry>()

export type SkillSitemapRecord = Pick<
  SkillRecord,
  | 'slug'
  | 'github_stars'
  | 'github_last_pushed_at'
  | 'created_at'
  | 'updated_at'
  | 'quality_score'
  | 'publisher_verified'
>

export interface SkillSitemapQueryOptions {
  offset?: number
  limit?: number
  minStars?: number
  minQualityScore?: number
}

function createSitemapClient(requestTimeoutMs = SITEMAP_QUERY_TIMEOUT_MS) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY) {
    return createAdminClient({ requestTimeoutMs, circuitScope: 'sitemap' })
  }

  return createPublicClient({ requestTimeoutMs, circuitScope: 'sitemap' })
}

type SkillOnlyScopeRecord = Pick<
  SkillRecord,
  'name' | 'description' | 'long_description' | 'tagline' | 'category' | 'tags' | 'frameworks' | 'github_repo'
>

function filterSkillOnly<T extends SkillOnlyScopeRecord>(records: T[]) {
  return records.filter((record) => !isMcpOnlySkillRecord(record))
}

function sortDirectorySkills(records: SkillRecord[], sort: SkillSortMode) {
  return records.slice().sort((left, right) => {
    if (sort === 'stars') return Number(right.github_stars || 0) - Number(left.github_stars || 0)
    if (sort === 'downloads' || sort === 'trending') {
      const downloadDifference = Number(right.downloads || 0) - Number(left.downloads || 0)
      return downloadDifference || Date.parse(right.created_at) - Date.parse(left.created_at)
    }
    if (sort === 'new') return Date.parse(right.created_at) - Date.parse(left.created_at)
    if (sort === 'fresh') {
      return Date.parse(right.github_last_pushed_at || right.updated_at) - Date.parse(left.github_last_pushed_at || left.updated_at)
    }

    const qualityDifference = Number(right.quality_score || 0) - Number(left.quality_score || 0)
    return qualityDifference || Number(right.github_stars || 0) - Number(left.github_stars || 0)
  })
}

function selectDirectorySkills(records: SkillRecord[], category: string | null, limit: number) {
  const scoped = category ? records.filter((record) => record.category === category) : records
  return scoped.slice(0, limit)
}

function getDirectoryFallback(
  sort: SkillSortMode,
  category: string | undefined,
  maxRows: number
): SkillRecord[] {
  const rows = filterSkillOnly(CURATED_SKILL_SNAPSHOT)
    .filter((skill) => !category || skill.category === category)

  return sortDirectorySkills(rows, sort).slice(0, maxRows)
}

const getSharedAllSkills = unstable_cache(
  async (sort: SkillSortMode, category: string | null, maxRows: number) => {
    // Only successful reads enter the shared cache. A failed refresh must
    // throw so Next retains its last good entry, not a smaller fallback.
    return packCacheJson(await fetchAllSkills(sort, category || undefined, maxRows))
  },
  ['public-skill-directory-v6-packed'],
  {
    revalidate: SHARED_SKILL_CACHE_REVALIDATE_SECONDS,
    tags: ['public-skill-directory'],
  }
)

export async function getAllSkills(
  sort: SkillSortMode = 'quality',
  category?: string,
  maxRows = DEFAULT_SKILL_QUERY_LIMIT
): Promise<SkillRecord[]> {
  return (await getSkillDirectory(sort, category, maxRows)).records
}

export async function getSkillDirectory(
  sort: SkillSortMode = 'quality',
  category?: string,
  maxRows = DEFAULT_SKILL_QUERY_LIMIT
): Promise<SkillDirectoryResult> {
  // Never let a page route load the complete registry. Listing, ranking, and
  // resolve flows need a bounded candidate set; the sitemap has its own
  // streaming query below for the rare whole-registry case.
  const rowLimit = Number.isFinite(maxRows)
    ? Math.min(MAX_SKILL_QUERY_LIMIT, Math.max(1, Math.floor(maxRows)))
    : DEFAULT_SKILL_QUERY_LIMIT
  const normalizedCategory = category && category !== 'all' ? category : null
  // Interactive pages usually render fewer than 100 records. Do not make
  // those navigations wait for a 1,200-row directory read. Small, medium, and
  // full consumers share bounded cache tiers instead.
  const sourceLimit = rowLimit <= 96
    ? 96
    : rowLimit <= 160
    ? 160
    : rowLimit <= 320
      ? 320
    : rowLimit <= 480
      ? 480
      : rowLimit <= 800
        ? 800
      : rowLimit <= DEFAULT_SKILL_QUERY_LIMIT
        ? DEFAULT_SKILL_QUERY_LIMIT
        : rowLimit
  // A category query is both smaller and more useful than reading a global
  // pool and hoping it contains enough rows for the requested category.
  const sourceCategory = normalizedCategory
  const cacheKey = `${sort}:${sourceCategory || 'all'}:${sourceLimit}`
  const now = Date.now()
  const cached = allSkillsCache.get(cacheKey)

  if (cached && cached.expiresAt > now) {
    if (cached.promise) return cached.promise.then((value) => ({ ...value, records: selectDirectorySkills(value.records, normalizedCategory, rowLimit) }))
    if (cached.value) return { ...cached.value, records: selectDirectorySkills(cached.value.records, normalizedCategory, rowLimit) }
  }

  // Bound warm-instance memory even when many categories are requested.
  if (allSkillsCache.size >= 64 && !allSkillsCache.has(cacheKey)) allSkillsCache.delete(allSkillsCache.keys().next().value!)
  const promise: Promise<SkillDirectoryResult> = getSharedAllSkills(sort, sourceCategory, sourceLimit)
    .then(async (packed) => ({ records: await unpackCacheJson<SkillRecord[]>(packed), degraded: false, source: 'registry-cache' as const }))
    .catch(() => {
      if (cached?.value && cached.value.source !== 'curated-snapshot' && now - (cached.lastSuccessAt || 0) < 15 * 60 * 1000) {
        return { ...cached.value, degraded: true, source: 'last-good' as const }
      }
      return { records: getDirectoryFallback(sort, normalizedCategory || undefined, sourceLimit), degraded: true, source: 'curated-snapshot' as const }
    })
  allSkillsCache.set(cacheKey, {
    ...cached,
    expiresAt: now + ALL_SKILLS_CACHE_TTL_MS,
    promise,
  })

  try {
    const value = await promise
    allSkillsCache.set(cacheKey, {
      expiresAt: Date.now() + ALL_SKILLS_CACHE_TTL_MS,
      lastSuccessAt: value.degraded ? cached?.lastSuccessAt : Date.now(),
      value,
    })
    return { ...value, records: selectDirectorySkills(value.records, normalizedCategory, rowLimit) }
  } catch (error) {
    allSkillsCache.delete(cacheKey)
    throw error
  }
}

async function fetchAllSkills(
  sort: SkillSortMode = 'quality',
  category?: string,
  maxRows = DEFAULT_SKILL_QUERY_LIMIT
): Promise<SkillRecord[]> {
  const supabase = createPublicClient({ requestTimeoutMs: SKILL_DIRECTORY_REQUEST_TIMEOUT_MS })
  const rows: SkillRecord[] = []

  for (let from = 0; ; from += SKILLS_PAGE_SIZE) {
    const remaining = maxRows - rows.length
    if (remaining <= 0) break
    const pageSize = Math.min(SKILLS_PAGE_SIZE, remaining)
    let query = supabase
      .from('skills')
      .select(SKILL_DIRECTORY_SELECT)
      .or(PUBLIC_SKILL_FILTER)

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Fetch from the matching indexed order. Sorting a quality-only shortlist
    // locally made global Stars/New/Fresh rankings incomplete even though the
    // UI claimed registry-wide coverage.
    if (sort === 'stars') {
      query = query.order('github_stars', { ascending: false }).order('quality_score', { ascending: false })
    } else if (sort === 'new') {
      query = query.order('created_at', { ascending: false }).order('quality_score', { ascending: false })
    } else if (sort === 'fresh') {
      query = query.order('github_last_pushed_at', { ascending: false, nullsFirst: false }).order('quality_score', { ascending: false })
    } else if (sort === 'downloads' || sort === 'trending') {
      query = query.order('downloads', { ascending: false }).order('created_at', { ascending: false })
    } else {
      query = query.order('quality_score', { ascending: false }).order('github_stars', { ascending: false })
    }

    const { data, error } = await query.range(from, from + pageSize - 1)
    if (error) throw error
    if (!data?.length) break

    rows.push(...(data as unknown as SkillRecord[]))
    if (data.length < pageSize) break
  }

  return sortDirectorySkills(filterSkillOnly(rows), sort)
}

// Sitemap traffic is bot-heavy and arrives across many server instances. A
// shared cache prevents every crawler hit from starting its own multi-thousand
// row database read. Revalidation failures must throw so Next's Data Cache
// retains its last successful value, never a smaller fallback presented as live.
// Cold-cache failures are handled as retryable 503s by the sitemap endpoints.
const getCachedApprovedSkillSitemapRecords = unstable_cache(
  async (
    offset: number,
    limit: number,
    minStars: number,
    minQualityScore: number
  ): Promise<SkillSitemapRecord[]> => {
    return fetchApprovedSkillSitemapRecords({ offset, limit, minStars, minQualityScore })
  },
  ['approved-sitemap-records-v14-partitioned'],
  {
    revalidate: SITEMAP_CACHE_REVALIDATE_SECONDS,
    tags: ['approved-sitemap-records'],
  }
)

const getCachedApprovedSkillSitemapCount = unstable_cache(
  async (minStars: number, minQualityScore: number): Promise<number> => {
    const [count, extra] = await Promise.all([
      getCachedLegacySitemapCount(minStars, minQualityScore),
      getCachedEditorialSitemapExtras(minStars, minQualityScore),
    ])
    return count + extra.length
  },
  ['approved-sitemap-count-v14-partitioned'],
  {
    revalidate: SITEMAP_CACHE_REVALIDATE_SECONDS,
    tags: ['approved-sitemap-count'],
  }
)

const SITEMAP_RECORD_SELECT = 'slug,github_stars,github_last_pushed_at,created_at,updated_at,quality_score,publisher_verified'

const getCachedLegacySitemapCount = unstable_cache(
  fetchApprovedSkillSitemapCount,
  ['approved-sitemap-legacy-count-v1'],
  { revalidate: SITEMAP_CACHE_REVALIDATE_SECONDS, tags: ['approved-sitemap-count'] }
)

async function fetchEditorialSitemapExtras(minStars: number, minQuality: number): Promise<SkillSitemapRecord[]> {
  const filter = buildEditorialSearchIndexFilter()
  if (!filter) return []
  const { data, error } = await createSitemapClient().from('skills')
    .select(`${SITEMAP_RECORD_SELECT},ai_review_approved`)
    .or(filter).order('slug', { ascending: true })
  if (error) throw error
  return ((data || []) as (SkillSitemapRecord & { ai_review_approved: boolean })[])
    .filter(row => !matchesLegacySearchIndex(row, minStars, minQuality))
}

const getCachedEditorialSitemapExtras = unstable_cache(
  fetchEditorialSitemapExtras,
  ['approved-sitemap-editorial-extras-v1'],
  { revalidate: SITEMAP_CACHE_REVALIDATE_SECONDS, tags: ['approved-sitemap-count', 'approved-sitemap-records'] }
)

/** Capture metadata once, then read every shard without older page/count caches. */
export async function getApprovedSkillSitemapSource(minStars: number, minQualityScore: number) {
  const [legacyCount, extra] = await Promise.all([
    fetchApprovedSkillSitemapCount(minStars, minQualityScore),
    fetchEditorialSitemapExtras(minStars, minQualityScore),
  ])
  return {
    count: legacyCount + extra.length,
    read: (offset: number, limit: number) => fetchApprovedSkillSitemapRecords(
      { offset, limit, minStars, minQualityScore }, { legacyCount, extra }
    ),
  }
}

export async function getApprovedSkillSitemapRecords(
  options: SkillSitemapQueryOptions = {}
): Promise<SkillSitemapRecord[]> {
  const offset = Math.max(0, Math.floor(options.offset || 0))
  const rowLimit = Number.isFinite(options.limit)
    ? Math.max(1, Math.floor(options.limit || 1))
    : MAX_SKILL_QUERY_LIMIT
  const minStars = Math.max(0, Math.floor(options.minStars || 0))
  const minQualityScore = Math.max(0, Math.floor(options.minQualityScore || 0))

  return getCachedApprovedSkillSitemapRecords(offset, rowLimit, minStars, minQualityScore)
}

async function fetchApprovedSkillSitemapRecords(
  options: Required<SkillSitemapQueryOptions>,
  source?: { legacyCount: number; extra: SkillSitemapRecord[] }
): Promise<SkillSitemapRecord[]> {
  const supabase = createSitemapClient()
  const rows: SkillSitemapRecord[] = []
  const [legacyCount, extra] = source ? [source.legacyCount, source.extra] : await Promise.all([
    getCachedLegacySitemapCount(options.minStars, options.minQualityScore),
    getCachedEditorialSitemapExtras(options.minStars, options.minQualityScore),
  ])

  for (let from = options.offset; from < legacyCount; from += SKILLS_PAGE_SIZE) {
    const remaining = options.limit - rows.length
    if (remaining <= 0) break
    const pageSize = Math.min(SKILLS_PAGE_SIZE, remaining, legacyCount - from)
    const query = supabase
      .from('skills')
      .select(SITEMAP_RECORD_SELECT)
      .or(buildLegacySearchIndexFilter(options.minStars, options.minQualityScore))
      .order('quality_score', { ascending: false, nullsFirst: false })
      .order('slug', { ascending: true })

    const { data, error } = await query.range(from, from + pageSize - 1)

    if (error) throw error
    if (!data?.length) break

    rows.push(...(data as SkillSitemapRecord[]))
    if (data.length < pageSize) break
  }

  rows.push(...extra.slice(Math.max(0, options.offset - legacyCount), Math.max(0, options.offset - legacyCount) + Math.max(0, options.limit - rows.length)))
  return rows
}

export async function getApprovedSkillSitemapCount(minStars = 0, minQualityScore = 0, fresh = false): Promise<number> {
  const normalizedMinStars = Math.max(0, Math.floor(minStars || 0))
  const normalizedMinQualityScore = Math.max(0, Math.floor(minQualityScore || 0))
  if (fresh) {
    const [count, extra] = await Promise.all([
      fetchApprovedSkillSitemapCount(normalizedMinStars, normalizedMinQualityScore),
      fetchEditorialSitemapExtras(normalizedMinStars, normalizedMinQualityScore),
    ])
    return count + extra.length
  }
  return getCachedApprovedSkillSitemapCount(normalizedMinStars, normalizedMinQualityScore)
}

async function fetchApprovedSkillSitemapCount(minStars: number, minQualityScore: number): Promise<number> {
  const supabase = createSitemapClient()

  // The general registry counter also includes owner/static publications. It
  // cannot count this narrower SEO set, even when no numeric floors are used.
  const query = supabase
    .from('skills')
    // This result is cached for one hour. An exact indexed count prevents the
    // planner estimate from creating empty sitemap shards or hiding valid ones.
    .select('slug', { count: 'exact', head: true })
    .or(buildLegacySearchIndexFilter(minStars, minQualityScore))

  const { count, error } = await query
  if (error) throw error
  if (count === null) throw new Error('Sitemap count unavailable')
  return count
}

export interface SkillAgentStats {
  total_calls: number
  success_calls: number
  success_rate: number | null
  avg_latency_ms: number | null
  unique_agents: number
  last_called_at: string | null
}

export interface SkillOutcomeStats {
  skill_slug: string
  total_outcomes: number
  successful_outcomes: number
  failed_outcomes: number
  not_relevant_outcomes: number
  risk_blocked_outcomes: number
  setup_required_outcomes: number
  install_attempts: number
  verified_installs: number
  success_rate: number | null
  install_success_rate?: number | null
  avg_output_quality?: number | null
  avg_time_to_useful_ms?: number | null
  production_outcomes?: number
  human_review_required_outcomes?: number
  low_quality_outcomes?: number
  recent_outcomes_30d?: number
  recent_successful_outcomes_30d?: number
  recent_failed_outcomes_30d?: number
  recent_success_rate?: number | null
  recent_failure_rate?: number | null
  unique_agents?: number
  agent_proven_score?: number | null
  last_success_at?: string | null
  last_failure_at?: string | null
  last_outcome_at: string | null
  updated_at: string
}

export interface SkillEventStats {
  skill_slug: string
  total_events: number
  views: number
  install_copies: number
  saves: number
  compares: number
  outbound_clicks: number
  claim_starts: number
  claim_submits: number
  resolve_requests: number
  install_starts: number
  install_successes: number
  install_failures: number
  agent_calls: number
  outcome_successes: number
  outcome_failures: number
  share_copies: number
  last_event_at: string | null
  updated_at: string
}

export interface SkillEventDailyStats {
  skill_slug: string
  event_date: string
  total_events: number
  views: number
  install_copies: number
  saves: number
  compares: number
  outbound_clicks: number
  claim_starts: number
  claim_submits: number
  resolve_requests: number
  install_starts: number
  install_successes: number
  install_failures: number
  agent_calls: number
  outcome_successes: number
  outcome_failures: number
  share_copies: number
  first_event_at: string | null
  last_event_at: string | null
  updated_at: string
}

export type SkillAuditRiskLevel = 'safe_to_try' | 'needs_review' | 'risky'

export interface SkillAuditRecord {
  skill_slug: string
  audit_score: number
  risk_level: SkillAuditRiskLevel
  quality_score: number
  trust_score: number
  maintenance_score: number
  security_score: number
  install_score: number
  checks: Array<Record<string, unknown>>
  signals: Array<Record<string, unknown>>
  warnings: string[]
  metadata: Record<string, unknown>
  generated_at: string
  updated_at: string
}

export interface SkillClaimRecord {
  id: string
  skill_slug: string
  user_id: string
  github_username: string | null
  x_username: string | null
  repo_url: string | null
  verification_method: string
  evidence_url: string | null
  evidence_note: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewer_note: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  verified_at: string | null
  verification_tier: 'maintainer' | 'official'
  challenge_expires_at?: string | null
}

/**
 * 获取所有 skill 的 Agent 调用统计
 * 返回以 slug 为 key 的 map
 */
const getCachedSkillStats = unstable_cache(
  async (): Promise<Record<string, SkillAgentStats>> => {
  const supabase = createPublicClient({ requestTimeoutMs: SKILL_STATS_REQUEST_TIMEOUT_MS })
  const { data, error } = await supabase.from('skill_stats').select('*')
  if (error) throw error
  if (!data) return {}

  const map: Record<string, SkillAgentStats> = {}
  for (const row of data) {
    map[row.skill_slug] = {
      total_calls: row.total_calls,
      success_calls: row.success_calls,
      success_rate: row.success_rate,
      avg_latency_ms: row.avg_latency_ms,
      unique_agents: row.unique_agents,
      last_called_at: row.last_called_at,
    }
  }
  return map
  },
  ['public-skill-agent-stats-v3'],
  { revalidate: SHARED_SKILL_CACHE_REVALIDATE_SECONDS, tags: ['public-skill-stats'] }
)

export async function getSkillStats(): Promise<Record<string, SkillAgentStats>> {
  return getCachedSkillStats().catch(() => ({}))
}

const getCachedAgentOutcomeStatsMap = unstable_cache(
  async (): Promise<Record<string, SkillOutcomeStats>> => {
  const supabase = createPublicClient({ requestTimeoutMs: SKILL_STATS_REQUEST_TIMEOUT_MS })
  const { data, error } = await supabase.from('agent_outcome_stats').select('*')
  if (error) throw error
  if (!data) return {}

  const map: Record<string, SkillOutcomeStats> = {}
  for (const row of data as Array<Record<string, any>>) {
    map[row.skill_slug] = {
      skill_slug: row.skill_slug,
      total_outcomes: Number(row.total_outcomes || 0),
      successful_outcomes: Number(row.successful_outcomes || 0),
      failed_outcomes: Number(row.failed_outcomes || 0),
      not_relevant_outcomes: Number(row.not_relevant_outcomes || 0),
      risk_blocked_outcomes: Number(row.risk_blocked_outcomes || 0),
      setup_required_outcomes: Number(row.setup_required_outcomes || 0),
      install_attempts: Number(row.install_attempts || 0),
      verified_installs: Number(row.verified_installs || 0),
      success_rate: row.success_rate === null || row.success_rate === undefined ? null : Number(row.success_rate),
      install_success_rate: row.install_success_rate === null || row.install_success_rate === undefined ? null : Number(row.install_success_rate),
      avg_output_quality: row.avg_output_quality === null || row.avg_output_quality === undefined ? null : Number(row.avg_output_quality),
      avg_time_to_useful_ms: row.avg_time_to_useful_ms === null || row.avg_time_to_useful_ms === undefined ? null : Number(row.avg_time_to_useful_ms),
      production_outcomes: Number(row.production_outcomes || 0),
      human_review_required_outcomes: Number(row.human_review_required_outcomes || 0),
      low_quality_outcomes: Number(row.low_quality_outcomes || 0),
      recent_outcomes_30d: Number(row.recent_outcomes_30d || 0),
      recent_successful_outcomes_30d: Number(row.recent_successful_outcomes_30d || 0),
      recent_failed_outcomes_30d: Number(row.recent_failed_outcomes_30d || 0),
      recent_success_rate: row.recent_success_rate === null || row.recent_success_rate === undefined ? null : Number(row.recent_success_rate),
      recent_failure_rate: row.recent_failure_rate === null || row.recent_failure_rate === undefined ? null : Number(row.recent_failure_rate),
      unique_agents: Number(row.unique_agents || 0),
      agent_proven_score: row.agent_proven_score === null || row.agent_proven_score === undefined ? null : Number(row.agent_proven_score),
      last_success_at: row.last_success_at || null,
      last_failure_at: row.last_failure_at || null,
      last_outcome_at: row.last_outcome_at || null,
      updated_at: row.updated_at,
    }
  }
  return map
  },
  ['public-agent-outcome-stats-v2'],
  { revalidate: SHARED_SKILL_CACHE_REVALIDATE_SECONDS, tags: ['public-skill-outcomes'] }
)

export async function getAgentOutcomeStatsMap(): Promise<Record<string, SkillOutcomeStats>> {
  return getCachedAgentOutcomeStatsMap().catch(() => ({}))
}

export async function getAgentOutcomeStatsMapStrict(): Promise<Record<string, SkillOutcomeStats>> {
  return getCachedAgentOutcomeStatsMap()
}

export async function getAgentOutcomeStats(skillSlug: string, strict = false): Promise<SkillOutcomeStats | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('agent_outcome_stats')
    .select('*')
    .eq('skill_slug', skillSlug)
    .maybeSingle()

  if (error && strict) throw error
  if (error || !data) return null
  const row = data as Record<string, any>
  return {
    skill_slug: row.skill_slug,
    total_outcomes: Number(row.total_outcomes || 0),
    successful_outcomes: Number(row.successful_outcomes || 0),
    failed_outcomes: Number(row.failed_outcomes || 0),
    not_relevant_outcomes: Number(row.not_relevant_outcomes || 0),
    risk_blocked_outcomes: Number(row.risk_blocked_outcomes || 0),
    setup_required_outcomes: Number(row.setup_required_outcomes || 0),
    install_attempts: Number(row.install_attempts || 0),
    verified_installs: Number(row.verified_installs || 0),
    success_rate: row.success_rate === null || row.success_rate === undefined ? null : Number(row.success_rate),
    install_success_rate: row.install_success_rate === null || row.install_success_rate === undefined ? null : Number(row.install_success_rate),
    avg_output_quality: row.avg_output_quality === null || row.avg_output_quality === undefined ? null : Number(row.avg_output_quality),
    avg_time_to_useful_ms: row.avg_time_to_useful_ms === null || row.avg_time_to_useful_ms === undefined ? null : Number(row.avg_time_to_useful_ms),
    production_outcomes: Number(row.production_outcomes || 0),
    human_review_required_outcomes: Number(row.human_review_required_outcomes || 0),
    low_quality_outcomes: Number(row.low_quality_outcomes || 0),
    recent_outcomes_30d: Number(row.recent_outcomes_30d || 0),
    recent_successful_outcomes_30d: Number(row.recent_successful_outcomes_30d || 0),
    recent_failed_outcomes_30d: Number(row.recent_failed_outcomes_30d || 0),
    recent_success_rate: row.recent_success_rate === null || row.recent_success_rate === undefined ? null : Number(row.recent_success_rate),
    recent_failure_rate: row.recent_failure_rate === null || row.recent_failure_rate === undefined ? null : Number(row.recent_failure_rate),
    unique_agents: Number(row.unique_agents || 0),
    agent_proven_score: row.agent_proven_score === null || row.agent_proven_score === undefined ? null : Number(row.agent_proven_score),
    last_success_at: row.last_success_at || null,
    last_failure_at: row.last_failure_at || null,
    last_outcome_at: row.last_outcome_at || null,
    updated_at: row.updated_at,
  }
}

const getCachedSkillEventStatsMap = unstable_cache(
  async (): Promise<Record<string, SkillEventStats>> => {
  const supabase = createPublicClient({ requestTimeoutMs: SKILL_STATS_REQUEST_TIMEOUT_MS })
  const { data, error } = await supabase.from('skill_event_stats').select('*')
  if (error) throw error
  if (!data) return {}

  const map: Record<string, SkillEventStats> = {}
  for (const row of data as SkillEventStats[]) {
    map[row.skill_slug] = row
  }
  return map
  },
  ['public-skill-event-stats-v3'],
  { revalidate: SHARED_SKILL_CACHE_REVALIDATE_SECONDS, tags: ['public-skill-events'] }
)

export async function getSkillEventStatsMap(): Promise<Record<string, SkillEventStats>> {
  return getCachedSkillEventStatsMap().catch(() => ({}))
}

export async function getSkillEventStats(skillSlug: string, strict = false): Promise<SkillEventStats | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('skill_event_stats')
    .select('*')
    .eq('skill_slug', skillSlug)
    .maybeSingle()

  if (error && strict) throw error
  if (error || !data) return null
  return data as SkillEventStats
}

export async function getSkillEventDailyStats(days = 7): Promise<SkillEventDailyStats[]> {
  const supabase = createPublicClient()
  const since = new Date(Date.now() - Math.max(1, days) * 86_400_000).toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('skill_events_daily')
    .select('*')
    .gte('event_date', since)
    .order('event_date', { ascending: false })

  if (error || !data) return []
  return data as SkillEventDailyStats[]
}

export async function getSkillEventDailyStatsMap(days = 7): Promise<Record<string, SkillEventDailyStats[]>> {
  const rows = await getSkillEventDailyStats(days)
  const map: Record<string, SkillEventDailyStats[]> = {}
  for (const row of rows) {
    if (!map[row.skill_slug]) map[row.skill_slug] = []
    map[row.skill_slug].push(row)
  }
  return map
}

export async function getSkillAuditBySlug(skillSlug: string): Promise<SkillAuditRecord | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('skill_audits')
    .select('*')
    .eq('skill_slug', skillSlug)
    .maybeSingle()

  if (error || !data) return null
  return data as SkillAuditRecord
}

const getCachedSkillAuditsMap = unstable_cache(
  async (slugs: string[]): Promise<Record<string, SkillAuditRecord>> => {
    const signal = AbortSignal.timeout(SKILL_STATS_REQUEST_TIMEOUT_MS)
    const supabase = createPublicClient({ requestTimeoutMs: SKILL_STATS_REQUEST_TIMEOUT_MS, circuitScope: 'skill-support' })
    const map: Record<string, SkillAuditRecord> = {}
    let next = 0
    // Small URL-safe batches, two requests at most, one deadline for the
    // entire read. Never traverse unrelated audit records or cache a partial
    // map when a batch fails.
    const worker = async () => {
      while (next < slugs.length) {
        signal.throwIfAborted()
        const batch = slugs.slice(next, next + 80)
        next += batch.length
        const { data, error } = await supabase.from('skill_audits').select('*')
          .in('skill_slug', batch).limit(batch.length).abortSignal(signal)
        if (error) throw error
        for (const row of (data || []) as SkillAuditRecord[]) map[row.skill_slug] = row
      }
    }
    await Promise.all([worker(), worker()])
    return map
  },
  ['public-skill-audits-by-slug-v1'],
  { revalidate: SHARED_SKILL_CACHE_REVALIDATE_SECONDS, tags: ['public-skill-audits'] }
)

const readCoalescedAuditMap = createCoalescedCache<Record<string, SkillAuditRecord>>({
  ttlMs: ALL_SKILLS_CACHE_TTL_MS, maxEntries: 16, cacheWhen: () => true,
})

export async function getSkillAuditsMap(skillSlugs: string[]): Promise<Record<string, SkillAuditRecord>> {
  const slugs = [...new Set(skillSlugs)].sort()
  if (slugs.length > DEFAULT_SKILL_QUERY_LIMIT) throw new Error('Audit shortlist exceeds its query budget')
  if (!slugs.length) return {}
  return readCoalescedAuditMap(JSON.stringify(slugs), () => getCachedSkillAuditsMap(slugs))
}

export async function getApprovedClaimBySkillSlug(skillSlug: string, strict = false): Promise<SkillClaimRecord | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('skill_claims')
    .select('id,skill_slug,user_id,github_username,x_username,repo_url,verification_method,evidence_url,evidence_note,status,reviewer_note,metadata,created_at,updated_at,verified_at,verification_tier,challenge_expires_at')
    .eq('skill_slug', skillSlug)
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error && strict) throw error
  if (error || !data) return null
  return data as SkillClaimRecord
}

const getCachedCategories = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createPublicClient({ requestTimeoutMs: SKILL_STATS_REQUEST_TIMEOUT_MS })
    const categories = new Set<string>()

    // Category values change infrequently. A capped, shared scan is much less
    // expensive than walking every approved row for every /skills request.
    for (let from = 0; from < MAX_SKILL_QUERY_LIMIT; from += SKILLS_PAGE_SIZE) {
      const { data, error } = await supabase
        .from('skills')
        .select('category')
        .or(PUBLIC_SKILL_FILTER)
        .range(from, from + SKILLS_PAGE_SIZE - 1)

      if (error) throw error
      if (!data?.length) break
      for (const row of data) {
        if (row.category) categories.add(row.category)
      }
      if (data.length < SKILLS_PAGE_SIZE) break
    }

    return [...categories]
      .filter((category) => !isMcpOnlyCategory(category))
      .sort()
  },
  ['public-skill-categories-v3'],
  { revalidate: CATEGORY_CACHE_REVALIDATE_SECONDS, tags: ['public-skill-directory'] }
)

export async function getCategories(): Promise<string[]> {
  return getCachedCategories().catch(() => [])
}

function normalizeSkillLookupSlug(slug: string) {
  const normalized = slug.trim().toLowerCase()
  return /^[a-z0-9][a-z0-9-]{0,159}$/.test(normalized) ? normalized : null
}

// Detail pages, badges, manifests, and social crawlers all resolve skills by
// slug. Cache matches and genuine misses, but let transient errors escape so
// they are never stored as a false missing record.
const getCachedSkillBySlug = unstable_cache(
  async (slug: string): Promise<SkillRecord | null> => {
    const supabase = createPublicClient({ requestTimeoutMs: SKILL_LOOKUP_TIMEOUT_MS, circuitScope: 'skill-lookup' })
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('slug', slug)
      .or(PUBLIC_SKILL_FILTER)
      .maybeSingle()

    if (error) throw error
    if (!data || isMcpOnlySkillRecord(data)) return null
    return data as SkillRecord
  },
  ['public-skill-by-slug-v3'],
  {
    revalidate: SKILL_LOOKUP_CACHE_REVALIDATE_SECONDS,
    tags: ['public-skill-directory'],
  }
)

export async function getSkillBySlugStrict(slug: string): Promise<SkillRecord | null> {
  const normalized = normalizeSkillLookupSlug(slug)
  if (!normalized) return null

  return getCachedSkillBySlug(normalized)
}

export async function getSkillBySlug(slug: string): Promise<SkillRecord | null> {

  try {
    return await getSkillBySlugStrict(slug)
  } catch (error) {
    console.warn('Skill slug lookup fallback:', error)
    return null
  }
}

export async function getSkillsBySlugs(
  slugs: string[],
  requestTimeoutMs = SKILL_LOOKUP_TIMEOUT_MS
): Promise<SkillRecord[]> {
  const normalizedSlugs = Array.from(new Set(slugs.map((slug) => slug.trim()).filter(Boolean)))
  if (!normalizedSlugs.length) return []

  const timeoutMs = Math.max(SKILL_LOOKUP_TIMEOUT_MS, requestTimeoutMs)
  const supabase = createPublicClient({ requestTimeoutMs: timeoutMs })
  const { data, error } = await withTimeout(
    supabase
      .from('skills')
      .select('*')
      .or(PUBLIC_SKILL_FILTER)
      .in('slug', normalizedSlugs),
    timeoutMs,
    'skill batch slug lookup'
  ).catch((lookupError) => {
    console.warn('Skill batch slug lookup fallback:', lookupError)
    return { data: null, error: lookupError }
  })

  if (error || !data) return []

  const bySlug = new Map(
    filterSkillOnly(data as SkillRecord[]).map((skill) => [skill.slug, skill])
  )

  return normalizedSlugs
    .map((slug) => bySlug.get(slug))
    .filter((skill): skill is SkillRecord => Boolean(skill))
}

export async function createSkill(skill: Partial<SkillRecord>): Promise<SkillRecord> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('skills')
    .insert(skill)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function createSubmissionRecord(submission: {
  skill_id: string
  github_repo: string
  submission_source: string
  submitted_by_agent?: string
  ai_review_result: any
  status: string
}) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('skill_submissions')
    .insert(submission)
    .select()
    .single()
  
  if (error) throw error
  return data
}

function isMissingSearchDocumentError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const message = `${(error as { code?: string }).code || ''} ${(error as { message?: string }).message || ''}`
  return /search_document|42703/i.test(message)
}

async function searchSkillsWithLegacyFilter(
  searchTerms: string[],
  limit: number
): Promise<SkillRecord[]> {
  const supabase = createPublicClient({ requestTimeoutMs: SKILL_BROAD_SEARCH_TIMEOUT_MS })
  const fields = ['slug', 'name', 'description', 'long_description', 'tagline', 'category', 'github_repo', 'repository']
  const filter = searchTerms
    .flatMap((term) => fields.map((field) => `${field}.ilike.%${term}%`))
    .join(',')
  const { data, error } = await supabase
    .from('skills')
    .select(SKILL_DIRECTORY_SELECT)
    .or(PUBLIC_SKILL_FILTER)
    .or(filter)
    .order('quality_score', { ascending: false })
    .limit(limit)

  if (error) throw error
  return filterSkillOnly((data || []) as unknown as SkillRecord[])
}

async function fetchSearchSkills(normalizedQuery: string, limit: number): Promise<SkillRecord[]> {
  const searchTerms = getSearchTerms(normalizedQuery)
  const supabase = createPublicClient({ requestTimeoutMs: SKILL_BROAD_SEARCH_TIMEOUT_MS })
  const fullTextQuery = searchTerms.map((term) => term.replace(/[^a-z0-9-]/g, '')).filter(Boolean).join(' OR ')

  let { data, error } = await supabase
    .rpc('search_public_skills', { p_query: fullTextQuery || normalizedQuery, p_limit: limit })
    .select(SKILL_DIRECTORY_SELECT)

  // Older preview/local databases may not have the additive migration yet.
  // Do not replay a timeout or an arbitrary database failure as another query.
  if (error && ['PGRST202', '42883'].includes(error.code || '')) {
    const fallback = await supabase.from('skills').select(SKILL_DIRECTORY_SELECT)
      .or(PUBLIC_SKILL_FILTER)
      .textSearch('search_document', fullTextQuery || normalizedQuery, { config: 'simple', type: 'websearch' })
      .order('quality_score', { ascending: false }).limit(limit)
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    // Keep deploys backward compatible while a database migration is rolling
    // out. Once the generated tsvector exists, normal searches always use the
    // indexed path above instead of a large ILIKE OR scan.
    if (isMissingSearchDocumentError(error)) {
      return searchSkillsWithLegacyFilter(searchTerms, limit)
    }
    throw error
  }

  return filterSkillOnly((data || []) as unknown as SkillRecord[])
}

const getCachedSearchSkills = unstable_cache(
  async (normalizedQuery: string, limit: number) => fetchSearchSkills(normalizedQuery, limit),
  ['public-skill-search-v6-indexed-matches'],
  { revalidate: SHARED_SKILL_CACHE_REVALIDATE_SECONDS, tags: ['public-skill-directory'] }
)

const getCachedExactSearchPart = unstable_cache(
  async (field: 'slug' | 'name', exactQuery: string): Promise<string> => {
    const supabase = createPublicClient({ requestTimeoutMs: SKILL_EXACT_SEARCH_TIMEOUT_MS, circuitScope: 'skill-search' })
    let { data, error } = await (field === 'slug'
      ? supabase.from('skills').select(SKILL_DIRECTORY_SELECT).or(PUBLIC_SKILL_FILTER).eq('slug', exactQuery).limit(4)
      : supabase.rpc('lookup_public_skill_name', { p_name: exactQuery }).select(SKILL_DIRECTORY_SELECT))
    if (field === 'name' && error && ['PGRST202', '42883'].includes(error.code || '')) {
      const fallback = await supabase.from('skills').select(SKILL_DIRECTORY_SELECT).or(PUBLIC_SKILL_FILTER).ilike('name', exactQuery).limit(8)
      data = fallback.data
      error = fallback.error
    }
    if (error) throw error
    return packCacheJson(data || [])
  },
  ['public-exact-search-parts-v2-public-name'],
  { revalidate: SHARED_SKILL_CACHE_REVALIDATE_SECONDS, tags: ['public-skill-directory'] }
)

async function fetchExactSearchSkills(query: string): Promise<{ records: SkillRecord[]; degraded: boolean }> {
  const exactQuery = normalizeExactSearchQuery(query).toLowerCase()
  if (!exactQuery) return { records: [], degraded: false }
  const results = await Promise.allSettled([
    getCachedExactSearchPart('slug', exactQuery).then(packed => unpackCacheJson<SkillRecord[]>(packed)),
    getCachedExactSearchPart('name', exactQuery).then(packed => unpackCacheJson<SkillRecord[]>(packed)),
  ])
  // Cache the two successful reads independently. An unavailable sibling must
  // not poison the cache or hide a definitive exact match from the healthy read.
  const collected = collectSearchResults(results, 12)
  return { ...collected, records: filterSkillOnly(collected.records) }
}

function mergeSearchMatches(exactMatches: SkillRecord[], broadMatches: SkillRecord[], rowLimit: number) {
  return collectSearchResults([
    { status: 'fulfilled', value: exactMatches },
    { status: 'fulfilled', value: broadMatches },
  ], rowLimit).records
}

const readCoalescedSearch = createCoalescedCache<{ records: SkillRecord[]; degraded: boolean }>({
  ttlMs: 60_000, maxEntries: 64, cacheWhen: result => !result.degraded,
})

export async function searchSkillsWithStatus(query: string, limit = 120) {
  const normalized = normalizeExactSearchQuery(query).toLowerCase()
  if (!normalized) return { records: [] as SkillRecord[], degraded: false }
  const rowLimit = Math.min(Math.max(Math.floor(limit) || 1, 1), 200)
  return readCoalescedSearch(JSON.stringify([normalized, rowLimit]), () => fetchSearchSkillsWithStatus(normalized, rowLimit))
}

async function fetchSearchSkillsWithStatus(query: string, limit = 120) {
  const normalizedQuery = normalizeExactSearchQuery(query)
  if (!normalizedQuery) return { records: [] as SkillRecord[], degraded: false }

  const rowLimit = Math.min(Math.max(Math.floor(limit) || 1, 1), 200)
  const results = await Promise.allSettled([
    withTimeout(
      fetchExactSearchSkills(normalizedQuery),
      SKILL_EXACT_SEARCH_TIMEOUT_MS,
      'exact skill search'
    ),
    withTimeout(
      getCachedSearchSkills(normalizedQuery.toLowerCase(), rowLimit),
      SKILL_BROAD_SEARCH_TIMEOUT_MS,
      'broad skill search'
    ),
  ])
  const [exact, broad] = results
  const collected = collectSearchResults([
    exact.status === 'fulfilled' ? { status: 'fulfilled', value: exact.value.records } : exact,
    broad,
  ], rowLimit)
  return { ...collected, degraded: collected.degraded || (exact.status === 'fulfilled' && exact.value.degraded) }
}

function applyTaxonomyFilters<T extends { eq: (column: string, value: string) => T; contains: (column: string, value: string[]) => T; or: (filters: string) => T }>(query: T, category: string, topic: string, output: string): T {
  const primary = normalizeSkillCategory(category)
  if (category !== 'all') {
    if (primary) query = query.eq('primary_category', primary)
    else {
      const terms = directoryCategoryTerms(category)
      query = terms.length ? query.or(terms.map(term => `category.ilike.*${term}*`).join(',')) : query.eq('primary_category', '__unknown__')
    }
  }
  if (topic !== 'all') query = query.contains('taxonomy_tags', [topic])
  if (output !== 'all') query = query.contains('output_types', [output])
  return query
}

// Apply discoverability filters BEFORE limiting the pool. Otherwise the top
// 96 generic repositories can hide valid source-recorded skills entirely.
const getCachedBrowseCandidates = unstable_cache(
  async (sort: SkillSortMode, category: string, limit: number, sourceOnly: boolean, minStars: number, pricing: PriceFilter, pricingSlugs: string[], topic: string, output: string) => {
    const supabase = createPublicClient({ requestTimeoutMs: SKILL_DIRECTORY_REQUEST_TIMEOUT_MS })
    let query = supabase.from('skills').select(SKILL_TAXONOMY_SELECT).or(PUBLIC_SKILL_FILTER)
    if (pricing !== 'all' && pricing !== 'unknown') {
      if (!pricingSlugs.length) return packCacheJson([])
      query = query.in('slug', pricingSlugs)
    } else if (pricing === 'unknown' && pricingSlugs.length) query = query.not('slug', 'in', `(${pricingSlugs.join(',')})`)
    if (sourceOnly) query = query.or('source_path.ilike.*SKILL.md,ai_review_score->>skill_path.ilike.*SKILL.md')
    if (minStars > 0) query = query.gte('github_stars', minStars)
    query = applyTaxonomyFilters(query, category, topic, output)
    const order = sort === 'stars' ? 'github_stars' : sort === 'new' ? 'created_at'
      : sort === 'fresh' ? 'github_last_pushed_at' : sort === 'downloads' || sort === 'trending' ? 'downloads' : 'quality_score'
    const { data, error } = await query.order(order, { ascending: false, nullsFirst: false })
      .order('github_stars', { ascending: false }).order('slug', { ascending: true }).limit(limit)
    if (error) throw error
    return packCacheJson(filterSkillOnly((data || []) as unknown as SkillRecord[]))
  },
  ['skills-browse-candidates-v4-taxonomy'],
  { revalidate: 300, tags: ['public-skill-directory'] }
)

export async function getBrowseSkillCandidates(sort: SkillSortMode, category: string, limit: number, sourceOnly: boolean, minStars: number, pricing: PriceFilter = 'all', topic = 'all', output = 'all') {
  const size = Math.min(480, Math.max(96, Math.ceil(limit / 96) * 96))
  const stars = Number.isFinite(minStars) ? Math.min(1_000_000_000, Math.max(0, Math.floor(minStars))) : 0
  const packed = await getCachedBrowseCandidates(sort, category, size, sourceOnly, stars, pricing, commerceFilterSlugs(pricing), normalizeTopic(topic), normalizeOutput(output))
  return { records: await unpackCacheJson<SkillRecord[]>(packed), degraded: false }
}

// True database pagination, not another increasingly large candidate pool.
// Count describes public registry entries; the UI separately labels the number
// of visible skills because MCP-only resources are omitted, as on detail pages.
const getCachedCatalogPage = unstable_cache(
  async (sort: SkillSortMode, category: string, page: number, minStars: number, pricing: PriceFilter, pricingSlugs: string[], exampleSlugs: string[] | null, topic: string, output: string) => {
    // Optional bulk reads must not open the main directory's circuit.
    const supabase = createPublicClient({ requestTimeoutMs: 8000, circuitScope: 'public-catalog' })
    let query = supabase.from('skills').select(SKILL_TAXONOMY_SELECT, { count: 'exact' }).or(PUBLIC_SKILL_FILTER)
    if (pricing !== 'all' && pricing !== 'unknown') {
      if (!pricingSlugs.length) return { records: [] as SkillRecord[], total: 0, hasMore: false }
      query = query.in('slug', pricingSlugs)
    } else if (pricing === 'unknown' && pricingSlugs.length) query = query.not('slug', 'in', `(${pricingSlugs.join(',')})`)
    if (exampleSlugs !== null) {
      if (!exampleSlugs.length) return { records: [] as SkillRecord[], total: 0, hasMore: false }
      query = query.in('slug', exampleSlugs)
    }
    if (minStars > 0) query = query.gte('github_stars', minStars)
    query = applyTaxonomyFilters(query, category, topic, output)
    const from = (page - 1) * CATALOG_PAGE_SIZE
    const { data, count, error } = await query
      .order(catalogSortColumn(sort), { ascending: false, nullsFirst: false })
      .order('slug', { ascending: true }).range(from, from + CATALOG_PAGE_SIZE - 1)
    if (error) throw error
    if (count === null) throw new Error('Catalog count unavailable')
    return { records: filterSkillOnly((data || []) as unknown as SkillRecord[]), total: count, hasMore: from + CATALOG_PAGE_SIZE < count }
  },
  ['public-catalog-pages-v5-taxonomy'],
  { revalidate: 300, tags: ['public-skill-directory'] }
)

export function getSkillCatalogPage(sort: SkillSortMode, category: string, page: number, minStars: number, pricing: PriceFilter = 'all', exampleSlugs: string[] | null = null, topic = 'all', output = 'all') {
  return getCachedCatalogPage(sort, category.slice(0, 80), catalogPageNumber(String(page)), catalogStars(minStars), pricing, commerceFilterSlugs(pricing), exampleSlugs, normalizeTopic(topic), normalizeOutput(output))
}

export async function searchSkillsStrict(query: string, limit = 120): Promise<SkillRecord[]> {
  return (await searchSkillsWithStatus(query, limit)).records
}

export async function searchSkills(query: string, limit = 120): Promise<SkillRecord[]> {
  const normalizedQuery = normalizeExactSearchQuery(query)
  if (!normalizedQuery) return []
  const rowLimit = Math.min(Math.max(Math.floor(limit) || 1, 1), 200)

  try {
    return await searchSkillsStrict(normalizedQuery, rowLimit)
  } catch (error) {
    console.warn('Exact skill search fallback:', error)
    const broadMatches = await withTimeout(
      getCachedSearchSkills(normalizedQuery.toLowerCase(), rowLimit),
      SKILL_BROAD_SEARCH_TIMEOUT_MS,
      'broad skill search fallback'
    ).catch(() => [] as SkillRecord[])
    return mergeSearchMatches([], broadMatches, rowLimit)
  }
}

export async function getRelatedSkills(
  skillId: string,
  category: string,
  limit = 4,
  strict = false
): Promise<SkillRecord[]> {
  const supabase = createPublicClient()

  // Get skills in the same category, excluding current skill
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .or(PUBLIC_SKILL_FILTER)
    .eq('category', category)
    .neq('id', skillId)
    .order('quality_score', { ascending: false })
    .limit(limit)

  if (error && strict) throw error
  if (error) return []
  return filterSkillOnly(data || [])
}

export function convertSkillRecordToManifest(record: SkillRecord): Skill {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    description: record.description,
    longDescription: record.long_description || record.description,
    tagline: record.tagline || record.description,
    category: record.category as any,
    tags: record.tags || [],
    author: {
      id: record.id,
      name: record.author_name,
      username: record.author_name.toLowerCase().replace(/\s+/g, '-'),
      bio: undefined,
      reputation: 0,
      skillCount: 1,
      verified: record.verified,
    },
    verified: record.verified,
    featured: false,
    compatibility: (record.frameworks || []).map(platform => ({
      platform: platform.toLowerCase().replace(/\s+/g, '-') as any,
      version: '>=1.0.0',
      status: 'full' as const,
    })),
    stats: {
      downloads: record.downloads || 0,
      stars: record.github_stars || 0,
      forks: record.github_forks || 0,
      usedBy: record.used_by || 0,
      rating: record.rating || 0,
      reviewCount: record.review_count || 0,
      qualityScore: Number(record.quality_score || 0),
      trending24h: 0,
      weeklyGrowth: 0,
    },
    technical: {
      version: record.version || 'Unknown',
      language: ['TypeScript'],
      frameworks: record.frameworks || [],
      dependencies: [],
      documentation: record.repository,
      repository: record.repository,
      license: record.license || 'Unknown',
      size: '1 MB',
      lastUpdated: record.updated_at,
      installCommand: record.install_command || `npx skills add ${record.github_repo}`,
      npmPackage: record.npm_package || undefined,
      githubRepo: record.github_repo,
    },
    pricing: {
      type: getSkillCommerce(record.slug).type,
    },
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}
