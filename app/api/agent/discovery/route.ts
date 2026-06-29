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
import { AGENT_OUTCOMES } from '@/lib/agent-outcomes'
import { INDEXER_RUN_PROFILES } from '@/lib/indexer/run-profiles'
import { FEATURED_SKILL_CLUSTERS, SKILL_CLUSTERS } from '@/lib/seo/skill-clusters'

export const dynamic = 'force-dynamic'

const DISCOVERY_QUERY_TIMEOUT_MS = 2500
const BASE_IMPORT_CRON_MINUTE_UTC = 0

function getCronMinute(schedule: string) {
  const [minute] = schedule.split(' ')
  const parsed = Number(minute)
  return Number.isInteger(parsed) && parsed >= 0 && parsed < 60 ? parsed : null
}

function getImportCronMinutesUtc() {
  return Array.from(
    new Set([
      BASE_IMPORT_CRON_MINUTE_UTC,
      ...INDEXER_RUN_PROFILES
        .map((profile) => getCronMinute(profile.schedule))
        .filter((minute): minute is number => minute !== null),
    ])
  ).sort((a, b) => a - b)
}

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

function metadataValue(run: Record<string, unknown>, key: string) {
  return run.metadata &&
    typeof run.metadata === 'object' &&
    !Array.isArray(run.metadata) &&
    key in run.metadata
    ? (run.metadata as Record<string, unknown>)[key]
    : undefined
}

