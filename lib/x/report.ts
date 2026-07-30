import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  X_GROWTH_EXPERIMENT_DAYS,
  X_GROWTH_EXPERIMENT_ID,
  X_GROWTH_EXPERIMENT_TOPICS,
} from '@/lib/x/attribution'

type JsonRecord = Record<string, unknown>

interface QueueRow {
  id: string
  skill_slug: string
  content_type: string
  campaign: string
  status: string
  source: string
  metadata: JsonRecord | null
  created_at: string
  posted_at: string | null
}

interface PostRow {
  queue_item_id: string | null
  skill_slug: string
  x_post_id: string | null
  status: string
  posted_at: string | null
  metadata: JsonRecord | null
}

interface MetricRow {
  x_post_id: string
  captured_at: string
  reply_count: number
  repost_count: number
  like_count: number
  quote_count: number
  bookmark_count: number | null
  impression_count: number | null
}

interface EventRow {
  skill_slug: string
  event_type: string
  session_id: string | null
  metadata: JsonRecord | null
  created_at: string
}

export interface XGrowthSummary {
  posts: number
  impressions: number
  medianImpressions: number
  reactions: number
  reactionRate: number | null
  attributedLandingViews: number
  skillViews: number
  installCopies: number
  saves: number
  outboundClicks: number
  conversionRate: number | null
}

export interface XGrowthLaneReport extends XGrowthSummary {
  lane: string
  topics: number
  status: 'learning' | 'candidate' | 'winner'
  score: number
}

export interface XGrowthReport {
  experimentId: string
  startedAt: string | null
  endsAt: string | null
  daysElapsed: number
  daysRemaining: number
  targetTopics: number
  topicsTested: number
  status: 'waiting_for_first_post' | 'collecting' | 'ready_to_choose'
  summary: XGrowthSummary
  baseline: XGrowthSummary
  lanes: XGrowthLaneReport[]
  recommendation: {
    status: 'waiting' | 'learning' | 'winner'
    title: string
    detail: string
  }
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function asNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function asTimestamp(value: string | null | undefined) {
  const timestamp = Date.parse(value || '')
  return Number.isFinite(timestamp) ? timestamp : 0
}

function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2)
}

function percentage(numerator: number, denominator: number) {
  if (!denominator) return null
  return Number(((numerator / denominator) * 100).toFixed(2))
}

function latestMetricsByPost(rows: MetricRow[]) {
  const map = new Map<string, MetricRow>()
  for (const row of rows) {
    const existing = map.get(row.x_post_id)
    if (!existing || asTimestamp(row.captured_at) > asTimestamp(existing.captured_at)) map.set(row.x_post_id, row)
  }
  return map
}

function isThreadFollowUp(row: PostRow) {
  return asRecord(row.metadata).post_role === 'thread_follow_up'
}

function getQueueLane(queue: QueueRow | undefined) {
  const metadata = asRecord(queue?.metadata)
  const lane = metadata.lane || metadata.content_lane || 'legacy'
  return typeof lane === 'string' && lane ? lane : 'legacy'
}

function getTrackingCode(queue: QueueRow | undefined) {
  const value = asRecord(queue?.metadata).tracking_code
  return typeof value === 'string' ? value : null
}

function isExperimentQueue(queue: QueueRow, experimentId: string) {
  return asRecord(queue.metadata).experiment_id === experimentId
}

function isExperimentEvent(event: EventRow, experimentId: string, trackingCodes: Set<string>) {
  const metadata = asRecord(event.metadata)
  const attribution = asRecord(metadata.attribution)
  return attribution.experiment_id === experimentId && typeof attribution.content === 'string' && trackingCodes.has(attribution.content)
}

function buildSummary(
  posts: PostRow[],
  latestMetrics: Map<string, MetricRow>,
  events: EventRow[]
): XGrowthSummary {
  const impressions = posts.map((post) => latestMetrics.get(post.x_post_id || '')?.impression_count || 0)
  const reactions = posts.reduce((sum, post) => {
    const metrics = latestMetrics.get(post.x_post_id || '')
    return sum + asNumber(metrics?.like_count) + asNumber(metrics?.repost_count) + asNumber(metrics?.quote_count) + asNumber(metrics?.bookmark_count)
  }, 0)
  const landingSessions = new Set(
    events
      .filter((event) => event.event_type === 'view' && asRecord(event.metadata).placement === 'x_shortlist_landing')
      .map((event) => event.session_id || `${event.skill_slug}:${event.created_at}`)
  )
  const skillViewSessions = new Set(
    events
      .filter((event) => event.event_type === 'view')
      .map((event) => event.session_id || `${event.skill_slug}:${event.created_at}`)
  )
  const installCopies = events.filter((event) => event.event_type === 'install_copy').length
  const saves = events.filter((event) => event.event_type === 'save').length
  const outboundClicks = events.filter((event) => event.event_type === 'outbound_github' || event.event_type === 'outbound_docs').length
  const totalImpressions = impressions.reduce((sum, value) => sum + value, 0)

  return {
    posts: posts.length,
    impressions: totalImpressions,
    medianImpressions: median(impressions),
    reactions,
    reactionRate: percentage(reactions, totalImpressions),
    attributedLandingViews: landingSessions.size,
    skillViews: skillViewSessions.size,
    installCopies,
    saves,
    outboundClicks,
    conversionRate: percentage(installCopies + saves, landingSessions.size),
  }
}

