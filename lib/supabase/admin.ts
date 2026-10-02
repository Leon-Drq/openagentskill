import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createResilientTimeoutFetch, type SupabaseCircuitScope } from '@/lib/supabase/resilient-fetch'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://rtuodkczrlkxwwtaxwrr.supabase.co'

export interface AdminClientOptions {
  requestTimeoutMs?: number
  circuitScope?: SupabaseCircuitScope
  deadlineMs?: number
}

export function createAdminClient(options: AdminClientOptions = {}) {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY

  if (!serviceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY for privileged server operation.'
    )
  }

  const requestTimeoutMs = Number(options.requestTimeoutMs)

  const boundedFetch = Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0
    ? createResilientTimeoutFetch(Math.floor(requestTimeoutMs), options.circuitScope || 'admin')
    : fetch
  const deadline = options.deadlineMs
  const deadlineFetch: typeof fetch = (input, init) => {
    if (!deadline) return boundedFetch(input, init)
    const remaining = deadline - Date.now()
    if (remaining <= 0) return Promise.reject(new Error('Background task deadline exceeded'))
    const callerSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, AbortSignal.timeout(remaining)])
      : AbortSignal.timeout(remaining)
    return boundedFetch(input, { ...init, signal })
  }

  return createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: { fetch: deadlineFetch },
  })
}
