import { buildSkillAudit } from '@/lib/audits'
import { getAllSkills, type SkillRecord } from '@/lib/db/skills'
import { createPublicClient } from '@/lib/supabase/public'
import { getSkillTrustProfile } from '@/lib/trust'
import {
  createXPost,
  getXTweetsByIds,
  getXUserMentions,
  refreshXAccessToken,
  type XTweetRecord,
} from '@/lib/x/oauth'
import {
  buildManualXReplyText,
  buildSkillPostText,
  getStoredXConnection,
  recordXPost,
  saveRefreshedXToken,
  type XPostResult,
} from '@/lib/x/poster'

type SupabasePublicClient = ReturnType<typeof createPublicClient>

interface QueueRpcResult {
  status: string
  reason?: string
  id?: string
  skill_slug?: string
}

interface XContentQueueItem {
  id: string
  skill_id: string | null
  skill_slug: string
  content_type: string
  campaign: string
  priority: number
  post_text: string
  reply_text: string | null
  attempts: number
  metadata: Record<string, unknown>
  skill?: {
    id: string
    slug: string
    name: string
    description: string
    category: string
    tags: string[]
    github_repo: string
    github_stars: number
    quality_score: number
    install_command: string | null
  } | null
}

interface XMetricTarget {
  x_post_id: string
  queue_item_id?: string | null
  skill_slug?: string | null
  posted_at?: string | null
}

interface XReplyAuthor {
  id: string
  name?: string
  username?: string
}

export interface XQueueBuildResult {
  status: 'ready' | 'skipped'
  queued: number
  skipped: number
  considered: number
  results: QueueRpcResult[]
}

export interface XMetricsSyncResult {
  status: 'synced' | 'skipped'
  reason?: string
  requested: number
  recorded: number
  missing: number
}

export interface XReplyDraftSyncResult {
  status: 'drafted' | 'skipped'
  reason?: string
  mentions: number
  drafted: number
  skipped: number
}

export interface XGrowthRunResult {
  queue: XQueueBuildResult
  metrics: XMetricsSyncResult | { status: 'error'; error: string }
  replies: XReplyDraftSyncResult | { status: 'error'; error: string }
}

function getServerSecret() {
  const serverSecret = process.env.INDEXER_SECRET
  if (!serverSecret) throw new Error('Missing INDEXER_SECRET')
  return serverSecret
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

function compactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return String(value)
}

function getFreshnessBoost(skill: SkillRecord) {
  const timestamp = Date.parse(skill.github_last_pushed_at || skill.updated_at || skill.created_at)
  if (!Number.isFinite(timestamp)) return 0
  const ageDays = Math.max(0, (Date.now() - timestamp) / 86_400_000)
  if (ageDays <= 30) return 16
  if (ageDays <= 90) return 10
  if (ageDays <= 365) return 4
  return 0
}

function getQueuePriority(skill: SkillRecord) {
  const stars = Math.max(0, Number(skill.github_stars || 0))
  const quality = Math.max(0, Number(skill.quality_score || 0))
  return Math.round(quality + Math.log10(stars + 10) * 12 + getFreshnessBoost(skill))
}

