import {
  collectIndexNowUrlsFromIndexerResults,
  normalizeIndexNowUrl,
  submitIndexNowUrls,
  type IndexNowSubmitResult,
} from '@/lib/indexnow'
import { runSeoDrip, type SeoDripResult } from '@/lib/growth/seo-drip'
import { searchHotSkillRepos, type HotSkillDiscoveryResult } from '@/lib/indexer/hot-skill-discovery'
import { searchXSkillRadarRepos, type XSkillRadarResult } from '@/lib/indexer/x-skill-radar'
import { processRepo, type ProcessResult } from '@/lib/indexer/processor'
import type { CandidateRepo } from '@/lib/indexer/github-search'
import { createPublicClient } from '@/lib/supabase/public'
import type { XQueueBuildResult } from '@/lib/x/growth'
import type { XPostResult } from '@/lib/x/poster'

const RADAR_DB_TIMEOUT_MS = 12_000

export interface SkillRadarOptions {
  targetNew?: number
  minStars?: number
  githubLimit?: number
  githubLookbackDays?: number
  githubMaxQueries?: number
  xLimit?: number
  xMaxQueries?: number
  xResultsPerQuery?: number
  seoPerRun?: number
  seoDailyLimit?: number
  xQueueLimit?: number
  xMinStars?: number
  autoPost?: boolean
  queueX?: boolean
  maxCandidateAttempts?: number
}

export interface SkillRadarResult {
  success: boolean
  runKey: string
  source: 'x_and_github'
  xRadar: XSkillRadarResult
  githubHot: HotSkillDiscoveryResult
  import: {
    summary: {
      found: number
      indexed: number
      rejected: number
      skipped: number
      errors: number
    }
    results: ProcessResult[]
  }
  seo: SeoDripResult
  indexing: IndexNowSubmitResult
  xQueue: XQueueBuildResult
  xFallbackQueue?: XQueueBuildResult
  xPost: XPostResult & { queueItemId?: string }
  slugs: {
    indexed: string[]
    touched: string[]
  }
}

function numberFromEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function nonNegativeNumberFromEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function skillRadarXMaxQueries(options: SkillRadarOptions) {
  if (options.xMaxQueries !== undefined) {
    return Math.min(Math.max(options.xMaxQueries, 0), 8)
  }

  const maxQueries = Math.min(
    Math.max(nonNegativeNumberFromEnv('SKILL_RADAR_X_MAX_QUERIES', 0), 0),
    8
  )
  if (maxQueries === 0) return 0

  // GitHub can be checked every hour without consuming X credits. Sample X
  // periodically, then let its high-engagement posts enrich the same quality gate.
  const intervalHours = Math.min(
    Math.max(numberFromEnv('SKILL_RADAR_X_SCAN_INTERVAL_HOURS', 6), 1),
    24
  )
  return new Date().getUTCHours() % intervalHours === 0 ? maxQueries : 0
}

async function recordSkillRadarRun(run: Record<string, unknown>) {
  const serverSecret = process.env.INDEXER_SECRET
  if (!serverSecret) return

  const { error } = await createPublicClient({
    requestTimeoutMs: RADAR_DB_TIMEOUT_MS,
  }).rpc('record_indexer_run', {
    p_server_secret: serverSecret,
    p_run: run,
  })

  if (error) {
    console.error('[skill-radar] Failed to record run log:', error.message)
  }
}

