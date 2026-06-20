import { NextResponse } from 'next/server'
import { withTimeout } from '@/lib/async'
import { INDEXNOW_KEY_LOCATION } from '@/lib/indexnow'
import { createPublicClient } from '@/lib/supabase/public'
import {
  HIGH_STAR_DISCOVERY_DOMAINS,
  HIGH_STAR_INDEXER_VERSION,
  HIGH_STAR_QUERY_POOL_SIZE,
  HIGH_STAR_SKILL_COVERAGE_TARGET,
  resolveHighStarCoverageTarget,
} from '@/lib/indexer/high-star-import'
import { FEATURED_SKILL_CLUSTERS, SKILL_CLUSTERS } from '@/lib/seo/skill-clusters'

export const dynamic = 'force-dynamic'

const DISCOVERY_QUERY_TIMEOUT_MS = 1000

function parsePositiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toIso(value: unknown) {
  if (typeof value !== 'string') return null
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}

function getNextHourlyCronIso(now: Date) {
  const next = new Date(now)
  next.setUTCMinutes(0, 0, 0)
  if (next <= now) next.setUTCHours(next.getUTCHours() + 1)
  return next.toISOString()
}

function buildIndexerHealth({
  runs,
  generatedAt,
  targetNew,
  coverageTarget,
  approvedSkillCount,
  remainingToTarget,
}: {
  runs: Array<Record<string, unknown>>
  generatedAt: Date
  targetNew: number
  coverageTarget: number
  approvedSkillCount: number | null
  remainingToTarget: number | null
}) {
  const latestRun = runs[0]
  const latestStartedAt = toIso(latestRun?.started_at)
  const latestStartedMs = latestStartedAt ? Date.parse(latestStartedAt) : null
  const minutesSinceLatestRun =
    latestStartedMs === null
      ? null
      : Math.max(0, Math.round((generatedAt.getTime() - latestStartedMs) / 60_000))
  const latestStatus = typeof latestRun?.status === 'string' ? latestRun.status : null
  const latestTargetNew = toNumber(latestRun?.target_new)
  const latestImported = toNumber(latestRun?.imported)
  const latestErrors = toNumber(latestRun?.errors)
  const belowTarget = typeof remainingToTarget === 'number' && remainingToTarget > 0
  const latestEffectiveDailyRate =
    latestImported === null ? null : latestImported * 24
  const estimatedDaysAtLatestImportRate =
    belowTarget && latestEffectiveDailyRate && latestEffectiveDailyRate > 0
      ? Math.ceil((remainingToTarget || 0) / latestEffectiveDailyRate)
      : null
  const lastRunUsedOldLowerTarget =
    belowTarget &&
    latestStatus === 'target_reached' &&
    latestTargetNew === 0

  let status = 'active'
  let action = 'No action needed. Continue hourly imports toward the 20k coverage target.'

  if (approvedSkillCount === null || remainingToTarget === null) {
    status = 'unknown'
    action = 'Skill count query timed out; retry the public discovery endpoint or inspect private indexer logs.'
  } else if (remainingToTarget === 0) {
    status = 'target_reached'
    action = 'Coverage target reached. Keep refreshing stars and audits.'
  } else if (lastRunUsedOldLowerTarget) {
    status = 'awaiting_next_guarded_run'
    action = 'Recent runs used the old lower target and stopped early; the deployed target guard should resume imports on the next cron.'
  } else if ((latestImported || 0) > 0 && (latestErrors || 0) > 0) {
    status = 'importing_with_warnings'
    action = 'Imports are landing, but one or more query windows reported errors. Continue monitoring and inspect private logs if warnings persist.'
  } else if (latestStatus?.includes('error') || (latestErrors || 0) > 0) {
    status = 'degraded'
    action = 'Inspect private indexer logs before relying on automated growth.'
  } else if (minutesSinceLatestRun !== null && minutesSinceLatestRun > 90) {
    status = 'stale'
    action = 'No recent import run detected. Check Vercel Cron delivery and route authorization.'
  } else if ((latestImported || 0) > 0) {
    status = 'importing'
    action = 'Imports are landing. Continue monitoring approved skill count and run quality gates.'
  }

  return {
    status,
    action,
    target_guard_active: true,
    target_guard_minimum: coverageTarget,
    expected_target_new_per_run: targetNew,
    latest_run_status: latestStatus,
    latest_run_started_at: latestStartedAt,
    minutes_since_latest_run: minutesSinceLatestRun,
    latest_run_target_new: latestTargetNew,
    latest_run_imported: latestImported,
    latest_run_errors: latestErrors,
    latest_effective_daily_import_rate: latestEffectiveDailyRate,
    estimated_days_to_target_at_latest_import_rate: estimatedDaysAtLatestImportRate,
    last_run_used_old_lower_target: lastRunUsedOldLowerTarget,
    next_import_cron_utc: getNextHourlyCronIso(generatedAt),
  }
}

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
  const generatedAt = new Date()
  const minStars = Number(process.env.INDEXER_MIN_STARS || 500)
  const defaultTargetNewPerRun = 250
  const targetNew = Math.max(
    parsePositiveNumber(process.env.INDEXER_RUN_TARGET, defaultTargetNewPerRun),
    defaultTargetNewPerRun
  )
  const maxSearchRequests = Number(process.env.INDEXER_MAX_SEARCH_REQUESTS || (process.env.GITHUB_TOKEN ? 30 : 10))
  const effectiveCoverageTarget = resolveHighStarCoverageTarget(
    parsePositiveNumber(process.env.INDEXER_TARGET_TOTAL, HIGH_STAR_SKILL_COVERAGE_TARGET)
  )
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
      ? Math.max(effectiveCoverageTarget - approvedSkillCount, 0)
      : null
  const estimatedDaysToTarget =
    remainingToTarget === null
      ? null
      : Math.ceil(remainingToTarget / Math.max(estimatedDailyCapacity, 1))
  const indexerHealth = buildIndexerHealth({
    runs,
    generatedAt,
    targetNew,
    coverageTarget: effectiveCoverageTarget,
    approvedSkillCount,
    remainingToTarget,
  })

  return NextResponse.json({
    status: 'active',
    source: 'github',
    scope: 'skills-only',
    scale_plan: {
      indexer_version: HIGH_STAR_INDEXER_VERSION,
      target_approved_skills: effectiveCoverageTarget,
      target_policy:
        'The runtime target is pinned to at least the code-level 20k coverage goal, so older Vercel env values cannot stop imports early.',
      current_approved_skills: approvedSkillCount,
      remaining_to_target: remainingToTarget,
      estimated_daily_capacity: estimatedDailyCapacity,
      estimated_days_to_target_at_current_target: estimatedDaysToTarget,
      strategy:
        'Grow toward a 20k+ skill registry with high-star GitHub discovery, scenario-specific query groups, MCP exclusion, trust metadata, eval metadata, and hourly imports.',
      quality_gates: [
        'GitHub stars threshold',
        'archived and fork exclusion',
        'skill relevance scoring',
        'MCP-only exclusion',
        'repository freshness and metadata capture',
        'Trust Score and pre-install Eval contract generation',
      ],
    },
    schedule,
    filters,
    indexer_health: indexerHealth,
    github_discovery: {
      status: 'active',
      source: 'github_search',
      strategy: 'high-star, skills-only, cross-domain rotating discovery',
      target_approved_skills: effectiveCoverageTarget,
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
      generated_at: generatedAt.toISOString(),
    },
  })
}