function getNextImportCronIso(now: Date) {
  const minutes = getImportCronMinutesUtc()
  const next = new Date(now)

  for (const minute of minutes) {
    next.setTime(now.getTime())
    next.setUTCMinutes(minute, 0, 0)
    if (next > now) return next.toISOString()
  }

  next.setTime(now.getTime())
  next.setUTCHours(next.getUTCHours() + 1, minutes[0] || 0, 0, 0)
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
  const latestSearchRequests = toNumber(latestRun?.search_requests)
  const latestMaxSearchRequests = toNumber(latestRun?.max_search_requests)
  const latestCandidatesFound = toNumber(latestRun?.candidates_found)
  const latestPageSeed = toNumber(latestRun?.page_seed)
  const latestDuplicateRecoveryUsed = toNumber(latestRun?.duplicate_recovery_used)
  const latestAdaptiveExpansionUsed = toNumber(latestRun?.adaptive_expansion_used)
  const latestAdaptiveExpansionLowCandidateFallback =
    latestRun?.adaptive_expansion_low_candidate_fallback === true
  const latestAdaptiveExpansionImported = toNumber(latestRun?.adaptive_expansion_imported)
  const latestAdaptiveExpansionCandidatesFound = toNumber(latestRun?.adaptive_expansion_candidates_found)
  const latestSearchDelayMs = toNumber(latestRun?.search_delay_ms)
  const latestRateLimitRetries = toNumber(latestRun?.rate_limit_retries)
  const latestRateLimitWaitMs = toNumber(latestRun?.rate_limit_wait_ms)
  const latestSkippedExisting = toNumber(latestRun?.skipped_existing)
  const latestSkippedMcp = toNumber(latestRun?.skipped_mcp)
  const latestSkippedLowRelevance = toNumber(latestRun?.skipped_low_relevance)
  const latestSkippedStale = toNumber(latestRun?.skipped_stale)
  const latestSkippedCollections = toNumber(latestRun?.skipped_collections)
  const latestSkippedWeakMetadata = toNumber(latestRun?.skipped_weak_metadata)
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
  } else if (
    belowTarget &&
    latestSearchRequests !== null &&
    latestMaxSearchRequests !== null &&
    latestSearchRequests < latestMaxSearchRequests
  ) {
    status = 'underfilled_search_window'
    action = 'The latest run did not use the full search budget. Inspect search diagnostics and domain sweep cron coverage.'
  } else if (
    belowTarget &&
    latestImported === 0 &&
    (latestCandidatesFound || 0) > 0 &&
    (latestSkippedExisting || 0) / Math.max(latestCandidatesFound || 1, 1) >= 0.6
  ) {
    status = 'duplicate_heavy_window'
    action = latestDuplicateRecoveryUsed && latestDuplicateRecoveryUsed > 0
      ? 'The latest domain window used duplicate-recovery search but still found mostly indexed candidates. Adaptive high-quality expansion should run on the next profile cron and report adaptive_expansion_* fields.'
      : 'The latest domain window found candidates, but most were already indexed. Duplicate-recovery and adaptive high-quality expansion should run on duplicate-heavy profile windows.'
  } else if (belowTarget && latestImported === 0 && (latestCandidatesFound || 0) > 0) {
    status = 'filtered_window'
    action = 'The latest run found candidates but no new skill passed the import gates. Inspect skipped MCP and low-relevance counts before loosening quality filters.'
  } else if (belowTarget && latestImported === 0 && latestCandidatesFound === 0) {
    status = 'empty_search_window'
    action = latestAdaptiveExpansionLowCandidateFallback
      ? 'The latest run used low-candidate adaptive expansion but still found no candidates. Add more domain query seeds or inspect GitHub Search availability.'
      : 'The latest run used its search window but found no candidates. Low-candidate adaptive expansion should run on the next profile cron.'
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
    latest_run_search_requests: latestSearchRequests,
    latest_run_max_search_requests: latestMaxSearchRequests,
    latest_run_candidates_found: latestCandidatesFound,
    latest_run_page_seed: latestPageSeed,
    latest_run_duplicate_recovery_used: latestDuplicateRecoveryUsed,
    latest_run_adaptive_expansion_used: latestAdaptiveExpansionUsed,
    latest_run_adaptive_expansion_low_candidate_fallback: latestAdaptiveExpansionLowCandidateFallback,
    latest_run_adaptive_expansion_imported: latestAdaptiveExpansionImported,
    latest_run_adaptive_expansion_candidates_found: latestAdaptiveExpansionCandidatesFound,
    latest_run_search_delay_ms: latestSearchDelayMs,
    latest_run_rate_limit_retries: latestRateLimitRetries,
    latest_run_rate_limit_wait_ms: latestRateLimitWaitMs,
    latest_run_skipped_existing: latestSkippedExisting,
    latest_run_skipped_mcp: latestSkippedMcp,
    latest_run_skipped_low_relevance: latestSkippedLowRelevance,
    latest_run_skipped_stale: latestSkippedStale,
    latest_run_skipped_collections: latestSkippedCollections,
    latest_run_skipped_weak_metadata: latestSkippedWeakMetadata,
    latest_effective_daily_import_rate: latestEffectiveDailyRate,
    estimated_days_to_target_at_latest_import_rate: estimatedDaysAtLatestImportRate,
    last_run_used_old_lower_target: lastRunUsedOldLowerTarget,
    next_import_cron_utc: getNextImportCronIso(generatedAt),
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
    profile_key: run.metadata &&
      typeof run.metadata === 'object' &&
      !Array.isArray(run.metadata) &&
      'profile_key' in run.metadata
      ? (run.metadata as Record<string, unknown>).profile_key
      : undefined,
    status: run.status,
    started_at: run.started_at,
    completed_at: run.completed_at,
    imported: run.imported,
    updated: run.updated,
    errors: run.errors,
    search_requests: run.search_requests,
    max_search_requests: run.max_search_requests,
    candidates_found: run.candidates_found,
    skipped_existing: run.skipped_existing,
    skipped_mcp: run.skipped_mcp,
    skipped_low_relevance: run.skipped_low_relevance,
    skipped_stale: run.metadata &&
      typeof run.metadata === 'object' &&
      !Array.isArray(run.metadata) &&
      'skipped_stale' in run.metadata
      ? (run.metadata as Record<string, unknown>).skipped_stale
      : undefined,
    skipped_collections: run.metadata &&
      typeof run.metadata === 'object' &&
      !Array.isArray(run.metadata) &&
      'skipped_collections' in run.metadata
      ? (run.metadata as Record<string, unknown>).skipped_collections
      : undefined,
    skipped_weak_metadata: run.metadata &&
      typeof run.metadata === 'object' &&
      !Array.isArray(run.metadata) &&
      'skipped_weak_metadata' in run.metadata
      ? (run.metadata as Record<string, unknown>).skipped_weak_metadata
      : undefined,
    min_stars: run.min_stars,
    target_new: run.target_new,
    filter_mode: run.filter_mode,
    page_seed: run.metadata &&
      typeof run.metadata === 'object' &&
      !Array.isArray(run.metadata) &&
      'page_seed' in run.metadata
      ? (run.metadata as Record<string, unknown>).page_seed
      : undefined,
    duplicate_recovery_search_requests: run.metadata &&
      typeof run.metadata === 'object' &&
      !Array.isArray(run.metadata) &&
      'duplicate_recovery_search_requests' in run.metadata
      ? (run.metadata as Record<string, unknown>).duplicate_recovery_search_requests
      : undefined,
    duplicate_recovery_used: run.metadata &&
      typeof run.metadata === 'object' &&
      !Array.isArray(run.metadata) &&
      'duplicate_recovery_used' in run.metadata
      ? (run.metadata as Record<string, unknown>).duplicate_recovery_used
      : undefined,
    adaptive_expansion_min_stars: metadataValue(run, 'adaptive_expansion_min_stars') ?? run.adaptive_expansion_min_stars,
    adaptive_expansion_max_stars: metadataValue(run, 'adaptive_expansion_max_stars') ?? run.adaptive_expansion_max_stars,
    adaptive_expansion_search_requests: metadataValue(run, 'adaptive_expansion_search_requests') ?? run.adaptive_expansion_search_requests,
    adaptive_expansion_used: metadataValue(run, 'adaptive_expansion_used') ?? run.adaptive_expansion_used,
    adaptive_expansion_low_candidate_fallback: metadataValue(run, 'adaptive_expansion_low_candidate_fallback'),
    adaptive_expansion_imported: metadataValue(run, 'adaptive_expansion_imported') ?? run.adaptive_expansion_imported,
    adaptive_expansion_candidates_found: metadataValue(run, 'adaptive_expansion_candidates_found') ?? run.adaptive_expansion_candidates_found,
    adaptive_expansion_skipped_existing: metadataValue(run, 'adaptive_expansion_skipped_existing') ?? run.adaptive_expansion_skipped_existing,
    search_delay_ms: run.metadata &&
      typeof run.metadata === 'object' &&
      !Array.isArray(run.metadata) &&
      'search_delay_ms' in run.metadata
      ? (run.metadata as Record<string, unknown>).search_delay_ms
      : undefined,
    rate_limit_retries: run.metadata &&
      typeof run.metadata === 'object' &&
      !Array.isArray(run.metadata) &&
      'rate_limit_retries' in run.metadata
      ? (run.metadata as Record<string, unknown>).rate_limit_retries
      : undefined,
    rate_limit_wait_ms: run.metadata &&
      typeof run.metadata === 'object' &&
      !Array.isArray(run.metadata) &&
      'rate_limit_wait_ms' in run.metadata
      ? (run.metadata as Record<string, unknown>).rate_limit_wait_ms
      : undefined,
    domains_covered: run.metadata &&
      typeof run.metadata === 'object' &&
      !Array.isArray(run.metadata) &&
      'domains_covered' in run.metadata
      ? (run.metadata as Record<string, unknown>).domains_covered
      : undefined,
    error_samples: run.metadata &&
      typeof run.metadata === 'object' &&
      !Array.isArray(run.metadata) &&
      'error_samples' in run.metadata
      ? (run.metadata as Record<string, unknown>).error_samples
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

function buildProfileRunSummaries(runs: Array<Record<string, unknown>>) {
  return INDEXER_RUN_PROFILES.map((profile) => {
    const latest = runs.find((run) => run.profile_key === profile.key)

    return {
      profile: profile.key,
      label: profile.label,
      schedule: profile.schedule,
      path: profile.path,
      domains: profile.domains,
      target_new: profile.targetNew,
      min_stars: profile.minStars,
      adaptive_expansion_min_stars: profile.adaptiveExpansionMinStars,
      adaptive_expansion_search_requests: profile.adaptiveExpansionSearchRequests,
      max_search_requests: profile.maxSearchRequests,
      duplicate_recovery_search_requests: profile.duplicateRecoverySearchRequests,
      latest_run_status: latest?.status || null,
      latest_run_started_at: toIso(latest?.started_at),
      latest_run_imported: toNumber(latest?.imported),
      latest_run_errors: toNumber(latest?.errors),
      latest_run_search_requests: toNumber(latest?.search_requests),
      latest_run_candidates_found: toNumber(latest?.candidates_found),
      latest_run_skipped_existing: toNumber(latest?.skipped_existing),
      latest_run_duplicate_recovery_used: toNumber(latest?.duplicate_recovery_used),
      latest_run_adaptive_expansion_used: toNumber(latest?.adaptive_expansion_used),
      latest_run_adaptive_expansion_low_candidate_fallback:
        latest?.adaptive_expansion_low_candidate_fallback === true,
      latest_run_adaptive_expansion_imported: toNumber(latest?.adaptive_expansion_imported),
      latest_run_adaptive_expansion_candidates_found: toNumber(latest?.adaptive_expansion_candidates_found),
      latest_run_rate_limit_retries: toNumber(latest?.rate_limit_retries),
      status:
        latest === undefined
          ? 'awaiting_observed_run'
          : toNumber(latest.imported) && Number(latest.imported) > 0
            ? 'importing'
            : toNumber(latest.errors) && Number(latest.errors) > 0
              ? 'needs_log_review'
              : toNumber(latest.candidates_found) && Number(latest.candidates_found) > 0
                ? 'duplicate_or_filtered_window'
                : 'empty_or_pending_window',
    }
  })
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
  const profileHourlyTargetNew = INDEXER_RUN_PROFILES.reduce(
    (total, profile) => total + profile.targetNew,
    0
  )
  const scheduledHourlyTargetNew = targetNew + profileHourlyTargetNew
  const effectiveCoverageTarget = resolveHighStarCoverageTarget(
    parsePositiveNumber(process.env.INDEXER_TARGET_TOTAL, HIGH_STAR_SKILL_COVERAGE_TARGET)
  )
  const [runs, approvedSkillCount] = await Promise.all([getRecentRuns(), getApprovedSkillCount()])
  const filters = {
    min_stars: minStars,
    target_new_per_run: targetNew,
    scheduled_hourly_target_new: scheduledHourlyTargetNew,
    estimated_daily_capacity: scheduledHourlyTargetNew * 24,
    max_search_requests_per_run: maxSearchRequests,
    query_pool_size: HIGH_STAR_QUERY_POOL_SIZE,
    domain_rotation: 'hourly rotating query windows',
    excludes: ['mcp-only projects', 'archived repositories', 'forks', 'low-relevance repositories'],
  }
  const schedule = {
    import_cron: '0 * * * *',
    import_frequency: 'hourly base import plus staggered domain profile imports on production',
    profile_crons: INDEXER_RUN_PROFILES.map((profile) => ({
      profile: profile.key,
      path: profile.path,
      schedule: profile.schedule,
      domains: profile.domains,
      target_new: profile.targetNew,
      min_stars: profile.minStars,
      adaptive_expansion_min_stars: profile.adaptiveExpansionMinStars,
      adaptive_expansion_search_requests: profile.adaptiveExpansionSearchRequests,
      max_search_requests: profile.maxSearchRequests,
      duplicate_recovery_search_requests: profile.duplicateRecoverySearchRequests,
    })),
    star_refresh_cron: '0 3 * * *',
    star_refresh_frequency: 'daily at 03:00 UTC',
    indexnow_cron: '15 3 * * *',
    indexnow_frequency: 'daily baseline submission plus automatic submission after new skill imports',
  }
  const estimatedDailyCapacity = scheduledHourlyTargetNew * 24
  const remainingToTarget =
    typeof approvedSkillCount === 'number'
      ? Math.max(effectiveCoverageTarget - approvedSkillCount, 0)
      : null
  const estimatedDaysToTarget =
    remainingToTarget === null
      ? null
      : Math.ceil(remainingToTarget / Math.max(estimatedDailyCapacity, 1))
  const indexerHealth = {
    ...buildIndexerHealth({
      runs,
      generatedAt,
      targetNew,
      coverageTarget: effectiveCoverageTarget,
      approvedSkillCount,
      remainingToTarget,
    }),
    profile_runs: buildProfileRunSummaries(runs),
  }

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
      scheduled_hourly_target_new: scheduledHourlyTargetNew,
      profile_hourly_target_new: profileHourlyTargetNew,
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
        profile_endpoints: INDEXER_RUN_PROFILES.map((profile) => ({
          profile: profile.key,
          label: profile.label,
          private_endpoint: profile.path,
          schedule: profile.schedule,
          domains: profile.domains,
          target_new: profile.targetNew,
          min_stars: profile.minStars,
          adaptive_expansion_min_stars: profile.adaptiveExpansionMinStars,
          adaptive_expansion_search_requests: profile.adaptiveExpansionSearchRequests,
          max_search_requests: profile.maxSearchRequests,
          duplicate_recovery_search_requests: profile.duplicateRecoverySearchRequests,
        })),
        example_body: {
          targetNew: 500,
          minStars: 500,
          adaptiveExpansionMinStars: 100,
          adaptiveExpansionSearchRequests: 35,
          domains: ['finance', 'sports', 'marketing-seo'],
          maxSearchRequests: 100,
        },
        domain_specific_examples: [
          {
            label: 'Finance and quant',
            body: {
              targetNew: 500,
              minStars: 500,
              adaptiveExpansionMinStars: 100,
              adaptiveExpansionSearchRequests: 35,
              domains: ['finance'],
              maxSearchRequests: 100,
            },
          },
          {
            label: 'World Cup and sports analytics',
            body: {
              targetNew: 200,
              minStars: 300,
              adaptiveExpansionMinStars: 100,
              adaptiveExpansionSearchRequests: 35,
              domains: ['sports'],
              maxSearchRequests: 80,
            },
          },
          {
            label: 'Marketing and customer operations',
            body: {
              targetNew: 300,
              minStars: 500,
              adaptiveExpansionMinStars: 100,
              adaptiveExpansionSearchRequests: 35,
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
        '/api/agent/receipt',
      ],
    },
    agent_outcome_loop: {
      status: 'active',
      public_dashboard: 'https://www.openagentskill.com/outcomes',
      write_endpoint: '/api/agent/outcome',
      read_endpoint: '/api/agent/outcome?skill_slug={slug}',
      machine_summary: '/api/agent/outcome?format=text',
      contract: '/api/agent/outcome?contract=true',
      install_receipt: '/api/agent/receipt?task={task}&agent={agent}&format=text',
      expected_outcomes: AGENT_OUTCOMES,
      optional_quality_fields: [
        'task_success',
        'output_quality',
        'error_type',
        'human_review_required',
        'used_in_production',
        'time_to_useful_ms',
        'workspace',
        'evidence_url',
        'dry_run',
      ],
      ranking_inputs: [
        'Agent Proven Score from real-agent outcome evidence',
        'Trust Score v4 real-agent outcome evidence',
        'recent success and recent failure rates',
        'install success, output quality, production use, and unique agent adoption',
        'skill detail outcome signal blocks',
        'rankings adoption evidence',
        'Resolve recommendation scoring',
      ],
      recommended_agent_flow: [
        'Call /api/agent/resolve with a specific task.',
        'Read install_receipt or fetch /api/agent/receipt before installing.',
        'Run one narrow sandboxed attempt with the selected skill.',
        'POST success, failed, not_relevant, blocked_by_risk, or setup_required to /api/agent/outcome using install_receipt.outcome_feedback.event_id or feedback.event_id.',
        'Use /api/agent/outcome?skill_slug={slug} or format=text before reusing the same skill in production.',
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
      public_agent_outcomes: '/api/agent/outcome',
      public_agent_outcomes_text: '/api/agent/outcome?format=text',
      public_outcome_dashboard: '/outcomes',
      public_skill_claims: '/api/claims',
      public_x_share_draft: '/api/x/share?skill_slug={slug}',
      public_x_reply_draft: '/api/x/reply-draft?skill_slug={slug}&tweet_url={tweet_url}',
      private_x_reply: '/api/x/reply',
      public_status: '/api/agent/discovery',
    },
    creator_growth_loop: {
      status: 'active',
      workflow: [
        'index public skill from repository or creator source',
        'show listing as community indexed until a maintainer claim is approved',
        'generate a safe X reply draft with attribution and claim invitation',
        'optionally post the reply through the protected X OAuth endpoint when automation is authorized',
        'creator can claim the listing through the skill detail page',
      ],
      safe_automation_policy:
        'Public endpoints generate Web Intent drafts. Protected automation can publish X posts or replies only after OAuth authorization and an internal automation secret.',
    },
    recent_runs: runs,
    meta: {
      agent_friendly: true,
      api_version: '1.0',
      generated_at: generatedAt.toISOString(),
    },
  })
}
