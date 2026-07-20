import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient } from '@/lib/supabase/admin'
import { withTimeout } from '@/lib/async'
import { unstable_cache } from 'next/cache'
import type { Skill } from '@/lib/types'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'

export interface SkillRecord {
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
  submission_source: string
  submitted_by_agent: string | null
  ai_review_score: any
  ai_review_approved: boolean
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
const SKILL_LOOKUP_TIMEOUT_MS = 1200
const SKILL_LOOKUP_CACHE_REVALIDATE_SECONDS = 60
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
  'submission_source',
  'submitted_by_agent',
  'ai_review_score',
  'ai_review_approved',
  'ai_review_issues',
  'downloads',
  'used_by',
  'rating',
  'review_count',
  'quality_score',
  'quality_signals',
  'github_language',
  'github_last_pushed_at',
  'created_at',
  'updated_at',
].join(',')

type AllSkillsCacheEntry = {
  expiresAt: number
  value?: SkillRecord[]
  promise?: Promise<SkillRecord[]>
}

const allSkillsCache = new Map<string, AllSkillsCacheEntry>()

export type SkillSitemapRecord = Pick<
  SkillRecord,
  | 'slug'
  | 'github_stars'
  | 'github_last_pushed_at'
  | 'updated_at'
>

export interface SkillSitemapQueryOptions {
  offset?: number
  limit?: number
  minStars?: number
}

function createSitemapClient(requestTimeoutMs = SITEMAP_QUERY_TIMEOUT_MS) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY) {
    return createAdminClient({ requestTimeoutMs })
  }

  return createPublicClient({ requestTimeoutMs })
}

function isMcpText(value: string) {
  return /(^|[^a-z0-9])mcp([^a-z0-9]|$)/i.test(value) || /\bmodel context protocol\b/i.test(value)
}

type SkillOnlyScopeRecord = Pick<
  SkillRecord,
  'name' | 'description' | 'long_description' | 'tagline' | 'category' | 'tags' | 'frameworks' | 'github_repo'
>

function isMcpSkillRecord(record: SkillOnlyScopeRecord) {
  const text = [
    record.name,
    record.description,
    record.long_description,
    record.tagline,
    record.category,
    record.github_repo,
    ...(record.tags || []),
    ...(record.frameworks || []),
  ].join(' ')

  return isMcpText(text)
}

function filterSkillOnly<T extends SkillOnlyScopeRecord>(records: T[]) {
  return records.filter((record) => !isMcpSkillRecord(record))
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
    try {
      return await fetchAllSkills(sort, category || undefined, maxRows)
    } catch {
      // A bounded curated directory keeps navigation and agent flows useful
      // while the primary database is slow or temporarily unavailable.
      return getDirectoryFallback(sort, category || undefined, maxRows)
    }
  },
  ['public-skill-directory-v5'],
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
  // Never let a page route load the complete registry. Listing, ranking, and
  // resolve flows need a bounded candidate set; the sitemap has its own
  // streaming query below for the rare whole-registry case.
  const rowLimit = Number.isFinite(maxRows)
    ? Math.min(MAX_SKILL_QUERY_LIMIT, Math.max(1, Math.floor(maxRows)))
    : DEFAULT_SKILL_QUERY_LIMIT
  const normalizedCategory = category && category !== 'all' ? category : null
  // Most public pages ask for a small subset of the same quality-ranked
  // directory. Back those calls with one bounded source cache and slice it in
  // memory instead of issuing independent 180/250/1200 row queries.
  const sourceLimit = rowLimit <= DEFAULT_SKILL_QUERY_LIMIT ? DEFAULT_SKILL_QUERY_LIMIT : rowLimit
  // Category pages share the same quality-gated source list. Filtering a
  // cached candidate set is much cheaper than starting a new database query
  // every time a visitor moves between Finance, Design, Research, and so on.
  const cacheKey = `${sort}:all:${sourceLimit}`
  const now = Date.now()
  const cached = allSkillsCache.get(cacheKey)

  if (cached && cached.expiresAt > now) {
    if (cached.value) return selectDirectorySkills(cached.value, normalizedCategory, rowLimit)
    if (cached.promise) return cached.promise.then((value) => selectDirectorySkills(value, normalizedCategory, rowLimit))
  }

  const promise = getSharedAllSkills(sort, null, sourceLimit)
  allSkillsCache.set(cacheKey, {
    expiresAt: now + ALL_SKILLS_CACHE_TTL_MS,
    promise,
  })

  try {
    const value = await promise
    allSkillsCache.set(cacheKey, {
      expiresAt: Date.now() + ALL_SKILLS_CACHE_TTL_MS,
      value,
    })
    return selectDirectorySkills(value, normalizedCategory, rowLimit)
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
      .eq('ai_review_approved', true)

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Always use the quality-gated directory index for public browsing. The
    // presentation sort is applied to this bounded, high-quality candidate
    // set below, which avoids a full-table sort whenever someone changes a
    // list tab or navigates into a locale-specific directory page.
    query = query.order('quality_score', { ascending: false }).order('github_stars', { ascending: false })

    const { data, error } = await query.range(from, from + pageSize - 1)
    if (error) throw error
    if (!data?.length) break

    rows.push(...(data as unknown as SkillRecord[]))
    if (data.length < pageSize) break
  }

  return sortDirectorySkills(filterSkillOnly(rows), sort)
}

