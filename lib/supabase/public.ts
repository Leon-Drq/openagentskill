import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * A lightweight Supabase client for public read-only operations.
 * Does NOT depend on cookies() — works in any server context
 * (static generation, ISR, edge, server components, API routes).
 * 
 * Use this for: homepage stats, skill listings, activity feeds, etc.
 * Use the server.ts client for: authenticated operations (user sessions, writes).
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
