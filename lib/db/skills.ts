import { createPublicClient } from '@/lib/supabase/public'
import { createClient } from '@/lib/supabase/server'
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
  created_at: string
  updated_at: string
}

export async function getAllSkills(): Promise<SkillRecord[]> {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('ai_review_approved', true)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getSkillBySlug(slug: string): Promise<SkillRecord | null> {
  const supabase = createPublicClient()

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('slug', slug)
    .single()
  
  if (error) return null
  return data
}

export async function createSkill(skill: Partial<SkillRecord>): Promise<SkillRecord> {
  const supabase = await createClient()
  
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
  const supabase = await createClient()
  
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
    .order('downloads', { ascending: false })
  
  if (error) throw error
  return data || []
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
    .order('downloads', { ascending: false })
    .limit(limit)

  if (error) return []
  return data || []
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
