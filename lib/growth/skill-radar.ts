import {
  collectIndexNowUrlsFromIndexerResults,
  normalizeIndexNowUrl,
  submitIndexNowUrls,
  type IndexNowSubmitResult,
} from '@/lib/indexnow'
import { runSeoDrip, type SeoDripResult } from '@/lib/growth/seo-drip'
import { searchHotSkillRepos, type HotSkillDiscoveryResult } from '@/lib/indexer/hot-skill-discovery'
import { searchXSkillRadarRepos, type XSkillRadarResult } from '@/lib/indexer/x-skill-radar'
import { processBatch, type ProcessResult } from '@/lib/indexer/processor'
import type { CandidateRepo } from '@/lib/indexer/github-search'
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

function booleanFromEnv(name: string, fallback: boolean) {
  const value = process.env[name]
  if (value === undefined) return fallback
  return value === 'true' || value === '1'
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
  const runKey = new Date().toISOString().replace(/[:.]/g, '-')
  const targetNew = Math.min(Math.max(options.targetNew ?? numberFromEnv('SKILL_RADAR_TARGET_NEW', 8), 1), 40)
  const minStars = Math.max(options.minStars ?? numberFromEnv('SKILL_RADAR_MIN_STARS', 10), 10)
  const xQueueLimit = Math.min(Math.max(options.xQueueLimit ?? numberFromEnv('SKILL_RADAR_X_QUEUE_LIMIT', 3), 1), 12)
  const xMinStars = Math.max(options.xMinStars ?? numberFromEnv('SKILL_RADAR_X_MIN_STARS', 10), 10)
  const autoPost = options.autoPost ?? booleanFromEnv('SKILL_RADAR_AUTO_POST', false)

  const [xRadar, githubHot] = await Promise.all([
    searchXSkillRadarRepos({
      limit: options.xLimit ?? numberFromEnv('SKILL_RADAR_X_LIMIT', 18),
      minStars,
      maxQueries: options.xMaxQueries ?? numberFromEnv('SKILL_RADAR_X_MAX_QUERIES', 4),
      maxResultsPerQuery: options.xResultsPerQuery ?? numberFromEnv('SKILL_RADAR_X_RESULTS_PER_QUERY', 20),
    }),
    searchHotSkillRepos({
      limit: options.githubLimit ?? numberFromEnv('SKILL_RADAR_GITHUB_LIMIT', 18),
      minStars,
      lookbackDays: options.githubLookbackDays ?? numberFromEnv('SKILL_RADAR_GITHUB_LOOKBACK_DAYS', 14),
      maxQueries: options.githubMaxQueries ?? numberFromEnv('SKILL_RADAR_GITHUB_MAX_QUERIES', 10),
    }),
  ])

  const candidates = mergeCandidates(xRadar.candidates, githubHot.candidates, targetNew)
  const importResults = candidates.length ? await processBatch(candidates, 2) : []
  const summary = summarizeProcessResults(importResults)
  const indexedSlugs = collectSlugs(importResults, ['indexed'])
  const touchedSlugs = collectSlugs(importResults, ['indexed', 'skipped'])

  const seo = await runSeoDrip({
    perRun: options.seoPerRun ?? numberFromEnv('SKILL_RADAR_SEO_PER_RUN', 1),
    dailyLimit: options.seoDailyLimit ?? numberFromEnv('SEO_DRIP_DAILY_LIMIT', 50),
    candidatePool: numberFromEnv('SKILL_RADAR_SEO_CANDIDATE_POOL', 180),
  }).catch(async (error) => ({
    status: 'skipped' as const,
    reason: error instanceof Error ? error.message : 'SEO drip failed',
    dailyLimit: options.seoDailyLimit ?? numberFromEnv('SEO_DRIP_DAILY_LIMIT', 50),
    alreadyGeneratedToday: 0,
    remainingToday: 0,
    attempted: 0,
    generated: 0,
    candidatesChecked: 0,
    results: [],
    indexing: await submitIndexNowUrls([]),
    window: {
      start: new Date().toISOString(),
      end: new Date().toISOString(),
    },
  }))

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

  return {
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
}
