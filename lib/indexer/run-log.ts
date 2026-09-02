import 'server-only'

import { createPublicClient } from '@/lib/supabase/public'

export interface IndexerRunLog {
  mode: string
  status: string
  started_at: string
  completed_at?: string
  filter_mode?: string
  target_new?: number
  min_stars?: number
  max_search_requests?: number
  search_requests?: number
  candidates_found?: number
  skipped_existing?: number
  skipped_mcp?: number
  skipped_low_relevance?: number
  imported?: number
  updated?: number
  errors?: number
  metadata?: Record<string, unknown>
}

/**
 * Best-effort shared run logging for cron and indexer jobs. A telemetry outage
 * must never turn a successful intake run into a failed run.
 */
export async function recordIndexerRun(run: IndexerRunLog) {
  const serverSecret = process.env.INDEXER_SECRET?.trim()
  if (!serverSecret) {
    console.warn(`[indexer] Skipped ${run.mode} run log because INDEXER_SECRET is not configured.`)
    return false
  }

  const supabase = createPublicClient({ requestTimeoutMs: 8_000 })
  const { error } = await supabase.rpc('record_indexer_run', {
    p_server_secret: serverSecret,
    p_run: {
      ...run,
      completed_at: run.completed_at || new Date().toISOString(),
      filter_mode: run.filter_mode || 'candidate-pipeline',
      metadata: run.metadata || {},
    },
  })

  if (error) {
    console.error(`[indexer] Failed to record ${run.mode} run log:`, error.message)
    return false
  }
  return true
}