function emptySummary(): XGrowthSummary {
  return {
    posts: 0,
    impressions: 0,
    medianImpressions: 0,
    reactions: 0,
    reactionRate: null,
    attributedLandingViews: 0,
    skillViews: 0,
    installCopies: 0,
    saves: 0,
    outboundClicks: 0,
    conversionRate: null,
  }
}

function buildRecommendation(
  status: XGrowthReport['status'],
  lanes: XGrowthLaneReport[],
  daysRemaining: number
): XGrowthReport['recommendation'] {
  if (status === 'waiting_for_first_post') {
    return {
      status: 'waiting',
      title: 'Waiting for the first editorial post.',
      detail: 'The daily three-shortlist editorial run will start the experiment and then collect comparable metrics.',
    }
  }

  const eligible = lanes.filter((lane) => lane.posts >= 2 && lane.impressions > 0)
  if (!eligible.length || status === 'collecting') {
    return {
      status: 'learning',
      title: 'Keep learning before choosing a content lane.',
      detail: `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remain. A lane needs two measured main posts before it can be called a winner.`,
    }
  }

  const winner = eligible[0]
  return {
    status: 'winner',
    title: `${winner.lane} is the current winning content lane.`,
    detail: `It leads on the weighted mix of X reactions, attributed landing sessions, and install-or-save intent. Keep the next two posts in this lane while preserving weekly variety.`,
  }
}

