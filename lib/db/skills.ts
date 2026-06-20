import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient } from '@/lib/supabase/admin'
import { withTimeout } from '@/lib/async'
import type { Skill } from '@/lib/types'

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
const ALL_SKILLS_CACHE_TTL_MS = 5 * 60 * 1000
const SKILL_LOOKUP_TIMEOUT_MS = 2500

type AllSkillsCacheEntry = {
  expiresAt: number
  value?: SkillRecord[]
  promise?: Promise<SkillRecord[]>
}

const allSkillsCache = new Map<string, AllSkillsCacheEntry>()

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

export async function getAllSkills(
  sort: SkillSortMode = 'quality',
  category?: string,
  maxRows = Number.POSITIVE_INFINITY
): Promise<SkillRecord[]> {
  const rowLimit = Number.isFinite(maxRows) ? Math.max(1, Math.floor(maxRows)) : Number.POSITIVE_INFINITY
  const cacheKey = `${sort}:${category || 'all'}:${rowLimit}`
  const now = Date.now()
  const cached = allSkillsCache.get(cacheKey)

  if (cached && cached.expiresAt > now) {
    if (cached.value) return cached.value
    if (cached.promise) return cached.promise
  }

  const promise = fetchAllSkills(sort, category, rowLimit)
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
    return value
  } catch (error) {
    allSkillsCache.delete(cacheKey)
    throw error
  }
}

async function fetchAllSkills(
  sort: SkillSortMode = 'quality',
  category?: string,
  maxRows = Number.POSITIVE_INFINITY
): Promise<SkillRecord[]> {
  const supabase = createPublicClient()
  const rows: SkillRecord[] = []

  for (let from = 0; ; from += SKILLS_PAGE_SIZE) {
    const remaining = maxRows - rows.length
    if (remaining <= 0) break
    const pageSize = Math.min(SKILLS_PAGE_SIZE, remaining)
    let query = supabase
      .from('skills')
      .select('*')
      .eq('ai_review_approved', true)

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    switch (sort) {
      case 'quality':
        query = query.order('quality_score', { ascending: false }).order('github_stars', { ascending: false })
        break
      case 'stars':
        query = query.order('github_stars', { ascending: false })
        break
      case 'new':
        query = query.order('created_at', { ascending: false })
        break
      case 'fresh':
        query = query.order('github_last_pushed_at', { ascending: false, nullsFirst: false }).order('quality_score', { ascending: false })
        break
      case 'trending':
        query = query.order('downloads', { ascending: false }).order('created_at', { ascending: false })
        break
      default:
        query = query.order('downloads', { ascending: false })
    }

    const { data, error } = await query.range(from, from + pageSize - 1)
    if (error) throw error
    if (!data?.length) break

    rows.push(...(data as SkillRecord[]))
    if (data.length < pageSize) break
  }

  return filterSkillOnly(rows)
}

export interface SkillAgentStats {
  total_calls: number
  success_calls: number
  success_rate: number | null
  avg_latency_ms: number | null
  unique_agents: number
  last_called_at: string | null
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
export async function getSkillStats(): Promise<Record<string, SkillAgentStats>> {
  const supabase = createPublicClient()
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
}

export async function getSkillEventStatsMap(): Promise<Record<string, SkillEventStats>> {
  const supabase = createPublicClient()
  const { data, error } = await supabase.from('skill_event_stats').select('*')
  if (error || !data) return {}

  const map: Record<string, SkillEventStats> = {}
  for (const row of data as SkillEventStats[]) {
    map[row.skill_slug] = row
  }
  return map
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

export async function getCategories(): Promise<string[]> {
  const supabase = createPublicClient()
  const categories: string[] = []

  for (let from = 0; ; from += SKILLS_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('skills')
      .select('category')
      .eq('ai_review_approved', true)
      .range(from, from + SKILLS_PAGE_SIZE - 1)

    if (error || !data?.length) break
    categories.push(...data.map((r) => r.category).filter(Boolean))
    if (data.length < SKILLS_PAGE_SIZE) break
  }

  const unique = [...new Set(categories)]
    .filter((category) => !isMcpText(category))
  return unique.sort()
}

export async function getSkillBySlug(slug: string): Promise<SkillRecord | null> {
  const supabase = createPublicClient()

  const { data, error } = await withTimeout(
    supabase
      .from('skills')
      .select('*')
      .eq('slug', slug)
      .eq('ai_review_approved', true)
      .maybeSingle(),
    SKILL_LOOKUP_TIMEOUT_MS,
    `skill lookup ${slug}`
  ).catch((lookupError) => {
    console.warn('Skill lookup fallback:', lookupError)
    return { data: null, error: lookupError }
  })
  
  if (error || !data || isMcpSkillRecord(data)) return null
  return data
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

export async function searchSkills(query: string): Promise<SkillRecord[]> {
  const supabase = createPublicClient()
  const rows: SkillRecord[] = []

  for (let from = 0; ; from += SKILLS_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('ai_review_approved', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
      .order('quality_score', { ascending: false })
      .range(from, from + SKILLS_PAGE_SIZE - 1)

    if (error) throw error
    if (!data?.length) break

    rows.push(...(data as SkillRecord[]))
    if (data.length < SKILLS_PAGE_SIZE) break
  }

  return filterSkillOnly(rows)
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