function getSitemapFallbackRecords(
  offset: number,
  limit: number,
  minStars: number
): SkillSitemapRecord[] {
  return CURATED_SKILL_SNAPSHOT
    .filter((skill) => Number(skill.github_stars || 0) >= minStars)
    .sort((left, right) => Number(right.github_stars || 0) - Number(left.github_stars || 0))
    .slice(offset, offset + limit)
    .map((skill) => ({
      slug: skill.slug,
      github_stars: skill.github_stars,
      github_last_pushed_at: skill.github_last_pushed_at,
      updated_at: skill.updated_at,
    }))
}

// Sitemap traffic is bot-heavy and arrives across many server instances. A
// shared cache prevents every crawler hit from starting its own multi-thousand
// row database read. On a transient database failure we cache a compact,
// valid sitemap rather than allowing retries to crowd out interactive routes.
const getCachedApprovedSkillSitemapRecords = unstable_cache(
  async (offset: number, limit: number, minStars: number): Promise<SkillSitemapRecord[]> => {
    try {
      return await fetchApprovedSkillSitemapRecords({ offset, limit, minStars })
    } catch {
      return getSitemapFallbackRecords(offset, limit, minStars)
    }
  },
  ['approved-sitemap-records-v5'],
  {
    revalidate: SITEMAP_CACHE_REVALIDATE_SECONDS,
    tags: ['approved-sitemap-records'],
  }
)

const getCachedApprovedSkillSitemapCount = unstable_cache(
  async (minStars: number): Promise<number> => {
    try {
      return await fetchApprovedSkillSitemapCount(minStars)
    } catch {
      return getSitemapFallbackRecords(0, CURATED_SKILL_SNAPSHOT.length, minStars).length
    }
  },
  ['approved-sitemap-count-v5'],
  {
    revalidate: SITEMAP_CACHE_REVALIDATE_SECONDS,
    tags: ['approved-sitemap-count'],
  }
)

export async function getApprovedSkillSitemapRecords(
  options: SkillSitemapQueryOptions = {}
): Promise<SkillSitemapRecord[]> {
  const offset = Math.max(0, Math.floor(options.offset || 0))
  const rowLimit = Number.isFinite(options.limit)
    ? Math.max(1, Math.floor(options.limit || 1))
    : MAX_SKILL_QUERY_LIMIT
  const minStars = Math.max(0, Math.floor(options.minStars || 0))

  return getCachedApprovedSkillSitemapRecords(offset, rowLimit, minStars)
}

