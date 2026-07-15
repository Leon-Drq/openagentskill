import { generateBlogPostForSkill, type BlogGenerateResult } from '@/lib/blog/generate'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  collectIndexNowUrlsFromIndexerResults,
  normalizeIndexNowUrl,
  submitIndexNowUrls,
  type IndexNowSubmitResult,
} from '@/lib/indexnow'
import { searchHotSkillRepos, type HotSkillDiscoveryResult } from '@/lib/indexer/hot-skill-discovery'
import { bulkImportHighStarSkills, type BulkImportSummary } from '@/lib/indexer/high-star-import'
import { processBatch, type ProcessResult } from '@/lib/indexer/processor'
import {
  enqueueXSkillPostQueue,
  enqueueXSkillPostQueueForSlugs,
  postNextQueuedSkillToX,
  type XQueueBuildResult,
} from '@/lib/x/growth'
import type { XPostResult } from '@/lib/x/poster'

export interface DailyGrowthOptions {
  targetNew?: number
  hotLimit?: number
  hotMinStars?: number
  hotLookbackDays?: number
  hotMaxQueries?: number
  bulkMinStars?: number
  bulkMaxSearchRequests?: number
  blogLimit?: number
  xQueueLimit?: number
  xMinStars?: number
  autoPost?: boolean
}

export interface SeoGenerationResult {
  status: 'generated' | 'skipped'
  reason?: string
  attempted: number
  generated: number
  results: Array<BlogGenerateResult & { skill_slug?: string }>
}

