import { createClient } from '@/lib/supabase/server'

export interface ActivityRecord {
  id: string
  event_type: string
  skill_id: string | null
  actor_name: string
  actor_type: string
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export async function getRecentActivity(limit = 10): Promise<ActivityRecord[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('activity_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function createActivity(activity: {
  event_type: string
  skill_id?: string | null
  actor_name: string
  actor_type: string
  description: string
  metadata?: Record<string, unknown>
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('activity_feed')
    .insert(activity)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getPlatformStats(): Promise<{
  totalSkills: number
  totalDownloads: number
  totalPlatforms: number
  agentSubmissions: number
}> {
  const supabase = await createClient()

  const { data: skills, error: skillsError } = await supabase
    .from('skills')
    .select('downloads, frameworks, submission_source')
    .eq('ai_review_approved', true)

  if (skillsError) throw skillsError

  const totalSkills = skills?.length || 0
  const totalDownloads = skills?.reduce((sum, s) => sum + (s.downloads || 0), 0) || 0

  // Count unique platforms across all skills
  const allPlatforms = new Set<string>()
  skills?.forEach(s => {
    ;(s.frameworks || []).forEach((f: string) => allPlatforms.add(f))
  })

  // Count agent submissions from activity feed
  const { count } = await supabase
    .from('activity_feed')
    .select('*', { count: 'exact', head: true })
    .eq('actor_type', 'agent')

  return {
    totalSkills,
    totalDownloads,
    totalPlatforms: allPlatforms.size,
    agentSubmissions: count || 0,
  }
}
