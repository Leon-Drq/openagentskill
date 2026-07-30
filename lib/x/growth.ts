import { buildSkillAudit } from '@/lib/audits'
import { getAllSkills, type SkillRecord } from '@/lib/db/skills'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { getSkillTrustProfile } from '@/lib/trust'
import {
  createXPost,
  createXReplyPost,
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
import {
  getXCandidateDecision,
  getXContentLane,
  isGenericFoundationRepoName,
  isGoodXCandidate,
} from '@/lib/x/candidates'
import { buildXShortlist, getXShortlistEdition, getXShortlistLaneForDate } from '@/lib/x/shortlist'
import { createXTrackingCode, X_GROWTH_EXPERIMENT_ID } from '@/lib/x/attribution'

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
  digest: XQueueBuildResult
  retiredLegacyQueueItems: number
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

function numberFromEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
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

function toQueueMetadata(
  skill: SkillRecord,
  minStars = 500,
  tracking?: { campaign: string; content: string; experimentId?: string }
) {
  const trust = getSkillTrustProfile(skill)
  const audit = buildSkillAudit(skill)
  const candidate = getXCandidateDecision(skill, minStars)
  const contentLane = candidate.lane

  return {
    url: tracking
      ? `https://www.openagentskill.com/skills/${skill.slug}?ref=x&utm_source=x&utm_medium=organic&utm_campaign=${encodeURIComponent(tracking.campaign)}&utm_content=${encodeURIComponent(tracking.content)}&experiment=${encodeURIComponent(tracking.experimentId || X_GROWTH_EXPERIMENT_ID)}`
      : `https://www.openagentskill.com/skills/${skill.slug}?ref=x`,
    github_repo: skill.github_repo,
    github_stars: skill.github_stars,
    category: skill.category,
    tags: skill.tags,
    quality_score: Number(skill.quality_score || 0),
    trust_score: trust.score,
    trust_tier: trust.tier,
    audit_score: audit.audit_score,
    audit_risk_level: audit.risk_level,
    content_lane: contentLane,
    scenario: contentLane === 'general' ? null : contentLane,
    x_candidate_reason: candidate.reason,
    x_candidate_signals: candidate.signals,
    utm_campaign: contentLane === 'general' ? 'daily_skill' : `${contentLane}_skill`,
    install_command: skill.install_command || `npx skills add ${skill.github_repo}`,
    generated_by: 'x_growth_os',
    ...(tracking
      ? {
          tracking_code: tracking.content,
          experiment_id: tracking.experimentId || X_GROWTH_EXPERIMENT_ID,
        }
      : {}),
  }
}

async function enqueueQueueItem(
  supabase: SupabasePublicClient,
  serverSecret: string,
  skill: SkillRecord,
  options: {
    campaign: string
    scheduledFor?: string
    minStars?: number
  }
) {
  const contentLane = getXContentLane(skill)
  const campaign = contentLane === 'general' ? options.campaign : `${contentLane}_${options.campaign}`
  const trackingCode = createXTrackingCode({
    lane: contentLane,
    edition: new Date().toISOString().slice(0, 10),
    format: 'skill',
  })
  const tracking = { campaign, content: trackingCode, experimentId: X_GROWTH_EXPERIMENT_ID }
  const url = `https://www.openagentskill.com/skills/${skill.slug}?ref=x&utm_source=x&utm_medium=organic&utm_campaign=${encodeURIComponent(campaign)}&utm_content=${encodeURIComponent(trackingCode)}&experiment=${X_GROWTH_EXPERIMENT_ID}`
  const { data, error } = await supabase.rpc('enqueue_x_content_queue_item', {
    p_server_secret: serverSecret,
    p_item: {
      skill_id: skill.id,
      skill_slug: skill.slug,
      content_type: 'skill_pick',
      campaign,
      status: 'queued',
      priority: getQueuePriority(skill),
      scheduled_for: options.scheduledFor || new Date().toISOString(),
      post_text: buildSkillPostText(skill, { url }),
      reply_text: buildManualXReplyText(skill),
      source: 'auto_skill_generator',
      metadata: toQueueMetadata(skill, options.minStars, tracking),
    },
  })

  if (error) throw new Error(`Failed to enqueue X content: ${error.message}`)
  return data as QueueRpcResult
}

async function getRecentlyFeaturedShortlistSkillSlugs(days = 14) {
  try {
    const supabase = createAdminClient({ requestTimeoutMs: 2500 })
    const since = new Date(Date.now() - days * 86_400_000).toISOString()
    const { data, error } = await supabase
      .from('x_content_queue')
      .select('metadata')
      .eq('content_type', 'weekly_thread')
      .in('status', ['queued', 'posting', 'posted'])
      .gte('created_at', since)
      .limit(80)
    if (error) throw new Error(error.message)

    const seen = new Set<string>()
    for (const item of data || []) {
      const metadata = item.metadata as Record<string, unknown> | null
      const picks = Array.isArray(metadata?.skills) ? metadata.skills : []
      for (const pick of picks) {
        if (pick && typeof pick === 'object' && typeof (pick as { slug?: unknown }).slug === 'string') {
          seen.add((pick as { slug: string }).slug)
        }
      }
    }
    return seen
  } catch (error) {
    console.warn('[x-growth] unable to load recent shortlist picks:', error)
    return new Set<string>()
  }
}

async function retireLegacyAutoQueueItems() {
  try {
    const supabase = createAdminClient({ requestTimeoutMs: 3500 })
    const { data, error } = await supabase
      .from('x_content_queue')
      .update({
        status: 'skipped',
        error: 'Retired by editorial feedback loop: replaced by daily task shortlists',
        locked_at: null,
      })
      .in('source', ['auto_skill_generator', 'weekly_digest_generator'])
      .eq('status', 'queued')
      .select('id')
    if (error) throw new Error(error.message)
    return data?.length || 0
  } catch (error) {
    console.warn('[x-growth] unable to retire legacy queue items:', error)
    return 0
  }
}

export async function enqueueXDigestPostQueue(
  options: {
    minStars?: number
    candidatePool?: number
    campaign?: string
    date?: Date
    experimentId?: string
    laneOffset?: number
  } = {}
): Promise<XQueueBuildResult> {
  const serverSecret = getServerSecret()
  const supabase = createPublicClient()
  const minStars = Math.max(options.minStars || 100, 25)
  const candidatePool = Math.min(Math.max(options.candidatePool || 500, 120), 1000)
  const date = options.date || new Date()
  const edition = getXShortlistEdition(date)
  const candidates = (await getAllSkills('quality', undefined, candidatePool))
    .filter((skill) => isGoodXCandidate(skill, minStars))
    .sort((a, b) => getQueuePriority(b) - getQueuePriority(a))

  const lane = getXShortlistLaneForDate(candidates, date, options.laneOffset || 0)
  if (!lane) {
    return { status: 'skipped', queued: 0, skipped: 1, considered: candidates.length, results: [] }
  }

  const recentSkillSlugs = await getRecentlyFeaturedShortlistSkillSlugs(14)
  const trackingCode = createXTrackingCode({ lane, edition, format: 'shortlist' })
  const experimentId = options.experimentId || X_GROWTH_EXPERIMENT_ID
  const campaign = options.campaign || `editorial_shortlist_${lane}`
  const shortlist = buildXShortlist(lane, candidates, {
    edition,
    limit: 5,
    excludeSkillSlugs: recentSkillSlugs,
    tracking: {
      campaign,
      content: trackingCode,
      experimentId,
    },
  })
  if (shortlist.picks.length < 3) {
    return { status: 'skipped', queued: 0, skipped: 1, considered: candidates.length, results: [] }
  }

  const { data, error } = await supabase.rpc('enqueue_x_content_queue_item', {
    p_server_secret: serverSecret,
    p_item: {
      skill_id: null,
      skill_slug: shortlist.slug,
      content_type: 'weekly_thread',
      campaign,
      status: 'queued',
      // One task-first shortlist is the daily editorial anchor. It runs ahead
      // of any explicit, manually queued creator announcement.
      priority: 300,
      scheduled_for: new Date().toISOString(),
      post_text: shortlist.mainText,
      reply_text: shortlist.replyText,
      source: 'editorial_shortlist_generator',
      metadata: {
        generated_by: 'x_growth_os',
        digest_type: 'task_shortlist',
        content_format: 'scenario_shortlist',
        experiment_id: experimentId,
        experiment_topic: `${lane}-${edition}`,
        tracking_code: trackingCode,
        tracking_url: shortlist.url,
        expected_action: 'shortlist_visit_then_skill_install',
        auto_thread_reply: true,
        lane: shortlist.lane,
        edition: shortlist.edition,
        shortlist_url: shortlist.url,
        share_assets: shortlist.shareAssets,
        skills: shortlist.picks.map((pick) => ({
          slug: pick.skill.slug,
          name: pick.skill.name,
          role: pick.role,
          reason: pick.reason,
          stars: pick.skill.github_stars,
          quality_score: pick.qualityScore,
        })),
      },
    },
  })

  if (error) throw new Error(`Failed to enqueue X digest: ${error.message}`)
  const result = data as QueueRpcResult

  return {
    status: result.status === 'queued' ? 'ready' : 'skipped',
    queued: result.status === 'queued' ? 1 : 0,
    skipped: result.status === 'queued' ? 0 : 1,
    considered: candidates.length,
    results: [result],
  }
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
    const result = await enqueueQueueItem(supabase, serverSecret, skill, { campaign, minStars })
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

async function getApprovedSkillsBySlugs(
  supabase: SupabasePublicClient,
  slugs: string[],
  limit: number
) {
  const uniqueSlugs = Array.from(new Set(slugs.map((slug) => slug.trim()).filter(Boolean))).slice(0, 100)
  if (!uniqueSlugs.length) return []

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('ai_review_approved', true)
    .in('slug', uniqueSlugs)
    .limit(uniqueSlugs.length)

  if (error) throw new Error(`Failed to load skills for X queue: ${error.message}`)

  const skillsBySlug = new Map((data || []).map((skill) => [skill.slug, skill as SkillRecord]))
  return uniqueSlugs
    .map((slug) => skillsBySlug.get(slug))
    .filter((skill): skill is SkillRecord => Boolean(skill))
    .slice(0, limit)
}

export async function enqueueXSkillPostQueueForSlugs(
  options: {
    slugs: string[]
    limit?: number
    minStars?: number
    campaign?: string
  }
): Promise<XQueueBuildResult> {
  const serverSecret = getServerSecret()
  const supabase = createPublicClient()
  const limit = Math.min(Math.max(options.limit || 8, 1), 25)
  const minStars = Math.max(options.minStars || 10, 10)
  const campaign = options.campaign || 'github_hot_daily'
  const skills = (await getApprovedSkillsBySlugs(supabase, options.slugs, limit * 3))
    .filter((skill) => isGoodXCandidate(skill, minStars))
    .sort((a, b) => getQueuePriority(b) - getQueuePriority(a))
    .slice(0, limit)

  const results: QueueRpcResult[] = []
  for (const skill of skills) {
    const result = await enqueueQueueItem(supabase, serverSecret, skill, { campaign, minStars })
    results.push(result)
  }

  const queued = results.filter((result) => result.status === 'queued').length
  const skipped = results.filter((result) => result.status !== 'queued').length

  return {
    status: queued > 0 ? 'ready' : 'skipped',
    queued,
    skipped,
    considered: skills.length,
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

function getQueuedSkillSkipReason(item: XContentQueueItem) {
  if (item.content_type !== 'skill_pick') return null

  const metadata = item.metadata || {}
  const repo = item.skill?.github_repo || (typeof metadata.github_repo === 'string' ? metadata.github_repo : null)
  if (isGenericFoundationRepoName(repo)) return 'generic-foundation-repo'

  const candidateReason = typeof metadata.x_candidate_reason === 'string' ? metadata.x_candidate_reason : null
  // `skill-like-*` is the positive decision produced by getXCandidateDecision.
  // It used to be treated as a skip reason, which silently retired every
  // otherwise eligible queued post before it reached the X API.
  if (candidateReason && !candidateReason.startsWith('skill-like-')) return candidateReason

  return null
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

  let queueBuild: Pick<XQueueBuildResult, 'status' | 'queued' | 'skipped' | 'considered'> | null = null
  if (options.autoBuildQueue === true) {
    try {
      const result = await enqueueXSkillPostQueue({ limit: options.buildLimit || 8 })
      queueBuild = {
        status: result.status,
        queued: result.queued,
        skipped: result.skipped,
        considered: result.considered,
      }
    } catch (error) {
      console.warn('[x-growth] queue refill failed:', error)
    }
  }

  let item: XContentQueueItem | null = null
  const skippedQueueItems: Array<{ skillSlug: string; reason: string }> = []
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidateItem = await claimNextQueueItem(supabase, serverSecret)
    if (!candidateItem) break

    const skipReason = getQueuedSkillSkipReason(candidateItem)
    if (skipReason) {
      await completeQueueItem(supabase, serverSecret, candidateItem.id, 'skipped', {
        error: `Skipped before posting: ${skipReason}`,
        metadata: {
          skipped_by: 'x_candidate_guard',
          skip_reason: skipReason,
          github_repo: candidateItem.skill?.github_repo || candidateItem.metadata?.github_repo || null,
        },
      })
      skippedQueueItems.push({ skillSlug: candidateItem.skill_slug, reason: skipReason })
      continue
    }

    item = candidateItem
    break
  }

  if (!item) {
    console.info('[x-growth] no postable X queue item', { queueBuild, skippedQueueItems })
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
        post_role: 'main',
        tracking_code: item.metadata?.tracking_code || null,
        experiment_id: item.metadata?.experiment_id || null,
        content_format: item.metadata?.content_format || item.content_type,
        queue: {
          content_type: item.content_type,
          campaign: item.campaign,
          attempts: item.attempts,
        },
        response: created,
      },
    })

    const shouldPostThreadReply =
      item.content_type === 'weekly_thread' &&
      item.metadata?.auto_thread_reply === true &&
      typeof item.reply_text === 'string' &&
      item.reply_text.trim().length > 0
    let threadReply: { id: string; url: string } | null = null
    let threadReplyError: string | null = null

    if (shouldPostThreadReply) {
      try {
        const reply = await createXReplyPost(token.access_token, item.reply_text!.trim(), postId)
        const replyId = reply.data?.id
        if (!replyId) throw new Error(`X thread reply did not include an id: ${JSON.stringify(reply)}`)

        threadReply = {
          id: replyId,
          url: `https://x.com/${connection.username}/status/${replyId}`,
        }
        await recordXPost(supabase, serverSecret, {
          queue_item_id: item.id,
          skill_slug: item.skill_slug,
          status: 'posted',
          x_post_id: replyId,
          post_text: item.reply_text,
          posted_at: new Date().toISOString(),
          metadata: {
            username: connection.username,
            parent_x_post_id: postId,
            post_role: 'thread_follow_up',
            tracking_code: item.metadata?.tracking_code || null,
            experiment_id: item.metadata?.experiment_id || null,
            type: 'task_shortlist_reply',
            response: reply,
          },
        })
      } catch (error) {
        threadReplyError = error instanceof Error ? error.message : 'Unknown X thread reply error'
        console.warn('[x-growth] main post succeeded but task shortlist reply failed:', threadReplyError)
      }
    }

    await completeQueueItem(supabase, serverSecret, item.id, 'posted', {
      xPostId: postId,
      metadata: {
        posted_url: `https://x.com/${connection.username}/status/${postId}`,
        ...(threadReply ? { thread_reply_id: threadReply.id, thread_reply_url: threadReply.url } : {}),
        ...(threadReplyError ? { thread_reply_error: threadReplyError } : {}),
      },
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
  const limit = Math.min(Math.max(options.limit || numberFromEnv('X_METRICS_SYNC_LIMIT', 12), 1), 100)
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
    maxDrafts?: number
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
    maxResults: Math.min(Math.max(options.limit || numberFromEnv('X_REPLY_SYNC_LIMIT', 8), 5), 100),
  })
  const data = mentions.data || []
  if (!data.length) return { status: 'skipped', reason: 'No recent mentions found', mentions: 0, drafted: 0, skipped: 0 }

  const authors = new Map((mentions.includes?.users || []).map((user) => [user.id, user]))
  const skills = (await getAllSkills('quality', undefined, 250)).filter((skill) => isGoodXCandidate(skill, 100))
  const maxDrafts = Math.min(Math.max(options.maxDrafts || numberFromEnv('X_CREATOR_REPLY_DRAFT_LIMIT', 1), 1), 3)
  const candidateMentions = data
    .filter((mention) => mention.author_id !== connection.x_user_id)
    .map((mention) => ({ mention, selected: selectSkillForMention(mention.text, skills) }))
    .filter((candidate) => candidate.selected?.skill && candidate.selected.score >= 15)
    .sort((left, right) => (right.selected?.score || 0) - (left.selected?.score || 0))

  let drafted = 0
  let skipped = data.length - candidateMentions.length

  for (const candidate of candidateMentions) {
    if (drafted >= maxDrafts) {
      skipped += 1
      continue
    }
    const mention = candidate.mention
    const selected = candidate.selected
    if (mention.author_id === connection.x_user_id) {
      skipped += 1
      continue
    }
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
  const retiredLegacyQueueItems = await retireLegacyAutoQueueItems()
  const queue: XQueueBuildResult = {
    status: 'skipped',
    queued: 0,
    skipped: retiredLegacyQueueItems,
    considered: 0,
    results: retiredLegacyQueueItems
      ? [{ status: 'skipped', reason: `Retired ${retiredLegacyQueueItems} legacy generic posts` }]
      : [],
  }
  const dailyShortlistCount = Math.min(Math.max(numberFromEnv('X_DAILY_SCENARIO_POSTS', 3), 3), 5)
  const digestParts = await Promise.all(
    Array.from({ length: dailyShortlistCount }, (_, laneOffset) =>
      enqueueXDigestPostQueue({ laneOffset }).catch((error) => ({
        status: 'skipped' as const,
        queued: 0,
        skipped: 1,
        considered: 0,
        results: [{ status: 'skipped', reason: error instanceof Error ? error.message : 'Unknown digest error' }],
      }))
    )
  )
  const digest: XQueueBuildResult = {
    status: digestParts.some((part) => part.status === 'ready') ? 'ready' : 'skipped',
    queued: digestParts.reduce((sum, part) => sum + part.queued, 0),
    skipped: digestParts.reduce((sum, part) => sum + part.skipped, 0),
    considered: Math.max(0, ...digestParts.map((part) => part.considered)),
    results: digestParts.flatMap((part) => part.results),
  }
  const metrics = await syncXPostMetrics({ limit: numberFromEnv('X_METRICS_SYNC_LIMIT', 12) }).catch((error) => ({
    status: 'error' as const,
    error: error instanceof Error ? error.message : 'Unknown X metrics sync error',
  }))
  const replies = await syncXReplyDrafts({
    limit: numberFromEnv('X_REPLY_SYNC_LIMIT', 8),
    maxDrafts: numberFromEnv('X_CREATOR_REPLY_DRAFT_LIMIT', 1),
  }).catch((error) => ({
    status: 'error' as const,
    error: error instanceof Error ? error.message : 'Unknown X replies sync error',
  }))

  return { queue, digest, retiredLegacyQueueItems, metrics, replies }
}