async function fetchApprovedSkillSitemapRecords(
  options: Required<SkillSitemapQueryOptions>
): Promise<SkillSitemapRecord[]> {
  const supabase = createSitemapClient()
  const rows: SkillSitemapRecord[] = []

  for (let from = options.offset; ; from += SKILLS_PAGE_SIZE) {
    const remaining = options.limit - rows.length
    if (remaining <= 0) break
    const pageSize = Math.min(SKILLS_PAGE_SIZE, remaining)
    let query = supabase
      .from('skills')
      .select('slug,github_stars,github_last_pushed_at,updated_at')
      .eq('ai_review_approved', true)
      // This matches the public-directory partial index. A sitemap needs a
      // stable complete traversal, not a star-only ranking, and must never
      // force a full-table sort while a crawler is visiting the site.
      .order('quality_score', { ascending: false })
      .order('github_stars', { ascending: false })

    if (options.minStars > 0) {
      query = query.gte('github_stars', options.minStars)
    }

    const { data, error } = await query.range(from, from + pageSize - 1)

    if (error) throw error
    if (!data?.length) break

    rows.push(...(data as SkillSitemapRecord[]))
    if (data.length < pageSize) break
  }

  return rows
}

export async function getApprovedSkillSitemapCount(minStars = 0): Promise<number> {
  const normalizedMinStars = Math.max(0, Math.floor(minStars || 0))
  return getCachedApprovedSkillSitemapCount(normalizedMinStars)
}

