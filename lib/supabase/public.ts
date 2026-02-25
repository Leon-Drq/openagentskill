import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * A lightweight Supabase client for public read-only operations.
 * Does NOT depend on cookies() — works in any server context.
 *
 * Returns null if environment variables are missing instead of throwing,
 * so callers can gracefully fall back to mock data.
 */
export function createPublicClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    return null
  }

  return createSupabaseClient(url, key)
}
