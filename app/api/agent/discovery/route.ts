import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { HIGH_STAR_DISCOVERY_DOMAINS, HIGH_STAR_QUERY_POOL_SIZE } from '@/lib/indexer/high-star-import'

export const dynamic = 'force-dynamic'

async function getRecentRuns() {
  const serverSecret = process.env.INDEXER_SECRET
  if (!serverSecret) return []

  const supabase = createPublicClient()
  const { data, error } = await supabase.rpc('list_indexer_runs', {
    p_server_secret: serverSecret,
    p_limit: 5,
  })

  if (error) return []
  return (data || []).map((run: Record<string, unknown>) => ({
    status: run.status,
    started_at: run.started_at,
    completed_at: run.completed_at,
    imported: run.imported,
    updated: run.updated,
    errors: run.errors,
    candidates_found: run.candidates_found,
    min_stars: run.min_stars,
    target_new: run.target_new,
    filter_mode: run.filter_mode,
    domains_covered: run.metadata &&
      typeof run.metadata === 'object' &&
      !Array.isArray(run.metadata) &&
      'domains_covered' in run.metadata
      ? (run.metadata as Record<string, unknown>).domains_covered
      : undefined,
  }))
}

export async function GET() {
  const minStars = Number(process.env.INDEXER_MIN_STARS || 500)
  const targetNew = Number(process.env.INDEXER_RUN_TARGET || 25)
  const maxSearchRequests = Number(process.env.INDEXER_MAX_SEARCH_REQUESTS || (process.env.GITHUB_TOKEN ? 30 : 10))
  const runs = await getRecentRuns()
  const filters = {
    min_stars: minStars,
    target_new_per_run: targetNew,
    estimated_daily_capacity: targetNew * 24,
    max_search_requests_per_run: maxSearchRequests,
    query_pool_size: HIGH_STAR_QUERY_POOL_SIZE,
    domain_rotation: 'hourly rotating query windows',
    excludes: ['mcp-only projects', 'archived repositories', 'forks', 'low-relevance repositories'],
  }
  const schedule = {
    import_cron: '0 * * * *',
    import_frequency: 'hourly on production',
    star_refresh_cron: '0 3 * * *',
    star_refresh_frequency: 'daily at 03:00 UTC',
  }

  return NextResponse.json({
    status: 'active',
    source: 'github',
    scope: 'skills-only',
    schedule,
    filters,
    github_discovery: {
      status: 'active',
      source: 'github_search',
      strategy: 'high-star, skills-only, cross-domain rotating discovery',
      domains: HIGH_STAR_DISCOVERY_DOMAINS,
      targeted_import: {
        supported: true,
        private_endpoint: '/api/indexer/run',
        example_body: {
          targetNew: 500,
          minStars: 500,
          domains: ['finance'],
          maxSearchRequests: 100,
        },
      },
      filters,
      schedule,
    },
    endpoints: {
      private_import: '/api/indexer/run',
      private_refresh_stars: '/api/indexer/refresh-stars',
      private_logs: '/api/indexer/logs',
      public_status: '/api/agent/discovery',
    },
    recent_runs: runs,
    meta: {
      agent_friendly: true,
      api_version: '1.0',
      generated_at: new Date().toISOString(),
    },
  })
}
