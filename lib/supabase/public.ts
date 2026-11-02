import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createResilientTimeoutFetch, type SupabaseCircuitScope } from '@/lib/supabase/resilient-fetch'

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

export interface PublicClientOptions {
  /**
   * Optional request deadline override. All public reads default to eight
   * seconds; specific workloads can use a shorter budget.
   */
  requestTimeoutMs?: number
  circuitScope?: SupabaseCircuitScope
}

/**
 * A lightweight Supabase client for public read-only operations.
 * Does NOT depend on cookies() — works in any server context.
 */
export function createPublicClient(options: PublicClientOptions = {}) {
  if (process.env.HOSTING_PROVIDER === 'cloudflare' && process.env.CLOUDFLARE_DATA_ENABLED === '1') {
    // Reuse the query builder, never the remote Supabase transport. The private
    // D1 adapter applies publication/ownership rules before compiling a read.
    // No browser-facing generic SQL endpoint or service credential is involved.
    return createSupabaseClient('https://d1.internal', 'local-query-builder', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      db: { retry: false },
      global: { fetch: async (input, init) => {
        const { cloudflarePublicFetch } = await import('@/lib/db/cloudflare-public')
        return cloudflarePublicFetch(input, init)
      } },
    })
  }
  const requested = Number(options.requestTimeoutMs)
  const requestTimeoutMs = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 8000
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { retry: false },
    global: { fetch: createResilientTimeoutFetch(requestTimeoutMs, options.circuitScope) },
  })
}
