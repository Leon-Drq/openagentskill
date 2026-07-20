import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://rtuodkczrlkxwwtaxwrr.supabase.co'

export interface AdminClientOptions {
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
      ? { global: { fetch: createTimeoutFetch(Math.floor(requestTimeoutMs)) } }
      : {}),
  })
}
