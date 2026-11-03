import 'server-only'
import type { ReadDatabase } from './db/cloudflare-read'
import { drainIndexNowQueue, enqueueIndexNowUrls, getIndexNowQueueStatus } from './indexnow-queue'
import { isSearchIndexEligible } from './seo/search-indexability'

const SITE_URL = 'https://www.openagentskill.com'
const SITE_HOST = 'www.openagentskill.com'
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
const INDEXNOW_REQUEST_TIMEOUT_MS = 10_000

export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '2c3f8b6e7f9a4b18ad0c9136f61d5a2e'
export const INDEXNOW_KEY_LOCATION =
  process.env.INDEXNOW_KEY_LOCATION || `${SITE_URL}/${INDEXNOW_KEY}.txt`

export interface IndexNowSubmitResult {
  skipped: boolean
  success: boolean
  status: number | null
  submitted: string[]
  message: string
  responseBody?: string
  queued?: number
  nextAttemptAt?: string | null
  delivered?: boolean
}

export function normalizeIndexNowUrl(value: string): string | null {
  if (!value) return null

  try {
    const url = new URL(value, SITE_URL)
    if (!['www.openagentskill.com', 'openagentskill.com'].includes(url.hostname)) return null
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return null
    if (url.pathname.startsWith('/api/') || url.pathname.endsWith('/audit') || /\/sitemap[^/]*\.xml$/.test(url.pathname)) return null
    url.protocol = 'https:'
    url.hostname = SITE_HOST
    url.hash = ''
    url.search = ''
    return url.toString()
  } catch {
    return null
  }
}

export function buildIndexNowUrlsForSkill(slug: string) {
  const encodedSlug = encodeURIComponent(slug)
  return [
    `/skills/${encodedSlug}`,
    '/skills',
    '/trending',
    '/hot',
  ]
}

export function collectIndexNowUrlsFromIndexerResults(
  results: Array<{ status?: string; slug?: string }> = []
) {
  const urls = new Set<string>()

  for (const result of results) {
    if (!result.slug) continue
    if (result.status !== 'indexed' && result.status !== 'updated') continue
    for (const url of buildIndexNowUrlsForSkill(result.slug)) {
      const normalized = normalizeIndexNowUrl(url)
      if (normalized) urls.add(normalized)
    }
  }

  return Array.from(urls)
}

export function getBaselineIndexNowUrls() {
  return [
    '/',
    '/skills',
    '/agent',
    '/agent-skills',
    '/ai-agent-skills',
    '/skills-registry',
    '/openagentskill',
    '/trending',
    '/hot',
    '/best',
    '/tasks',
    '/rankings',
    '/reports/weekly',
    '/alternatives/agentskills-io',
  ]
    .map((url) => normalizeIndexNowUrl(url))
    .filter((url): url is string => Boolean(url))
}

async function queueDatabase(): Promise<ReadDatabase> {
  const { getCloudflareContext } = await import('@opennextjs/cloudflare')
  const db = (getCloudflareContext().env as { APP_DB?: ReadDatabase }).APP_DB
  if (!db) throw new Error('IndexNow queue database unavailable')
  return db
}

