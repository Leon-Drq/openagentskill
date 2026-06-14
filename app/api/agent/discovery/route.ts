import { NextResponse } from 'next/server'
import { INDEXNOW_KEY_LOCATION } from '@/lib/indexnow'
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
    indexnow_cron: '15 3 * * *',
    indexnow_frequency: 'daily baseline submission plus automatic submission after new skill imports',
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
    indexing: {
      status: process.env.INDEXNOW_DISABLED === 'true' ? 'disabled' : 'active',
      provider: 'IndexNow',
      key_location: INDEXNOW_KEY_LOCATION,
      protected_submit_endpoint: '/api/indexnow/submit',
      automatic_triggers: [
        'new skill imported by GitHub discovery',
        'existing skill updated by GitHub discovery',
        'daily baseline submission for core discovery pages and sitemap',
      ],
      submitted_url_types: [
        'skill detail pages',
        'skill audit pages',
        'agent-readable skill API pages',
        'skills directory',
        'trending and hot pages',
        'agent entry pages',
        'sitemap',
      ],
    },
    endpoints: {
      private_import: '/api/indexer/run',
      private_refresh_stars: '/api/indexer/refresh-stars',
      private_logs: '/api/indexer/logs',
      private_indexnow_submit: '/api/indexnow/submit',
      public_skill_claims: '/api/claims',
      public_x_share_draft: '/api/x/share?skill_slug={slug}',
      public_x_reply_draft: '/api/x/reply-draft?skill_slug={slug}&tweet_url={tweet_url}',
      public_status: '/api/agent/discovery',
    },
    creator_growth_loop: {
      status: 'active',
      workflow: [
        'index public skill from repository or creator source',
        'show listing as community indexed until a maintainer claim is approved',
        'generate a manual X reply draft with attribution and claim invitation',
        'creator can claim the listing through the skill detail page',
      ],
      safe_automation_policy:
        'OpenAgentSkill generates Web Intent drafts only; publishing or replying on X requires a human click.',
    },
    recent_runs: runs,
    meta: {
      agent_friendly: true,
      api_version: '1.0',
      generated_at: new Date().toISOString(),
    },
  })
}