export async function getXGrowthReport(
  experimentId = X_GROWTH_EXPERIMENT_ID
): Promise<XGrowthReport> {
  const supabase = createAdminClient({ requestTimeoutMs: 6000 })
  const historyStart = new Date(Date.now() - 60 * 86_400_000).toISOString()

  const [queueResult, postResult, metricResult, eventResult] = await Promise.all([
    supabase
      .from('x_content_queue')
      .select('id, skill_slug, content_type, campaign, status, source, metadata, created_at, posted_at')
      .gte('created_at', historyStart)
      .limit(1000),
    supabase
      .from('x_post_history')
      .select('queue_item_id, skill_slug, x_post_id, status, posted_at, metadata')
      .eq('status', 'posted')
      .gte('posted_at', historyStart)
      .limit(1500),
    supabase
      .from('x_post_metrics')
      .select('x_post_id, captured_at, reply_count, repost_count, like_count, quote_count, bookmark_count, impression_count')
      .gte('captured_at', historyStart)
      .limit(3000),
    supabase
      .from('skill_events')
      .select('skill_slug, event_type, session_id, metadata, created_at')
      .gte('created_at', historyStart)
      .limit(5000),
  ])

  const firstError = [queueResult.error, postResult.error, metricResult.error, eventResult.error].find(Boolean)
  if (firstError) throw new Error(firstError.message)

  const queues = (queueResult.data || []) as QueueRow[]
  const posts = (postResult.data || []) as PostRow[]
  const metrics = (metricResult.data || []) as MetricRow[]
  const events = (eventResult.data || []) as EventRow[]
  const queueById = new Map(queues.map((queue) => [queue.id, queue]))
  const experimentQueues = queues.filter((queue) => isExperimentQueue(queue, experimentId))
  const startTimestamp = experimentQueues.length
    ? Math.min(...experimentQueues.map((queue) => asTimestamp(queue.created_at)).filter(Boolean))
    : 0

  if (!startTimestamp) {
    const blank = emptySummary()
    return {
      experimentId,
      startedAt: null,
      endsAt: null,
      daysElapsed: 0,
      daysRemaining: X_GROWTH_EXPERIMENT_DAYS,
      targetTopics: X_GROWTH_EXPERIMENT_TOPICS,
      topicsTested: 0,
      status: 'waiting_for_first_post',
      summary: blank,
      baseline: blank,
      lanes: [],
      recommendation: buildRecommendation('waiting_for_first_post', [], X_GROWTH_EXPERIMENT_DAYS),
    }
  }

  const startedAt = new Date(startTimestamp)
  const endTimestamp = startTimestamp + X_GROWTH_EXPERIMENT_DAYS * 86_400_000
  const now = Date.now()
  const experimentQueueIds = new Set(experimentQueues.map((queue) => queue.id))
  const trackingCodes = new Set(experimentQueues.map(getTrackingCode).filter((code): code is string => Boolean(code)))
  const mainExperimentPosts = posts.filter((post) => experimentQueueIds.has(post.queue_item_id || '') && !isThreadFollowUp(post))
  const experimentEvents = events.filter((event) => isExperimentEvent(event, experimentId, trackingCodes))
  const latestMetrics = latestMetricsByPost(metrics)
  const summary = buildSummary(mainExperimentPosts, latestMetrics, experimentEvents)

  const baselineStart = startTimestamp - X_GROWTH_EXPERIMENT_DAYS * 86_400_000
  const baselinePosts = posts.filter((post) => {
    const timestamp = asTimestamp(post.posted_at)
    return timestamp >= baselineStart && timestamp < startTimestamp && !isThreadFollowUp(post)
  })
  const baseline = buildSummary(baselinePosts, latestMetrics, [])

  const laneGroups = new Map<string, { posts: PostRow[]; events: EventRow[]; topics: Set<string> }>()
  for (const queue of experimentQueues) {
    const lane = getQueueLane(queue)
    const group = laneGroups.get(lane) || { posts: [], events: [], topics: new Set<string>() }
    const topic = asRecord(queue.metadata).experiment_topic
    if (typeof topic === 'string') group.topics.add(topic)
    laneGroups.set(lane, group)
  }
  for (const post of mainExperimentPosts) {
    const lane = getQueueLane(queueById.get(post.queue_item_id || ''))
    const group = laneGroups.get(lane) || { posts: [], events: [], topics: new Set<string>() }
    group.posts.push(post)
    laneGroups.set(lane, group)
  }
  for (const event of experimentEvents) {
    const attribution = asRecord(asRecord(event.metadata).attribution)
    const queue = experimentQueues.find((row) => getTrackingCode(row) === attribution.content)
    const lane = getQueueLane(queue)
    const group = laneGroups.get(lane) || { posts: [], events: [], topics: new Set<string>() }
    group.events.push(event)
    laneGroups.set(lane, group)
  }

  const lanes: XGrowthLaneReport[] = Array.from(laneGroups.entries())
    .map(([lane, group]) => {
      const laneSummary = buildSummary(group.posts, latestMetrics, group.events)
      const score = Number((
        laneSummary.attributedLandingViews * 12 +
        (laneSummary.installCopies + laneSummary.saves) * 80 +
        laneSummary.reactions * 8 +
        laneSummary.impressions / 100
      ).toFixed(2))
      return {
        lane,
        topics: group.topics.size,
        ...laneSummary,
        status: 'learning' as XGrowthLaneReport['status'],
        score,
      }
    })
    .sort((left, right) => right.score - left.score || right.impressions - left.impressions)

  const daysElapsed = Math.max(1, Math.ceil((now - startTimestamp) / 86_400_000))
  const daysRemaining = Math.max(0, Math.ceil((endTimestamp - now) / 86_400_000))
  const topicsTested = new Set(
    experimentQueues
      .map((queue) => asRecord(queue.metadata).experiment_topic)
      .filter((topic): topic is string => typeof topic === 'string')
  ).size
  const status: XGrowthReport['status'] =
    daysRemaining > 0 || topicsTested < X_GROWTH_EXPERIMENT_TOPICS
      ? 'collecting'
      : 'ready_to_choose'
  const eligibleLanes = lanes.filter((lane) => lane.posts >= 2 && lane.impressions > 0)
  if (status === 'ready_to_choose' && eligibleLanes.length) {
    const winner = eligibleLanes[0]
    const index = lanes.findIndex((lane) => lane.lane === winner.lane)
    if (index >= 0) lanes[index] = { ...winner, status: 'winner' }
  } else {
    for (let index = 0; index < lanes.length; index += 1) {
      if (lanes[index].posts >= 2) lanes[index] = { ...lanes[index], status: 'candidate' }
    }
  }

  return {
    experimentId,
    startedAt: startedAt.toISOString(),
    endsAt: new Date(endTimestamp).toISOString(),
    daysElapsed,
    daysRemaining,
    targetTopics: X_GROWTH_EXPERIMENT_TOPICS,
    topicsTested,
    status,
    summary,
    baseline,
    lanes,
    recommendation: buildRecommendation(status, lanes, daysRemaining),
  }
}
