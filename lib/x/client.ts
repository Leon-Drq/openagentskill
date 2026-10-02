import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

/** Background RPCs keep their secret checks and have a separate circuit. */
export function createXAutomationClient() {
  return createAdminClient({ requestTimeoutMs: 8_000, circuitScope: 'x-automation', deadlineMs: Date.now() + 90_000 })
}
