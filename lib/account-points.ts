import type { SupabaseClient } from '@supabase/supabase-js'

export async function readAccountPoints(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from('user_points').select('total_points').eq('user_id', userId).abortSignal(AbortSignal.timeout(8000)).maybeSingle()
  // The security-invoker view aggregates the full own-user ledger, not the
  // recent activity page. A failed read is unknown, never an invented zero.
  return error ? null : Number(data?.total_points ?? 0)
}

