import { withTimeout } from '@/lib/async'
import { createPublicClient } from '@/lib/supabase/public'

export const LAST_VERIFIED_APPROVED_SKILL_COUNT = 20_545

export interface RegistrySkillCount {
  count: number
  exact: boolean
}

export async function getApprovedRegistrySkillCount(
  timeoutMs = 1_500
): Promise<RegistrySkillCount | null> {
  const supabase = createPublicClient()
  const statsResult = await withTimeout(
    supabase
      .from('registry_stats')
      .select('approved_skill_count')
      .eq('id', true)
      .maybeSingle(),
    timeoutMs,
    'registry stats query'
  )
    .then(({ data, error }) => ({ data, error, timedOut: false }))
    .catch((queryError) => ({ data: null, error: queryError, timedOut: true }))

  const cachedCount = Number(statsResult.data?.approved_skill_count)
  if (!statsResult.error && Number.isFinite(cachedCount) && cachedCount >= 0) {
    return { count: Math.floor(cachedCount), exact: true }
  }

  // During an upstream timeout, do not immediately start a second database
  // request. The caller has a clearly-labelled last-known fallback instead.
  if (statsResult.timedOut) return null

  // The counter is populated by migration 019. Until it is available, use the
  // PostgREST planner estimate instead of an exact COUNT(*) scan. The caller
  // marks this value as an estimate, so it cannot be mistaken for a precise
  // live count during a transient database slowdown.
  const { count, error: plannedCountError } = await withTimeout(
    supabase
      .from('skills')
      .select('slug', { count: 'planned', head: true })
      .eq('ai_review_approved', true),
    timeoutMs,
    'registry planner count query'
  ).catch((queryError) => ({ count: null, error: queryError }))

  if (plannedCountError || typeof count !== 'number' || count < 0) return null
  return { count, exact: false }
}