async function fetchApprovedSkillSitemapCount(minStars: number): Promise<number> {
  const supabase = createSitemapClient()

  // The counter is maintained by the registry trigger and avoids making every
  // sitemap index request pay for an exact COUNT(*) across the full catalog.
  if (minStars <= 0) {
    const { data, error } = await supabase
      .from('registry_stats')
      .select('approved_skill_count')
      .eq('id', true)
      .maybeSingle()

    const count = Number(data?.approved_skill_count)
    if (!error && Number.isFinite(count) && count >= 0) return Math.floor(count)
  }

  let query = supabase
    .from('skills')
    // Planner counts are sufficient to determine sitemap shard capacity and
    // remain cheap when crawlers request this endpoint concurrently.
    .select('slug', { count: 'planned', head: true })
    .eq('ai_review_approved', true)

  if (minStars > 0) {
    query = query.gte('github_stars', minStars)
  }

  const { count, error } = await query
  if (error) throw error
  return count || 0
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
  github_username: string
  repo_url: string | null
  verification_method: string
  evidence_url: string | null
  evidence_note: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewer_note: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/**
 * 获取所有 skill 的 Agent 调用统计
 * 返回以 slug 为 key 的 map
 */
const getCachedSkillStats = unstable_cache(
  async (): Promise<Record<string, SkillAgentStats>> => {
  const supabase = createPublicClient({ requestTimeoutMs: SKILL_STATS_REQUEST_TIMEOUT_MS })
  const { data, error } = await supabase.from('skill_stats').select('*')
  if (error || !data) return {}

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
  ['public-skill-agent-stats-v2'],
  { revalidate: SHARED_SKILL_CACHE_REVALIDATE_SECONDS, tags: ['public-skill-stats'] }
)

export async function getSkillStats(): Promise<Record<string, SkillAgentStats>> {
  return getCachedSkillStats().catch(() => ({}))
}

const getCachedAgentOutcomeStatsMap = unstable_cache(
  async (): Promise<Record<string, SkillOutcomeStats>> => {
  const supabase = createPublicClient({ requestTimeoutMs: SKILL_STATS_REQUEST_TIMEOUT_MS })
  const { data, error } = await supabase.from('agent_outcome_stats').select('*')
  if (error || !data) return {}

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

export async function getAgentOutcomeStats(skillSlug: string): Promise<SkillOutcomeStats | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('agent_outcome_stats')
    .select('*')
    .eq('skill_slug', skillSlug)
    .maybeSingle()

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
  if (error || !data) return {}

  const map: Record<string, SkillEventStats> = {}
  for (const row of data as SkillEventStats[]) {
    map[row.skill_slug] = row
  }
  return map
  },
  ['public-skill-event-stats-v2'],
  { revalidate: SHARED_SKILL_CACHE_REVALIDATE_SECONDS, tags: ['public-skill-events'] }
)

export async function getSkillEventStatsMap(): Promise<Record<string, SkillEventStats>> {
  return getCachedSkillEventStatsMap().catch(() => ({}))
}

export async function getSkillEventStats(skillSlug: string): Promise<SkillEventStats | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('skill_event_stats')
    .select('*')
    .eq('skill_slug', skillSlug)
    .maybeSingle()

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

export async function getSkillAuditsMap(): Promise<Record<string, SkillAuditRecord>> {
  const supabase = createPublicClient()
  const rows: SkillAuditRecord[] = []

  for (let from = 0; ; from += SKILLS_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('skill_audits')
      .select('*')
      .range(from, from + SKILLS_PAGE_SIZE - 1)

    if (error || !data?.length) break
    rows.push(...(data as SkillAuditRecord[]))
    if (data.length < SKILLS_PAGE_SIZE) break
  }

  const map: Record<string, SkillAuditRecord> = {}
  for (const row of rows) {
    map[row.skill_slug] = row
  }
  return map
}

export async function getApprovedClaimBySkillSlug(skillSlug: string): Promise<SkillClaimRecord | null> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('skill_claims')
    .select('*')
    .eq('skill_slug', skillSlug)
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

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
        .eq('ai_review_approved', true)
        .range(from, from + SKILLS_PAGE_SIZE - 1)

      if (error || !data?.length) break
      for (const row of data) {
        if (row.category) categories.add(row.category)
      }
      if (data.length < SKILLS_PAGE_SIZE) break
    }

    return [...categories]
      .filter((category) => !isMcpText(category))
      .sort()
  },
  ['public-skill-categories-v2'],
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
// slug. Cache both matches and misses so repeated stale links do not consume a
// database connection on every request. A short TTL keeps new approvals and
// corrections visible quickly.
const getCachedSkillBySlug = unstable_cache(
  async (slug: string): Promise<SkillRecord | null> => {
    const supabase = createPublicClient({ requestTimeoutMs: SKILL_LOOKUP_TIMEOUT_MS })
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('slug', slug)
      .eq('ai_review_approved', true)
      .maybeSingle()

    if (error || !data || isMcpSkillRecord(data)) return null
    return data as SkillRecord
  },
  ['public-skill-by-slug-v2'],
  {
    revalidate: SKILL_LOOKUP_CACHE_REVALIDATE_SECONDS,
    tags: ['public-skill-directory'],
  }
)

export async function getSkillBySlug(slug: string): Promise<SkillRecord | null> {
  const normalized = normalizeSkillLookupSlug(slug)
  if (!normalized) return null

  try {
    return await getCachedSkillBySlug(normalized)
  } catch {
    // A missing or temporarily unavailable detail must not slow down the
    // registry. Curated callers can still provide their static fallback.
    return null
  }
}

