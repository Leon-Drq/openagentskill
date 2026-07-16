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

export interface PublicClientOptions {
  /**
   * Optional request deadline for background work. Public page reads continue
   * using the normal client, while bounded jobs can fail one request safely.
   */
  requestTimeoutMs?: number
}

function createTimeoutFetch(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController()
    const externalSignal = init?.signal
    const signal = externalSignal
      ? AbortSignal.any([externalSignal, controller.signal])
      : controller.signal
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      return await fetch(input, { ...init, signal })
    } finally {
      clearTimeout(timeout)
    }
  }
}

/**
 * A lightweight Supabase client for public read-only operations.
 * Does NOT depend on cookies() — works in any server context.
 */
export function createPublicClient(options: PublicClientOptions = {}) {
  const requestTimeoutMs = Number(options.requestTimeoutMs)
  if (Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0) {
    return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: createTimeoutFetch(Math.floor(requestTimeoutMs)) },
    })
  }

  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
