import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * A lightweight Supabase client for public read-only operations.
 * Does NOT depend on cookies() — works in any server context
 * (static generation, ISR, edge, server components, API routes).
 *
 * IMPORTANT: Prioritize NEXT_PUBLIC_SUPABASE_URL because it is always
 * the Supabase REST API URL (https://xxx.supabase.co). The SUPABASE_URL
 * env var from some integrations may be the Postgres connection string
 * (postgresql://...) which is NOT valid for the JS client.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      `Supabase env vars missing: URL=${!!url}, KEY=${!!key}`
    )
  }

  return createSupabaseClient(url, key)
}