export interface DailyGrowthResult {
  success: boolean
  runKey: string
  hotDiscovery: HotSkillDiscoveryResult
  hotImport: {
    summary: Record<string, number>
    results: ProcessResult[]
  }
  broadImport: {
    summary: BulkImportSummary | null
    results: Array<{ repo: string; status: string; slug?: string; reason?: string }>
  }
  seo: SeoGenerationResult
  indexing: IndexNowSubmitResult
  xQueue: XQueueBuildResult
  xFallbackQueue?: XQueueBuildResult
  xPost: XPostResult & { queueItemId?: string }
  slugs: {
    indexed: string[]
    indexedOrUpdated: string[]
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

function utcDayWindow(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const end = new Date(start.getTime() + 86_400_000)
  return {
    start: start.toISOString(),
    end: end.toISOString(),
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

function collectSlugsByStatus(
  results: Array<{ status?: string; slug?: string }>,
  statuses: string[]
) {
  const statusSet = new Set(statuses)
  return unique(results.map((result) => (result.slug && statusSet.has(result.status || '') ? result.slug : undefined)))
}

async function generateSeoPostsForSlugs(
  slugs: string[],
  limit: number
): Promise<SeoGenerationResult> {
  const selectedSlugs = unique(slugs).slice(0, Math.max(0, limit))
  if (!selectedSlugs.length) {
    return { status: 'skipped', reason: 'No newly indexed skills need SEO posts', attempted: 0, generated: 0, results: [] }
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('skills')
      .select('id, slug')
      .in('slug', selectedSlugs)

    if (error) throw new Error(error.message)

    const skillsBySlug = new Map((data || []).map((skill) => [skill.slug as string, skill as { id: string; slug: string }]))
    const orderedSkills = selectedSlugs
      .map((slug) => skillsBySlug.get(slug))
      .filter((skill): skill is { id: string; slug: string } => Boolean(skill))

    const results: Array<BlogGenerateResult & { skill_slug?: string }> = []
    for (const skill of orderedSkills) {
      const result = await generateBlogPostForSkill(skill.id)
      results.push({ ...result, skill_slug: skill.slug })
      if (orderedSkills.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 750))
      }
    }

    return {
      status: results.some((result) => result.success) ? 'generated' : 'skipped',
      reason: results.some((result) => result.success) ? undefined : 'No new blog posts were created',
      attempted: orderedSkills.length,
      generated: results.filter((result) => result.success).length,
      results,
    }
  } catch (error) {
    return {
      status: 'skipped',
      reason: error instanceof Error ? error.message : 'SEO generation failed',
      attempted: selectedSlugs.length,
      generated: 0,
      results: [],
    }
  }
}

async function remainingDailySeoPostQuota(dailyLimit: number) {
  const supabase = createAdminClient()
  const window = utcDayWindow()
  const { count, error } = await supabase
    .from('blog_posts')
    .select('id', { count: 'exact', head: true })
    .gte('published_at', window.start)
    .lt('published_at', window.end)

  if (error) throw new Error(`Failed to count today's blog posts: ${error.message}`)
  return Math.max(0, dailyLimit - (count || 0))
}

export async function runDailyGrowthAutomation(
  options: DailyGrowthOptions = {}
): Promise<DailyGrowthResult> {
  const runKey = new Date().toISOString().slice(0, 10)
  const targetNew = Math.min(Math.max(options.targetNew ?? numberFromEnv('GROWTH_DAILY_TARGET_NEW', 2), 1), 250)
  const hotLimit = Math.min(Math.max(options.hotLimit ?? numberFromEnv('GROWTH_DAILY_HOT_LIMIT', 24), 1), 80)
  const blogLimit = Math.min(Math.max(options.blogLimit ?? nonNegativeNumberFromEnv('GROWTH_DAILY_BLOG_LIMIT', 0), 0), 12)
  const seoDailyLimit = Math.min(Math.max(numberFromEnv('SEO_DRIP_DAILY_LIMIT', 50), 1), 100)
  const xQueueLimit = Math.min(Math.max(options.xQueueLimit ?? numberFromEnv('GROWTH_DAILY_X_QUEUE_LIMIT', 8), 1), 25)
  const xMinStars = Math.max(options.xMinStars ?? numberFromEnv('GROWTH_DAILY_X_MIN_STARS', 10), 10)
  const autoPost = options.autoPost ?? booleanFromEnv('GROWTH_DAILY_AUTO_POST', true)

  const hotDiscovery = await searchHotSkillRepos({
    limit: hotLimit,
    minStars: options.hotMinStars ?? numberFromEnv('GROWTH_DAILY_HOT_MIN_STARS', 10),
    lookbackDays: options.hotLookbackDays ?? numberFromEnv('GROWTH_DAILY_LOOKBACK_DAYS', 21),
    maxQueries: options.hotMaxQueries ?? numberFromEnv('GROWTH_DAILY_HOT_MAX_QUERIES', 12),
  })

  const hotResults = hotDiscovery.candidates.length
    ? await processBatch(hotDiscovery.candidates, 2)
    : []
  const hotSummary = summarizeProcessResults(hotResults)
  const remainingTarget = Math.max(0, targetNew - hotSummary.indexed)

  const broadImport = remainingTarget > 0
    ? await bulkImportHighStarSkills({
        profileKey: 'daily-hot-growth',
        targetNew: Math.min(remainingTarget, targetNew),
        targetTotal: numberFromEnv('GROWTH_DAILY_TARGET_TOTAL', numberFromEnv('INDEXER_TARGET_TOTAL', 50_000)),
        minStars: options.bulkMinStars ?? numberFromEnv('GROWTH_DAILY_BULK_MIN_STARS', 100),
        adaptiveExpansionMinStars: numberFromEnv('GROWTH_DAILY_ADAPTIVE_MIN_STARS', 50),
        adaptiveExpansionSearchRequests: numberFromEnv('GROWTH_DAILY_ADAPTIVE_SEARCH_REQUESTS', 10),
        maxSearchRequests: options.bulkMaxSearchRequests ?? numberFromEnv('GROWTH_DAILY_BULK_MAX_SEARCH_REQUESTS', 25),
        duplicateRecoverySearchRequests: numberFromEnv('GROWTH_DAILY_DUPLICATE_RECOVERY_REQUESTS', 5),
        maxStaleDays: numberFromEnv('GROWTH_DAILY_MAX_STALE_DAYS', 365),
        strictQuality: true,
        includeCollections: false,
        pageSeed: Math.floor(Date.now() / 86_400_000),
      })
    : { summary: null, results: [] }

  const combinedResults = [...hotResults, ...broadImport.results]
  const indexedSlugs = collectSlugsByStatus(combinedResults, ['indexed'])
  const indexedOrUpdatedSlugs = collectSlugsByStatus(combinedResults, ['indexed', 'updated'])
  const seoRemainingToday = blogLimit > 0 ? await remainingDailySeoPostQuota(seoDailyLimit) : 0
  const seo = await generateSeoPostsForSlugs(indexedSlugs, Math.min(blogLimit, seoRemainingToday))

  const indexingUrls = new Set([
    ...collectIndexNowUrlsFromIndexerResults(combinedResults),
    ...seo.results
      .filter((result) => result.success && result.slug)
      .map((result) => normalizeIndexNowUrl(`/blog/${result.slug}`))
      .filter((url): url is string => Boolean(url)),
    normalizeIndexNowUrl('/blog'),
  ].filter((url): url is string => Boolean(url)))
  const indexing = await submitIndexNowUrls(Array.from(indexingUrls))

  const xQueueSourceSlugs = indexedSlugs.length ? indexedSlugs : indexedOrUpdatedSlugs
  const xQueue = xQueueSourceSlugs.length
    ? await enqueueXSkillPostQueueForSlugs({
      slugs: xQueueSourceSlugs,
      limit: xQueueLimit,
      minStars: xMinStars,
      campaign: 'github_hot_daily',
      })
    : { status: 'skipped' as const, queued: 0, skipped: 0, considered: 0, results: [] }

  const xFallbackQueue = xQueue.queued === 0
    ? await enqueueXSkillPostQueue({
        limit: Math.min(xQueueLimit, 6),
        minStars: Math.max(xMinStars, 100),
        campaign: 'github_hot_daily_fallback',
      }).catch((error) => ({
        status: 'skipped' as const,
        queued: 0,
        skipped: 1,
        considered: 0,
        results: [{ status: 'skipped', reason: error instanceof Error ? error.message : 'Fallback X queue failed' }],
      }))
    : undefined

  const xPost = autoPost
    ? await postNextQueuedSkillToX({ autoBuildQueue: false }).catch((error) => ({
        status: 'skipped' as const,
        reason: error instanceof Error ? error.message : 'X auto-post failed',
      }))
    : { status: 'skipped' as const, reason: 'Auto-post disabled' }

  return {
    success: true,
    runKey,
    hotDiscovery,
    hotImport: {
      summary: hotSummary,
      results: hotResults,
    },
    broadImport,
    seo,
    indexing,
    xQueue,
    ...(xFallbackQueue ? { xFallbackQueue } : {}),
    xPost,
    slugs: {
      indexed: indexedSlugs,
      indexedOrUpdated: indexedOrUpdatedSlugs,
    },
  }
}
