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
import {
  enqueueXSkillPostQueue,
  enqueueXSkillPostQueueForSlugs,
  postNextQueuedSkillToX,
  type XQueueBuildResult,
} from '@/lib/x/growth'
import type { XPostResult } from '@/lib/x/poster'

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

function booleanFromEnv(name: string, fallback: boolean) {
  const value = process.env[name]
  if (value === undefined) return fallback
  return value === 'true' || value === '1'
}

function skillRadarXMaxQueries(options: SkillRadarOptions) {
  if (options.xMaxQueries !== undefined) {
    return Math.min(Math.max(options.xMaxQueries, 0), 8)
  }

  const maxQueries = Math.min(
    Math.max(nonNegativeNumberFromEnv('SKILL_RADAR_X_MAX_QUERIES', 1), 0),
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

  const { error } = await createPublicClient().rpc('record_indexer_run', {
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

async function importCandidatesUntilTarget(candidates: CandidateRepo[], targetNew: number) {
  const results: ProcessResult[] = []
  let cursor = 0
  let indexed = 0

  // Keep a small review buffer. Rejected or already-indexed repos should not make
  // an hourly run look empty when the next candidate is a valid skill.
  while (cursor < candidates.length && indexed < targetNew) {
    const remaining = targetNew - indexed
    const batch = candidates.slice(cursor, cursor + Math.min(2, remaining))
    cursor += batch.length

    const batchResults = await Promise.all(batch.map((candidate) => processRepo(candidate)))
    results.push(...batchResults)
    indexed += batchResults.filter((result) => result.status === 'indexed').length

    if (cursor < candidates.length && indexed < targetNew) {
      await new Promise((resolve) => setTimeout(resolve, 500))
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
  const xQueueLimit = Math.min(Math.max(options.xQueueLimit ?? numberFromEnv('SKILL_RADAR_X_QUEUE_LIMIT', 2), 1), 12)
  const xMinStars = Math.max(options.xMinStars ?? numberFromEnv('SKILL_RADAR_X_MIN_STARS', 10), 10)
  const autoPost = options.autoPost ?? booleanFromEnv('SKILL_RADAR_AUTO_POST', false)
  const seoPerRun = Math.min(
    Math.max(options.seoPerRun ?? nonNegativeNumberFromEnv('SKILL_RADAR_SEO_PER_RUN', 0), 0),
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
      limit: options.githubLimit ?? numberFromEnv('SKILL_RADAR_GITHUB_LIMIT', 22),
      minStars,
      lookbackDays: options.githubLookbackDays ?? numberFromEnv('SKILL_RADAR_GITHUB_LOOKBACK_DAYS', 14),
      maxQueries: options.githubMaxQueries ?? numberFromEnv('SKILL_RADAR_GITHUB_MAX_QUERIES', 6),
      queryOffset,
    }),
  ])

  const reviewLimit = Math.min(Math.max(targetNew * 3, 6), 12)
  const candidates = mergeCandidates(xRadar.candidates, githubHot.candidates, reviewLimit)
  const importResults = candidates.length ? await importCandidatesUntilTarget(candidates, targetNew) : []
  const summary = summarizeProcessResults(importResults)
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

  const xQueueSourceSlugs = indexedSlugs.length ? indexedSlugs : touchedSlugs
  const xQueue = xQueueSourceSlugs.length
    ? await enqueueXSkillPostQueueForSlugs({
      slugs: xQueueSourceSlugs,
      limit: xQueueLimit,
      minStars: xMinStars,
      campaign: 'skill_radar',
      }).catch((error) => ({
        status: 'skipped' as const,
        queued: 0,
        skipped: 1,
        considered: 0,
        results: [{ status: 'skipped', reason: error instanceof Error ? error.message : 'Skill radar X queue failed' }],
      }))
    : { status: 'skipped' as const, queued: 0, skipped: 0, considered: 0, results: [] }

  const xFallbackQueue = xQueue.queued === 0
    ? await enqueueXSkillPostQueue({
        limit: Math.min(xQueueLimit, 4),
        minStars: Math.max(xMinStars, 100),
        campaign: 'skill_radar_fallback',
      }).catch((error) => ({
        status: 'skipped' as const,
        queued: 0,
        skipped: 1,
        considered: 0,
        results: [{ status: 'skipped', reason: error instanceof Error ? error.message : 'Skill radar fallback X queue failed' }],
      }))
    : undefined

  const xPost = autoPost
    ? await postNextQueuedSkillToX({ autoBuildQueue: false }).catch((error) => ({
        status: 'skipped' as const,
        reason: error instanceof Error ? error.message : 'Skill radar X auto-post failed',
      }))
    : { status: 'skipped' as const, reason: 'Auto-post disabled for radar run' }

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
    ...(xFallbackQueue ? { xFallbackQueue } : {}),
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
        fallback_queued: xFallbackQueue?.queued || 0,
      },
      x_post: {
        status: xPost.status,
        reason: xPost.reason || null,
      },
    },
  })

  return result
}
