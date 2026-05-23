import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient } from '@/lib/supabase/admin'
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
  category?: string
): Promise<SkillRecord[]> {
  const supabase = createPublicClient()

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
      // Trending: high downloads relative to age (recent + popular)
      query = query.order('downloads', { ascending: false }).order('created_at', { ascending: false })
      break
    default:
      query = query.order('downloads', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw error
  return filterSkillOnly(data || [])
}

export interface SkillAgentStats {
  total_calls: number
  success_calls: number
  success_rate: number | null
  avg_latency_ms: number | null
  unique_agents: number
  last_called_at: string | null
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

export async function getCategories(): Promise<string[]> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('skills')
    .select('category')
    .eq('ai_review_approved', true)
  if (error) return []
  const unique = [...new Set((data || []).map((r) => r.category).filter(Boolean))]
    .filter((category) => !isMcpText(category))
  return unique.sort()
}

export async function getSkillBySlug(slug: string): Promise<SkillRecord | null> {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('slug', slug)
    .single()
  
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

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('ai_review_approved', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    .order('quality_score', { ascending: false })
  
  if (error) throw error
  return filterSkillOnly(data || [])
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
