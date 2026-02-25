import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * A lightweight Supabase client for public read-only operations.
 * Does NOT depend on cookies() — works in any server context
 * (static generation, ISR, edge, server components, API routes).
 * 
 * Uses SUPABASE_URL (server-side) with fallback to NEXT_PUBLIC_SUPABASE_URL.
 * Uses SUPABASE_ANON_KEY (server-side) with fallback to NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createPublicClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      `Supabase env vars missing: URL=${!!url}, KEY=${!!key}`
    )
  }

  return createSupabaseClient(url, key)
}