export async function getSkillsBySlugs(slugs: string[]): Promise<SkillRecord[]> {
  const normalizedSlugs = Array.from(new Set(slugs.map((slug) => slug.trim()).filter(Boolean)))
  if (!normalizedSlugs.length) return []

  const supabase = createPublicClient({ requestTimeoutMs: SKILL_LOOKUP_TIMEOUT_MS })
  const { data, error } = await withTimeout(
    supabase
      .from('skills')
      .select('*')
      .eq('ai_review_approved', true)
      .in('slug', normalizedSlugs),
    SKILL_LOOKUP_TIMEOUT_MS,
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

function getSearchTerms(normalizedQuery: string) {
  const stopWords = new Set([
    'about', 'agent', 'agents', 'and', 'for', 'from', 'into', 'need', 'right', 'skill', 'skills',
    'that', 'the', 'this', 'use', 'using', 'want', 'what', 'when', 'with',
  ])

  const terms = Array.from(
    new Set(
      normalizedQuery
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3 && !stopWords.has(term))
    )
  ).slice(0, 5)

  return terms.length > 0 ? terms : [normalizedQuery]
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
  const supabase = createPublicClient({ requestTimeoutMs: SKILL_DIRECTORY_REQUEST_TIMEOUT_MS })
  const fields = ['name', 'description', 'long_description', 'tagline', 'category', 'github_repo', 'repository']
  const filter = searchTerms
    .flatMap((term) => fields.map((field) => `${field}.ilike.%${term}%`))
    .join(',')
  const { data, error } = await supabase
    .from('skills')
    .select(SKILL_DIRECTORY_SELECT)
    .eq('ai_review_approved', true)
    .or(filter)
    .order('quality_score', { ascending: false })
    .limit(limit)

  if (error) throw error
  return filterSkillOnly((data || []) as unknown as SkillRecord[])
}

async function fetchSearchSkills(normalizedQuery: string, limit: number): Promise<SkillRecord[]> {
  const searchTerms = getSearchTerms(normalizedQuery)
  const supabase = createPublicClient({ requestTimeoutMs: SKILL_DIRECTORY_REQUEST_TIMEOUT_MS })
  const fullTextQuery = searchTerms.map((term) => term.replace(/[^a-z0-9-]/g, '')).filter(Boolean).join(' OR ')

  const { data, error } = await supabase
    .from('skills')
    .select(SKILL_DIRECTORY_SELECT)
    .eq('ai_review_approved', true)
    .textSearch('search_document', fullTextQuery || normalizedQuery, { config: 'simple', type: 'websearch' })
    .order('quality_score', { ascending: false })
    .limit(limit)

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
  async (normalizedQuery: string, limit: number) => {
    try {
      return await fetchSearchSkills(normalizedQuery, limit)
    } catch {
      // The ranked directory candidate pool still answers the request when an
      // exact database search is unavailable.
      return [] as SkillRecord[]
    }
  },
  ['public-skill-search-v3'],
  { revalidate: SHARED_SKILL_CACHE_REVALIDATE_SECONDS, tags: ['public-skill-directory'] }
)

export async function searchSkills(query: string, limit = 120): Promise<SkillRecord[]> {
  const normalizedQuery = query.trim().replace(/[%_,{},()]/g, ' ')
  if (!normalizedQuery) return []

  const rowLimit = Math.min(Math.max(Math.floor(limit) || 1, 1), 200)
  return getCachedSearchSkills(normalizedQuery.toLowerCase(), rowLimit)
}

export async function getRelatedSkills(
  skillId: string,
  category: string,
  limit = 4
): Promise<SkillRecord[]> {
  const supabase = createPublicClient()

  // Get skills in the same category, excluding current skill
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('ai_review_approved', true)
    .eq('category', category)
    .neq('id', skillId)
    .order('quality_score', { ascending: false })
    .limit(limit)

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
      version: record.version || '1.0.0',
      language: ['TypeScript'],
      frameworks: record.frameworks || [],
      dependencies: [],
      documentation: record.repository,
      repository: record.repository,
      license: record.license || 'MIT',
      size: '1 MB',
      lastUpdated: record.updated_at,
      installCommand: record.install_command || `npx skills add ${record.github_repo}`,
      npmPackage: record.npm_package || undefined,
      githubRepo: record.github_repo,
    },
    pricing: {
      type: 'free' as const,
    },
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  }
}