function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function candidateSlug(candidate: CandidateRepo) {
  return `${candidate.owner}-${candidate.repo}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
}

async function excludeExistingCandidates(candidates: CandidateRepo[]) {
  const slugs = unique(candidates.map(candidateSlug))
  if (!slugs.length) return { candidates, existing: 0 }

  try {
    const { data, error } = await createPublicClient({
      requestTimeoutMs: RADAR_DB_TIMEOUT_MS,
    })
      .from('skills')
      .select('slug')
      .in('slug', slugs)

    if (error) throw new Error(error.message)

    const existingSlugs = new Set(
      (data || []).map((row: { slug?: string | null }) => row.slug).filter((slug): slug is string => Boolean(slug))
    )

    return {
      candidates: candidates.filter((candidate) => !existingSlugs.has(candidateSlug(candidate))),
      existing: existingSlugs.size,
    }
  } catch (error) {
    // Keep discovery available when Supabase is under transient load. The
    // per-repository processor still has its own duplicate guard.
    console.warn('[skill-radar] Could not prefilter existing candidates:', error)
    return { candidates, existing: 0 }
  }
}

function summarizeProcessResults(results: ProcessResult[]) {
  return {
    found: results.length,
    indexed: results.filter((result) => result.status === 'indexed').length,
    rejected: results.filter((result) => result.status === 'rejected').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    errors: results.filter((result) => result.status === 'error').length,
  }
}

function collectSlugs(results: ProcessResult[], statuses: ProcessResult['status'][]) {
  const statusSet = new Set(statuses)
  return unique(results.map((result) => (result.slug && statusSet.has(result.status) ? result.slug : undefined)))
}

function skippedXQueueResult(): XQueueBuildResult {
  return { status: 'skipped', queued: 0, skipped: 0, considered: 0, results: [] }
}

async function importCandidatesUntilTarget(
  candidates: CandidateRepo[],
  targetNew: number,
  options: {
    maxAttempts: number
    budgetMs: number
    aiReviewTimeoutMs: number
  }
) {
  const results: ProcessResult[] = []
  let cursor = 0
  let indexed = 0
  const startedAt = Date.now()
  const candidateLimit = Math.min(candidates.length, options.maxAttempts)

  // Bound the entire review phase. A slow GitHub or model call should make this
  // run smaller, never make the next hourly run disappear behind a timeout.
  while (cursor < candidateLimit && indexed < targetNew) {
    if (Date.now() - startedAt >= options.budgetMs) break
    const remaining = targetNew - indexed
    const batch = candidates.slice(cursor, cursor + Math.min(2, remaining, candidateLimit - cursor))
    cursor += batch.length

    const batchResults = await Promise.all(
      batch.map((candidate) => processRepo(candidate, { aiReviewTimeoutMs: options.aiReviewTimeoutMs }))
    )
    results.push(...batchResults)
    indexed += batchResults.filter((result) => result.status === 'indexed').length

    if (cursor < candidateLimit && indexed < targetNew) {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  return results
}

function skippedSeoResult(dailyLimit: number): SeoDripResult {
  const now = new Date().toISOString()
  return {
    status: 'skipped',
    reason: 'SEO generation runs in the dedicated hourly cron',
    dailyLimit,
    alreadyGeneratedToday: 0,
    remainingToday: dailyLimit,
    attempted: 0,
    generated: 0,
    candidatesChecked: 0,
    results: [],
    indexing: {
      skipped: true,
      success: true,
      status: null,
      submitted: [],
      message: 'Skill radar does not generate SEO posts.',
    },
    window: { start: now, end: now },
  }
}

function mergeCandidates(
  xCandidates: CandidateRepo[],
  githubCandidates: CandidateRepo[],
  limit: number
) {
  const byRepo = new Map<string, CandidateRepo>()

  for (const candidate of [...xCandidates, ...githubCandidates]) {
    const key = candidate.fullName.toLowerCase()
    if (!byRepo.has(key)) byRepo.set(key, candidate)
  }

  return Array.from(byRepo.values()).slice(0, limit)
}

export async function runSkillRadarAutomation(options: SkillRadarOptions = {}): Promise<SkillRadarResult> {
  const startedAt = new Date().toISOString()
  const runKey = new Date().toISOString().replace(/[:.]/g, '-')
  const targetNew = Math.min(Math.max(options.targetNew ?? numberFromEnv('SKILL_RADAR_TARGET_NEW', 2), 1), 12)
  const minStars = Math.max(options.minStars ?? numberFromEnv('SKILL_RADAR_MIN_STARS', 10), 10)
  const seoPerRun = Math.min(
    Math.max(options.seoPerRun ?? 0, 0),
    5
  )
  const seoDailyLimit = options.seoDailyLimit ?? numberFromEnv('SEO_DRIP_DAILY_LIMIT', 50)
  const xMaxQueries = skillRadarXMaxQueries(options)
  const queryOffset = Math.floor(Date.now() / 3_600_000)

  const [xRadar, githubHot] = await Promise.all([
    xMaxQueries > 0
      ? searchXSkillRadarRepos({
          limit: options.xLimit ?? numberFromEnv('SKILL_RADAR_X_LIMIT', 8),
          minStars,
          maxQueries: xMaxQueries,
          maxResultsPerQuery: options.xResultsPerQuery ?? numberFromEnv('SKILL_RADAR_X_RESULTS_PER_QUERY', 10),
          queryOffset,
        })
      : Promise.resolve({
          status: 'skipped' as const,
          reason: 'X radar disabled by budget',
          candidates: [],
          searchedQueries: 0,
          queryOffset,
          inspectedTweets: 0,
          extractedRepos: 0,
          minStars,
        }),
    searchHotSkillRepos({
      limit: options.githubLimit ?? numberFromEnv('SKILL_RADAR_GITHUB_LIMIT', 18),
      minStars,
      lookbackDays: options.githubLookbackDays ?? numberFromEnv('SKILL_RADAR_GITHUB_LOOKBACK_DAYS', 14),
      maxQueries: options.githubMaxQueries ?? numberFromEnv('SKILL_RADAR_GITHUB_MAX_QUERIES', 5),
      queryOffset,
    }),
  ])

  const configuredMaxAttempts = options.maxCandidateAttempts ?? numberFromEnv(
    'SKILL_RADAR_MAX_CANDIDATE_ATTEMPTS',
    targetNew * 4
  )
  const maxCandidateAttempts = Math.min(
    Math.max(configuredMaxAttempts, targetNew * 4, 6),
    12
  )
  const importBudgetMs = Math.min(
    Math.max(numberFromEnv('SKILL_RADAR_IMPORT_BUDGET_MS', 120_000), 30_000),
    180_000
  )
  const aiReviewTimeoutMs = Math.min(
    Math.max(numberFromEnv('SKILL_RADAR_AI_REVIEW_TIMEOUT_MS', 10_000), 3_000),
    15_000
  )
  const reviewLimit = Math.min(Math.max(maxCandidateAttempts * 3, 18), 30)
  const candidates = mergeCandidates(xRadar.candidates, githubHot.candidates, reviewLimit)
  const candidatePool = await excludeExistingCandidates(candidates)
  console.info('[skill-radar] intake pool', {
    discovered: candidates.length,
    alreadyIndexed: candidatePool.existing,
    eligible: candidatePool.candidates.length,
    maxCandidateAttempts,
    targetNew,
  })
  const importResults = candidatePool.candidates.length
    ? await importCandidatesUntilTarget(candidatePool.candidates, targetNew, {
        maxAttempts: maxCandidateAttempts,
        budgetMs: importBudgetMs,
        aiReviewTimeoutMs,
      })
    : []
  const summary = summarizeProcessResults(importResults)
  if (summary.errors > 0) {
    console.warn('[skill-radar] candidate errors', importResults
      .filter((result) => result.status === 'error')
      .slice(0, 3)
      .map(({ repo, reason }) => ({ repo, reason })))
  }
  const indexedSlugs = collectSlugs(importResults, ['indexed'])
  const touchedSlugs = collectSlugs(importResults, ['indexed', 'skipped'])

  const seo = seoPerRun > 0
    ? await runSeoDrip({
        perRun: seoPerRun,
        dailyLimit: seoDailyLimit,
        candidatePool: numberFromEnv('SKILL_RADAR_SEO_CANDIDATE_POOL', 180),
      }).catch(async (error) => ({
        ...skippedSeoResult(seoDailyLimit),
        reason: error instanceof Error ? error.message : 'SEO drip failed',
        indexing: await submitIndexNowUrls([]),
      }))
    : skippedSeoResult(seoDailyLimit)

  const indexingUrls = [
    ...collectIndexNowUrlsFromIndexerResults(importResults),
    ...seo.results
      .filter((result) => result.success && result.slug)
      .map((result) => normalizeIndexNowUrl(`/blog/${result.slug}`))
      .filter((url): url is string => Boolean(url)),
    normalizeIndexNowUrl('/skills'),
    normalizeIndexNowUrl('/trending'),
  ].filter((url): url is string => Boolean(url))
  const indexing = await submitIndexNowUrls(Array.from(new Set(indexingUrls)))

  // X queueing and publishing have their own cron jobs. Keeping them off the
  // ingestion path prevents transient X/API delays from blocking new skills.
  const xQueue = skippedXQueueResult()
  const xPost: XPostResult & { queueItemId?: string } = {
    status: 'skipped',
    reason: 'X publishing runs in the dedicated X cron.',
  }

  const result: SkillRadarResult = {
    success: true,
    runKey,
    source: 'x_and_github',
    xRadar,
    githubHot,
    import: {
      summary,
      results: importResults,
    },
    seo,
    indexing,
    xQueue,
    xPost,
    slugs: {
      indexed: indexedSlugs,
      touched: touchedSlugs,
    },
  }

  await recordSkillRadarRun({
    mode: 'skill-radar',
    status: summary.errors > 0 ? 'completed_with_errors' : 'completed',
    filter_mode: 'skills-only',
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    target_new: targetNew,
    min_stars: minStars,
    max_search_requests: githubHot.searchedQueries + xRadar.searchedQueries,
    search_requests: githubHot.searchedQueries + xRadar.searchedQueries,
    candidates_found: candidates.length,
    skipped_existing: summary.skipped,
    skipped_mcp: 0,
    skipped_low_relevance: summary.rejected,
    imported: summary.indexed,
    updated: 0,
    errors: summary.errors,
    metadata: {
      automation: 'skill-radar',
      maintenance_mode: true,
      run_key: runKey,
      query_offset: queryOffset,
      github_hot: {
        searched_queries: githubHot.searchedQueries,
        query_offset: githubHot.queryOffset,
        candidates: githubHot.candidates.length,
      },
      intake_pool: {
        discovered: candidates.length,
        already_indexed: candidatePool.existing,
        eligible: candidatePool.candidates.length,
        max_candidate_attempts: maxCandidateAttempts,
      },
      x_radar: {
        status: xRadar.status,
        reason: xRadar.reason || null,
        searched_queries: xRadar.searchedQueries,
        query_offset: xRadar.queryOffset,
        inspected_tweets: xRadar.inspectedTweets,
        extracted_repos: xRadar.extractedRepos,
        candidates: xRadar.candidates.length,
      },
      seo: {
        status: seo.status,
        generated: seo.generated,
      },
      indexnow: {
        success: indexing.success,
        submitted: indexing.submitted.length,
      },
      x_queue: {
        status: xQueue.status,
        queued: xQueue.queued,
        fallback_queued: 0,
      },
      x_post: {
        status: xPost.status,
        reason: xPost.reason || null,
      },
    },
  })

  return result
}
