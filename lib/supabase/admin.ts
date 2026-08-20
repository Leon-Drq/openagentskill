import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createResilientTimeoutFetch } from '@/lib/supabase/resilient-fetch'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://rtuodkczrlkxwwtaxwrr.supabase.co'

export interface AdminClientOptions {
  requestTimeoutMs?: number
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

  return createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...(Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0
      ? { global: { fetch: createResilientTimeoutFetch(Math.floor(requestTimeoutMs)) } }
      : {}),
  })
}
