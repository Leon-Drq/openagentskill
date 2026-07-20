import { generateBlogPostForSkill, isBlogMcpSkillRecord, type BlogGenerateResult } from '@/lib/blog/generate'
import { normalizeIndexNowUrl, submitIndexNowUrls, type IndexNowSubmitResult } from '@/lib/indexnow'
import { createAdminClient } from '@/lib/supabase/admin'

interface SeoDripSkill {
  id: string
  slug: string
  name: string | null
  description: string | null
  long_description: string | null
  tagline: string | null
  category: string | null
  tags: string[] | null
  frameworks: string[] | null
  github_repo: string | null
}

export interface SeoDripOptions {
  perRun?: number
  dailyLimit?: number
  candidatePool?: number
}

export interface SeoDripResult {
  status: 'generated' | 'skipped'
  reason?: string
  dailyLimit: number
  alreadyGeneratedToday: number
  remainingToday: number
  attempted: number
  generated: number
  candidatesChecked: number
  results: Array<BlogGenerateResult & { skill_slug?: string }>
  indexing: IndexNowSubmitResult
  window: {
    start: string
    end: string
  }
}

function numberFromEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function utcDayWindow(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const end = new Date(start.getTime() + 86_400_000)
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

async function countPostsToday(supabase: ReturnType<typeof createAdminClient>, window: { start: string; end: string }) {
  const { count, error } = await supabase
    .from('blog_posts')
    .select('id', { count: 'exact', head: true })
    .gte('published_at', window.start)
    .lt('published_at', window.end)

  if (error) throw new Error(`Failed to count today's blog posts: ${error.message}`)
  return count || 0
}

async function findSkillsNeedingBlog(
  supabase: ReturnType<typeof createAdminClient>,
  limit: number,
  candidatePool: number
) {
  const { data, error } = await supabase
    .from('skills')
    .select('id, slug, name, description, long_description, tagline, category, tags, frameworks, github_repo')
    .eq('ai_review_approved', true)
    .order('created_at', { ascending: false })
    .limit(candidatePool)

  if (error) throw new Error(`Failed to fetch blog candidates: ${error.message}`)

  const candidates = ((data || []) as SeoDripSkill[]).filter((skill) => !isBlogMcpSkillRecord(skill))
  const candidateIds = candidates.map((skill) => skill.id)
  if (!candidateIds.length) return { candidatesChecked: 0, skills: [] as SeoDripSkill[] }

  const { data: existingPosts, error: existingError } = await supabase
    .from('blog_posts')
    .select('skill_id')
    .in('skill_id', candidateIds)

  if (existingError) throw new Error(`Failed to fetch existing blog posts: ${existingError.message}`)

  const existingSkillIds = new Set((existingPosts || []).map((post: { skill_id: string | null }) => post.skill_id))
  const skills = candidates
    .filter((skill) => !existingSkillIds.has(skill.id))
    .slice(0, limit)

  return { candidatesChecked: candidates.length, skills }
}

export async function runSeoDrip(options: SeoDripOptions = {}): Promise<SeoDripResult> {
  // Background generation should yield quickly during a transient database
  // incident instead of tying up a serverless worker that competes with page
  // traffic. The next hourly run will safely retry.
  const supabase = createAdminClient({ requestTimeoutMs: 12_000 })
  const dailyLimit = Math.min(Math.max(options.dailyLimit ?? numberFromEnv('SEO_DRIP_DAILY_LIMIT', 50), 1), 100)
  const perRun = Math.min(Math.max(options.perRun ?? numberFromEnv('SEO_DRIP_PER_RUN', 2), 1), 5)
  const candidatePool = Math.min(Math.max(options.candidatePool ?? numberFromEnv('SEO_DRIP_CANDIDATE_POOL', 120), 20), 300)
  const window = utcDayWindow()
  const alreadyGeneratedToday = await countPostsToday(supabase, window)
  const remainingToday = Math.max(0, dailyLimit - alreadyGeneratedToday)

  if (remainingToday <= 0) {
    const indexing = await submitIndexNowUrls([])
    return {
      status: 'skipped',
      reason: 'Daily SEO post limit reached',
      dailyLimit,
      alreadyGeneratedToday,
      remainingToday,
      attempted: 0,
      generated: 0,
      candidatesChecked: 0,
      results: [],
      indexing,
      window,
    }
  }

  const limit = Math.min(perRun, remainingToday)
  const { candidatesChecked, skills } = await findSkillsNeedingBlog(supabase, limit, candidatePool)

  if (!skills.length) {
    const indexing = await submitIndexNowUrls([])
    return {
      status: 'skipped',
      reason: 'No approved skills need SEO posts',
      dailyLimit,
      alreadyGeneratedToday,
      remainingToday,
      attempted: 0,
      generated: 0,
      candidatesChecked,
      results: [],
      indexing,
      window,
    }
  }

  const results: Array<BlogGenerateResult & { skill_slug?: string }> = []
  for (const skill of skills) {
    const result = await generateBlogPostForSkill(skill.id)
    results.push({ ...result, skill_slug: skill.slug })
    if (skills.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 750))
    }
  }

  const urls = [
    '/blog',
    ...results
      .filter((result) => result.success && result.slug)
      .map((result) => `/blog/${result.slug}`),
  ]
    .map((url) => normalizeIndexNowUrl(url))
    .filter((url): url is string => Boolean(url))

  const indexing = await submitIndexNowUrls(urls)
  const generated = results.filter((result) => result.success).length

  return {
    status: generated > 0 ? 'generated' : 'skipped',
    reason: generated > 0 ? undefined : 'Blog generation returned no new published posts',
    dailyLimit,
    alreadyGeneratedToday,
    remainingToday,
    attempted: skills.length,
    generated,
    candidatesChecked,
    results,
    indexing,
    window,
  }
}