export async function eligibleIndexNowUrls(db: ReadDatabase, urls: string[]) {
  const skills = urls.flatMap(url => {
    const match = /^\/skills\/([^/]+)$/.exec(new URL(url).pathname)
    if (!match) return []
    try { return [decodeURIComponent(match[1])] } catch { return [] }
  })
  if (!skills.length) return urls
  const rows = (await db.prepare(`SELECT slug,ai_review_approved,quality_score,github_stars,publisher_verified,
    github_repo,source_path,source_commit_sha,source_content_hash,source_sync_status,license,listing_status
    FROM skills WHERE slug IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(skills)).all()).results
  const eligible = new Set(rows.filter(row => isSearchIndexEligible({
    ...row,
    slug: String(row.slug),
    ai_review_approved: row.ai_review_approved === 1,
    publisher_verified: row.publisher_verified === 1,
    quality_score: Number(row.quality_score), github_stars: Number(row.github_stars),
  })).map(row => String(row.slug)))
  return urls.filter(url => {
    const match = /^\/skills\/([^/]+)$/.exec(new URL(url).pathname)
    if (!match) return true
    try { return eligible.has(decodeURIComponent(match[1])) } catch { return false }
  })
}

/** Accept changed URLs into durable storage. Delivery belongs to the hourly
 * drain, never to individual publication requests. */
export async function submitIndexNowUrls(urls: string[]): Promise<IndexNowSubmitResult> {
  const urlList = Array.from(
    new Set(
      urls
        .map((url) => normalizeIndexNowUrl(url))
        .filter((url): url is string => Boolean(url))
    )
  )

  if (process.env.INDEXNOW_DISABLED === 'true') {
    return {
      skipped: true,
      success: true,
      status: null,
      submitted: [],
      message: 'IndexNow submission disabled by INDEXNOW_DISABLED=true.',
    }
  }

  if (urlList.length === 0) {
    return {
      skipped: true,
      success: true,
      status: null,
      submitted: [],
      message: 'No valid OpenAgentSkill URLs to submit.',
    }
  }

  if (urlList.length > 10_000) return { skipped: true, success: false, status: null, submitted: [], message: 'IndexNow accepts at most 10,000 changed URLs per enqueue.' }
  try {
    const db = await queueDatabase()
    const eligible = await eligibleIndexNowUrls(db, urlList)
    await enqueueIndexNowUrls(db, eligible)
    const state = await getIndexNowQueueStatus(db)
    return { skipped: eligible.length === 0, success: true, status: null, submitted: [], delivered: false,
      queued: state.pending, nextAttemptAt: state.nextAttemptAt,
      message: `Queued ${eligible.length} changed URLs for batched IndexNow delivery.` }
  } catch {
    return { skipped: false, success: false, status: null, submitted: [], delivered: false,
      message: 'IndexNow queue persistence failed; no outbound submission was attempted.' }
  }
}

export async function flushIndexNowQueue(): Promise<IndexNowSubmitResult> {
  if (process.env.INDEXNOW_DISABLED === 'true') return { skipped: true, success: true, status: null, submitted: [], message: 'IndexNow delivery disabled.' }
  try {
    const db = await queueDatabase()
    const result = await drainIndexNowQueue(db, async urlList => {
      const response = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'User-Agent': 'OpenAgentSkill-IndexNow/1.0 (+https://www.openagentskill.com)',
        },
        body: JSON.stringify({
          host: SITE_HOST,
          key: INDEXNOW_KEY,
          keyLocation: INDEXNOW_KEY_LOCATION,
          urlList,
        }),
        signal: AbortSignal.timeout(INDEXNOW_REQUEST_TIMEOUT_MS),
        redirect: 'error',
      })
      await response.body?.cancel().catch(() => {})
      return { success: response.status === 200 || response.status === 202, status: response.status, retryAfter: response.headers.get('retry-after') }
    })
    if (result.attempted) console.info('[indexnow] Delivery', { status: result.status, delivered: result.success,
      count: result.submitted.length, pending: result.pending, nextAttemptAt: result.nextAttemptAt })
    return { skipped: !result.attempted, success: result.success, status: result.status, submitted: result.submitted,
      delivered: result.attempted && result.success, queued: result.pending, nextAttemptAt: result.nextAttemptAt,
      message: !result.attempted ? 'No due URLs or delivery is cooling down.' : result.success
        ? `IndexNow accepted ${result.submitted.length} URLs.` : 'IndexNow delivery deferred; URLs retained for automatic retry.' }
  } catch {
    return { skipped: false, success: false, status: null, submitted: [], delivered: false,
      message: 'IndexNow queue unavailable; delivery was not acknowledged.' }
  }
}