function getSkillShareText(skill: SkillRecord) {
  return [
    skill.name,
    skill.description,
    skill.long_description,
    skill.tagline,
    skill.category,
    skill.github_repo,
    skill.repository,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function isGenericHighStarRepo(skill: SkillRecord) {
  const repo = (skill.github_repo || '').toLowerCase()
  return [
    /^freecodecamp\/freecodecamp$/,
    /^ebookfoundation\/free-programming-books$/,
    /^thealgorithms\/python$/,
    /^tensorflow\/tensorflow$/,
    /^huggingface\/transformers$/,
    /^ohmyzsh\/ohmyzsh$/,
  ].some((pattern) => pattern.test(repo))
}

function hasShareableAgentUseCase(skill: SkillRecord) {
  const text = getSkillShareText(skill)
  const category = (skill.category || '').toLowerCase()

  if (/(^|-)agent(s|-|$)|agent-skills|coding-agents|document-processing|web-scraping|browser-automation|research|finance|quant|football|world-cup|marketing|design|data-analysis|legal/.test(category)) {
    return true
  }

  return /\b(agent|agents|agentic|skill|skills|codex|claude code|cursor|workflow|automation|automate|scrap(e|ing)|crawl(er|ing)?|browser|playwright|puppeteer|pdf|document|markdown|rag|retrieval|research|stock|stocks|quant|trading|portfolio|football|world cup|soccer|seo|marketing|figma|design|code review|pull request|testing|security audit)\b/.test(text)
}

function isGoodXCandidate(skill: SkillRecord, minStars: number) {
  if (!skill.ai_review_approved) return false
  if (Number(skill.github_stars || 0) < minStars) return false
  if (Number(skill.quality_score || 0) < 45) return false
  if (!skill.github_repo) return false
  if (!skill.description) return false
  if (isGenericHighStarRepo(skill)) return false
  if (!hasShareableAgentUseCase(skill)) return false
  return true
}

function toQueueMetadata(skill: SkillRecord) {
  const trust = getSkillTrustProfile(skill)
  const audit = buildSkillAudit(skill)

  return {
    url: `https://www.openagentskill.com/skills/${skill.slug}?ref=x`,
    github_repo: skill.github_repo,
    github_stars: skill.github_stars,
    category: skill.category,
    tags: skill.tags,
    quality_score: Number(skill.quality_score || 0),
    trust_score: trust.score,
    trust_tier: trust.tier,
    audit_score: audit.audit_score,
    audit_risk_level: audit.risk_level,
    install_command: skill.install_command || `npx skills add ${skill.github_repo}`,
    generated_by: 'x_growth_os',
  }
}

async function enqueueQueueItem(
  supabase: SupabasePublicClient,
  serverSecret: string,
  skill: SkillRecord,
  options: {
    campaign: string
    scheduledFor?: string
  }
) {
  const { data, error } = await supabase.rpc('enqueue_x_content_queue_item', {
    p_server_secret: serverSecret,
    p_item: {
      skill_id: skill.id,
      skill_slug: skill.slug,
      content_type: 'skill_pick',
      campaign: options.campaign,
      status: 'queued',
      priority: getQueuePriority(skill),
      scheduled_for: options.scheduledFor || new Date().toISOString(),
      post_text: buildSkillPostText(skill),
      reply_text: buildManualXReplyText(skill),
      source: 'auto_skill_generator',
      metadata: toQueueMetadata(skill),
    },
  })

  if (error) throw new Error(`Failed to enqueue X content: ${error.message}`)
  return data as QueueRpcResult
}

export async function enqueueXSkillPostQueue(
  options: {
    limit?: number
    minStars?: number
    campaign?: string
    candidatePool?: number
  } = {}
): Promise<XQueueBuildResult> {
  const serverSecret = getServerSecret()
  const supabase = createPublicClient()
  const limit = Math.min(Math.max(options.limit || 10, 1), 50)
  const minStars = Math.max(options.minStars || 500, 100)
  const candidatePool = Math.min(Math.max(options.candidatePool || limit * 12, 50), 500)
  const campaign = options.campaign || 'daily_skill'

  const candidates = (await getAllSkills('quality', undefined, candidatePool))
    .filter((skill) => isGoodXCandidate(skill, minStars))
    .sort((a, b) => getQueuePriority(b) - getQueuePriority(a))
    .slice(0, candidatePool)

  const results: QueueRpcResult[] = []

  for (const skill of candidates) {
    if (results.filter((result) => result.status === 'queued').length >= limit) break
    const result = await enqueueQueueItem(supabase, serverSecret, skill, { campaign })
    results.push(result)
  }

  const queued = results.filter((result) => result.status === 'queued').length
  const skipped = results.filter((result) => result.status !== 'queued').length

  return {
    status: queued > 0 ? 'ready' : 'skipped',
    queued,
    skipped,
    considered: candidates.length,
    results,
  }
}

async function claimNextQueueItem(supabase: SupabasePublicClient, serverSecret: string) {
  const { data, error } = await supabase.rpc('claim_x_content_queue_item', {
    p_server_secret: serverSecret,
  })

  if (error) throw new Error(`Failed to claim X queue item: ${error.message}`)
  return (data || null) as XContentQueueItem | null
}

async function completeQueueItem(
  supabase: SupabasePublicClient,
  serverSecret: string,
  itemId: string,
  status: 'posted' | 'error' | 'skipped',
  options: {
    xPostId?: string | null
    error?: string | null
    metadata?: Record<string, unknown>
  } = {}
) {
  const { error } = await supabase.rpc('complete_x_content_queue_item', {
    p_server_secret: serverSecret,
    p_item_id: itemId,
    p_status: status,
    p_x_post_id: options.xPostId || null,
    p_error: options.error || null,
    p_metadata: options.metadata || {},
  })

  if (error) throw new Error(`Failed to complete X queue item: ${error.message}`)
}

export async function postNextQueuedSkillToX(
  options: {
    autoBuildQueue?: boolean
    buildLimit?: number
  } = {}
): Promise<XPostResult & { queueItemId?: string }> {
  const serverSecret = getServerSecret()
  const supabase = createPublicClient()
  const connection = await getStoredXConnection(supabase, serverSecret)
  if (!connection) {
    return { status: 'skipped', reason: 'X account is not authorized yet' }
  }

  const token = await refreshXAccessToken(connection.refresh_token)
  await saveRefreshedXToken(supabase, serverSecret, token)

  if (options.autoBuildQueue !== false) {
    await enqueueXSkillPostQueue({ limit: options.buildLimit || 8 }).catch((error) => {
      console.warn('[x-growth] queue refill failed:', error)
    })
  }

  const item = await claimNextQueueItem(supabase, serverSecret)
  if (!item) {
    return { status: 'skipped', reason: 'No queued X content is ready' }
  }

  const skill = item.skill || undefined

  try {
    const created = await createXPost(token.access_token, item.post_text)
    const postId = created.data?.id
    if (!postId) {
      throw new Error(`X post response did not include an id: ${JSON.stringify(created)}`)
    }

    await recordXPost(supabase, serverSecret, {
      queue_item_id: item.id,
      skill_id: item.skill_id || skill?.id,
      skill_slug: item.skill_slug,
      status: 'posted',
      x_post_id: postId,
      post_text: item.post_text,
      posted_at: new Date().toISOString(),
      metadata: {
        username: connection.username,
        queue: {
          content_type: item.content_type,
          campaign: item.campaign,
          attempts: item.attempts,
        },
        response: created,
      },
    })

    await completeQueueItem(supabase, serverSecret, item.id, 'posted', {
      xPostId: postId,
      metadata: { posted_url: `https://x.com/${connection.username}/status/${postId}` },
    })

    return {
      status: 'posted',
      queueItemId: item.id,
      skill,
      post: {
        id: postId,
        text: item.post_text,
        url: `https://x.com/${connection.username}/status/${postId}`,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown X post error'
    await completeQueueItem(supabase, serverSecret, item.id, 'error', { error: message })
    await recordXPost(supabase, serverSecret, {
      queue_item_id: item.id,
      skill_id: item.skill_id || skill?.id,
      skill_slug: item.skill_slug,
      status: 'error',
      post_text: item.post_text,
      error: message,
      metadata: {
        username: connection.username,
        queue: {
          content_type: item.content_type,
          campaign: item.campaign,
          attempts: item.attempts,
        },
      },
    })
    throw error
  }
}

async function getMetricTargets(
  supabase: SupabasePublicClient,
  serverSecret: string,
  limit: number
) {
  const { data, error } = await supabase.rpc('get_x_post_metric_targets', {
    p_server_secret: serverSecret,
    p_limit: limit,
  })

  if (error) throw new Error(`Failed to load X metric targets: ${error.message}`)
  return (Array.isArray(data) ? data : []) as XMetricTarget[]
}

async function recordMetric(
  supabase: SupabasePublicClient,
  serverSecret: string,
  target: XMetricTarget,
  tweet: XTweetRecord
) {
  const metrics = tweet.public_metrics || {}
  const { error } = await supabase.rpc('record_x_post_metric', {
    p_server_secret: serverSecret,
    p_metric: {
      x_post_id: target.x_post_id,
      queue_item_id: target.queue_item_id || null,
      skill_slug: target.skill_slug || null,
      captured_at: new Date().toISOString(),
      reply_count: metrics.reply_count || 0,
      repost_count: metrics.retweet_count || 0,
      like_count: metrics.like_count || 0,
      quote_count: metrics.quote_count || 0,
      bookmark_count: metrics.bookmark_count ?? null,
      impression_count: metrics.impression_count ?? null,
      raw_metrics: metrics,
    },
  })

  if (error) throw new Error(`Failed to record X post metric: ${error.message}`)
}

export async function syncXPostMetrics(
  options: {
    limit?: number
  } = {}
): Promise<XMetricsSyncResult> {
  const serverSecret = getServerSecret()
  const supabase = createPublicClient()
  const limit = Math.min(Math.max(options.limit || 50, 1), 100)
  const targets = await getMetricTargets(supabase, serverSecret, limit)
  if (!targets.length) {
    return { status: 'skipped', reason: 'No posts need metric refresh', requested: 0, recorded: 0, missing: 0 }
  }

  const connection = await getStoredXConnection(supabase, serverSecret)
  if (!connection) {
    return { status: 'skipped', reason: 'X account is not authorized yet', requested: targets.length, recorded: 0, missing: targets.length }
  }

  const token = await refreshXAccessToken(connection.refresh_token)
  await saveRefreshedXToken(supabase, serverSecret, token)

  const lookup = await getXTweetsByIds(token.access_token, targets.map((target) => target.x_post_id))
  const tweetsById = new Map((lookup.data || []).map((tweet) => [tweet.id, tweet]))
  let recorded = 0

  for (const target of targets) {
    const tweet = tweetsById.get(target.x_post_id)
    if (!tweet) continue
    await recordMetric(supabase, serverSecret, target, tweet)
    recorded += 1
  }

  return {
    status: 'synced',
    requested: targets.length,
    recorded,
    missing: targets.length - recorded,
  }
}

function getWords(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/[^a-z0-9+#.\-/]+/g, ' ')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3)
    )
  )
}

function scoreSkillForMention(skill: SkillRecord, words: string[]) {
  const haystack = [
    skill.name,
    skill.description,
    skill.long_description,
    skill.tagline,
    skill.category,
    skill.github_repo,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ].join(' ').toLowerCase()

  const lexicalScore = words.reduce((score, word) => score + (haystack.includes(word) ? 8 : 0), 0)
  const qualityScore = Math.min(18, Number(skill.quality_score || 0) / 6)
  const starScore = Math.min(14, Math.log10(Number(skill.github_stars || 0) + 10) * 3)
  return lexicalScore + qualityScore + starScore
}

function selectSkillForMention(mentionText: string, skills: SkillRecord[]) {
  const words = getWords(mentionText)
  return skills
    .map((skill) => ({
      skill,
      score: scoreSkillForMention(skill, words),
    }))
    .sort((a, b) => b.score - a.score)[0]
}

function buildMentionReplyDraft(skill: SkillRecord) {
  const url = `https://www.openagentskill.com/skills/${skill.slug}?ref=x&utm_source=x_reply`
  const intro = `Good prompt. I'd shortlist ${truncate(skill.name, 54)} for this workflow.`
  const reason = truncate(skill.description, 116)
  const close = 'OpenAgentSkill shows trust, install path, and alternatives before an agent acts.'
  const full = [intro, reason, '', url, '', close].join('\n')
  if (full.length <= 280) return full

  const shorter = [intro, '', url, '', 'Includes trust score, install path, and alternatives.'].join('\n')
  if (shorter.length <= 280) return shorter

  return [truncate(intro, 110), url].join('\n').slice(0, 280)
}

async function recordReplyDraft(
  supabase: SupabasePublicClient,
  serverSecret: string,
  mention: XTweetRecord,
  author: XReplyAuthor | undefined,
  skill: SkillRecord,
  score: number
) {
  const username = author?.username || 'unknown'
  const sourceUrl = `https://x.com/${username}/status/${mention.id}`
  const { data, error } = await supabase.rpc('record_x_reply_draft', {
    p_server_secret: serverSecret,
    p_draft: {
      source_tweet_id: mention.id,
      source_url: sourceUrl,
      source_author_username: author?.username || null,
      source_author_name: author?.name || null,
      source_text: mention.text,
      skill_id: skill.id,
      skill_slug: skill.slug,
      draft_text: buildMentionReplyDraft(skill),
      status: 'draft',
      score,
      reason: `${compactNumber(skill.github_stars)} stars, quality ${Math.round(Number(skill.quality_score || 0))}`,
      metadata: {
        mention_created_at: mention.created_at,
        mention_metrics: mention.public_metrics || {},
        source: 'x_mentions_sync',
      },
    },
  })

  if (error) throw new Error(`Failed to record X reply draft: ${error.message}`)
  return data as QueueRpcResult
}

export async function syncXReplyDrafts(
  options: {
    limit?: number
  } = {}
): Promise<XReplyDraftSyncResult> {
  const serverSecret = getServerSecret()
  const supabase = createPublicClient()
  const connection = await getStoredXConnection(supabase, serverSecret)
  if (!connection) return { status: 'skipped', reason: 'X account is not authorized yet', mentions: 0, drafted: 0, skipped: 0 }
  if (!connection.x_user_id) return { status: 'skipped', reason: 'Stored X connection is missing user id', mentions: 0, drafted: 0, skipped: 0 }

  const token = await refreshXAccessToken(connection.refresh_token)
  await saveRefreshedXToken(supabase, serverSecret, token)

  const mentions = await getXUserMentions(token.access_token, connection.x_user_id, {
    maxResults: Math.min(Math.max(options.limit || 20, 5), 100),
  })
  const data = mentions.data || []
  if (!data.length) return { status: 'skipped', reason: 'No recent mentions found', mentions: 0, drafted: 0, skipped: 0 }

  const authors = new Map((mentions.includes?.users || []).map((user) => [user.id, user]))
  const skills = (await getAllSkills('quality', undefined, 250)).filter((skill) => isGoodXCandidate(skill, 100))
  let drafted = 0
  let skipped = 0

  for (const mention of data) {
    if (mention.author_id === connection.x_user_id) {
      skipped += 1
      continue
    }

    const selected = selectSkillForMention(mention.text, skills)
    if (!selected?.skill || selected.score < 15) {
      skipped += 1
      continue
    }

    const result = await recordReplyDraft(supabase, serverSecret, mention, authors.get(mention.author_id || ''), selected.skill, selected.score)
    if (result.status === 'drafted') drafted += 1
    else skipped += 1
  }

  return {
    status: drafted > 0 ? 'drafted' : 'skipped',
    mentions: data.length,
    drafted,
    skipped,
  }
}

export async function runXGrowthOS(): Promise<XGrowthRunResult> {
  const queue = await enqueueXSkillPostQueue({ limit: 12 })
  const metrics = await syncXPostMetrics({ limit: 50 }).catch((error) => ({
    status: 'error' as const,
    error: error instanceof Error ? error.message : 'Unknown X metrics sync error',
  }))
  const replies = await syncXReplyDrafts({ limit: 25 }).catch((error) => ({
    status: 'error' as const,
    error: error instanceof Error ? error.message : 'Unknown X replies sync error',
  }))

  return { queue, metrics, replies }
}
