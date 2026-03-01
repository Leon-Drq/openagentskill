import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Supabase anon key is intentionally public — it is safe to commit.
// RLS policies on the database enforce all access control.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://rtuodkczrlkxwwtaxwrr.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0dW9ka2N6cmxreHd3dGF4d3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTc0ODAsImV4cCI6MjA4NzE3MzQ4MH0.KlJ70ysYG78x1hwOTmePW53t_IEeLqC_PzGiBozh2Ug'

/**
 * A lightweight Supabase client for public read-only operations.
 * Does NOT depend on cookies() — works in any server context.
 */
export function createPublicClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

/**
 * Service-role Supabase client for server-side write operations
 * (indexer, cron jobs, etc.) that bypass RLS.
 * NEVER expose this to the client side.
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    // Fall back to anon key — writes will be subject to RLS
    console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY not set, falling back to anon key')
    return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
