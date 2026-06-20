import { NextResponse } from 'next/server'
import { withTimeout } from '@/lib/async'
import { INDEXNOW_KEY_LOCATION } from '@/lib/indexnow'
import { createPublicClient } from '@/lib/supabase/public'
import {
  HIGH_STAR_DISCOVERY_DOMAINS,
  HIGH_STAR_INDEXER_VERSION,
  HIGH_STAR_QUERY_POOL_SIZE,
  HIGH_STAR_SKILL_COVERAGE_TARGET,
} from '@/lib/indexer/high-star-import'
import { FEATURED_SKILL_CLUSTERS, SKILL_CLUSTERS } from '@/lib/seo/skill-clusters'

export const dynamic = 'force-dynamic'

const DISCOVERY_QUERY_TIMEOUT_MS = 1000

async function getRecentRuns() {
  const serverSecret = process.env.INDEXER_SECRET
  if (!serverSecret) return []

  const supabase = createPublicClient()
  const { data, error } = await withTimeout(
    supabase.rpc('list_indexer_runs', {
      p_server_secret: serverSecret,
      p_limit: 5,
    }),
    DISCOVERY_QUERY_TIMEOUT_MS,
    'indexer run status query'
  ).catch((queryError) => {
    console.warn('Discovery recent runs fallback:', queryError)
    return { data: null, error: queryError }
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

async function getApprovedSkillCount() {
  const supabase = createPublicClient()
  const { count, error } = await withTimeout(
    supabase
      .from('skills')
      .select('slug', { count: 'exact', head: true })
      .eq('ai_review_approved', true),
    DISCOVERY_QUERY_TIMEOUT_MS,
    'approved skill count query'
  ).catch((queryError) => {
    console.warn('Discovery skill count fallback:', queryError)
    return { count: null, error: queryError }
  })

  if (error) return null
  return count
}

export async function GET() {
  const minStars = Number(process.env.INDEXER_MIN_STARS || 500)
  const targetNew = Number(process.env.INDEXER_RUN_TARGET || 25)
  const maxSearchRequests = Number(process.env.INDEXER_MAX_SEARCH_REQUESTS || (process.env.GITHUB_TOKEN ? 30 : 10))
  const [runs, approvedSkillCount] = await Promise.all([getRecentRuns(), getApprovedSkillCount()])
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
  const estimatedDailyCapacity = targetNew * 24
  const remainingToTarget =
    typeof approvedSkillCount === 'number'
      ? Math.max(HIGH_STAR_SKILL_COVERAGE_TARGET - approvedSkillCount, 0)
      : null
  const estimatedDaysToTarget =
    remainingToTarget === null
      ? null
      : Math.ceil(remainingToTarget / Math.max(estimatedDailyCapacity, 1))

  return NextResponse.json({
    status: 'active',
    source: 'github',
    scope: 'skills-only',
    scale_plan: {
      indexer_version: HIGH_STAR_INDEXER_VERSION,
      target_approved_skills: HIGH_STAR_SKILL_COVERAGE_TARGET,
      current_approved_skills: approvedSkillCount,
      remaining_to_target: remainingToTarget,
      estimated_daily_capacity: estimatedDailyCapacity,
      estimated_days_to_target_at_current_target: estimatedDaysToTarget,
      strategy:
        'Grow toward a 10k+ skill registry with high-star GitHub discovery, scenario-specific query groups, MCP exclusion, trust metadata, and hourly imports.',
      quality_gates: [
        'GitHub stars threshold',
        'archived and fork exclusion',
        'skill relevance scoring',
        'MCP-only exclusion',
        'repository freshness and metadata capture',
      ],
    },
    schedule,
    filters,
    github_discovery: {
      status: 'active',
      source: 'github_search',
      strategy: 'high-star, skills-only, cross-domain rotating discovery',
      target_approved_skills: HIGH_STAR_SKILL_COVERAGE_TARGET,
      domain_count: HIGH_STAR_DISCOVERY_DOMAINS.length,
      domains: HIGH_STAR_DISCOVERY_DOMAINS,
      targeted_import: {
        supported: true,
        private_endpoint: '/api/indexer/run',
        example_body: {
          targetNew: 500,
          minStars: 500,
          domains: ['finance', 'sports', 'marketing-seo'],
          maxSearchRequests: 100,
        },
        domain_specific_examples: [
          {
            label: 'Finance and quant',
            body: { targetNew: 500, minStars: 500, domains: ['finance'], maxSearchRequests: 100 },
          },
          {
            label: 'World Cup and sports analytics',
            body: { targetNew: 200, minStars: 300, domains: ['sports'], maxSearchRequests: 80 },
          },
          {
            label: 'Marketing and customer operations',
            body: {
              targetNew: 300,
              minStars: 500,
              domains: ['marketing-seo', 'customer-support'],
              maxSearchRequests: 100,
            },
          },
        ],
      },
      filters,
      schedule,
    },
    seo_growth: {
      status: 'active',
      strategy:
        'Publish high-intent, task-first skill cluster pages so Google and AI search can map OpenAgentSkill to concrete agent workflows.',
      cluster_count: SKILL_CLUSTERS.length,
      featured_clusters: FEATURED_SKILL_CLUSTERS.map((cluster) => ({
        slug: cluster.slug,
        title: cluster.title,
        primary_keyword: cluster.primaryKeyword,
        use_case: cluster.useCaseSlug,
        url: `https://www.openagentskill.com${cluster.path}`,
      })),
      ranking_surfaces: [
        '/ai-agent-skills/{cluster}',
        '/best/{use_case}',
        '/use-cases/{use_case}',
        '/tasks/{task}',
        '/api/agent/resolve',
      ],
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
