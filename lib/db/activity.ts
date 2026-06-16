import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient } from '@/lib/supabase/admin'

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
  const supabase = createPublicClient()

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
  const supabase = createAdminClient()

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
  activePlatforms: number
  agentSubmissions: number
}> {
  const supabase = createPublicClient()

  const [{ count: totalSkillCount, error: countError }] = await Promise.all([
    supabase
      .from('skills')
      .select('id', { count: 'exact', head: true })
      .eq('ai_review_approved', true),
  ])

  if (countError) throw countError

  const totalSkills = totalSkillCount || 0
  let totalDownloads = 0

  // Count unique platforms across all skills
  const allPlatforms = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('skills')
      .select('downloads, frameworks')
      .eq('ai_review_approved', true)
      .range(from, from + 999)

    if (error) throw error
    if (!data?.length) break

    for (const skill of data) {
      totalDownloads += skill.downloads || 0
      ;(skill.frameworks || []).forEach((framework: string) => allPlatforms.add(framework))
    }

    if (data.length < 1000) break
  }

  // Ensure a minimum count based on known supported platforms
  const platformCount = Math.max(allPlatforms.size, 8)

  // Count agent submissions from activity feed
  const { count } = await supabase
    .from('activity_feed')
    .select('*', { count: 'exact', head: true })
    .eq('actor_type', 'agent')

  return {
    totalSkills,
    totalDownloads,
    activePlatforms: platformCount,
    agentSubmissions: count || 0,
  }
}
