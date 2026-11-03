import 'server-only'
import type { ReadDatabase } from './db/cloudflare-read'

export const INDEXNOW_BATCH_SIZE = 100
export const INDEXNOW_MIN_INTERVAL_MS = 60 * 60 * 1000
const MAX_BACKOFF_MS = 24 * INDEXNOW_MIN_INTERVAL_MS
const LEASE_MS = 120_000

export interface IndexNowDelivery {
  success: boolean
  status: number | null
  retryAfter?: string | null
}

export function indexNowRetryDelay(failures: number, retryAfter: string | null | undefined, now: number) {
  const backoff = Math.min(MAX_BACKOFF_MS, INDEXNOW_MIN_INTERVAL_MS * 2 ** Math.min(5, Math.max(0, failures - 1)))
  if (!retryAfter?.trim()) return backoff
  const seconds = /^\d+$/.test(retryAfter.trim()) ? Number(retryAfter) * 1000 : NaN
  const delay = Number.isFinite(seconds) ? seconds : Date.parse(retryAfter) - now
  // Never shorten a provider's Retry-After, including dates beyond our backoff cap.
  return Number.isFinite(delay) ? Math.max(backoff, delay) : backoff
}

export async function enqueueIndexNowUrls(db: ReadDatabase, urls: string[], now = Date.now()) {
  for (let offset = 0; offset < urls.length; offset += 100) {
    await db.prepare(`INSERT INTO indexnow_queue(url, requested_at, available_at)
      SELECT value, ?, ? FROM json_each(?) WHERE 1
      ON CONFLICT(url) DO UPDATE SET version=indexnow_queue.version+1, pending=1,
        requested_at=excluded.requested_at,
        available_at=CASE WHEN indexnow_queue.pending=1 THEN indexnow_queue.available_at
          ELSE max(excluded.available_at, coalesce(indexnow_queue.last_submitted_at,0)+?) END`)
      .bind(now, now, JSON.stringify(urls.slice(offset, offset + 100)), INDEXNOW_MIN_INTERVAL_MS).all()
  }
}

export async function getIndexNowQueueStatus(db: ReadDatabase) {
  const state = (await db.prepare('SELECT * FROM indexnow_delivery WHERE id=1').bind().all()).results[0]
  const queue = (await db.prepare('SELECT count(*) AS pending, min(available_at) AS earliest FROM indexnow_queue WHERE pending=1').bind().all()).results[0]
  return {
    pending: Number(queue.pending),
    nextAttemptAt: Number(queue.pending) ? new Date(Math.max(Number(queue.earliest), Number(state.next_attempt_at), Number(state.lease_until))).toISOString() : null,
    failures: Number(state.failures),
    lastStatus: state.last_status == null ? null : Number(state.last_status),
    lastSuccessAt: state.last_success_at == null ? null : new Date(Number(state.last_success_at)).toISOString(),
  }
}

/** All isolates share one D1 lease and cooldown. Reserve the next send before
 * the network call so crashes/ambiguous acknowledgements cannot cause a burst. */
export async function drainIndexNowQueue(
  db: ReadDatabase,
  send: (urls: string[]) => Promise<IndexNowDelivery>,
  now = Date.now(),
) {
  const owner = crypto.randomUUID()
  const lease = (await db.prepare(`UPDATE indexnow_delivery SET lease_owner=?, lease_until=?,
      next_attempt_at=?, last_attempt_at=? WHERE id=1 AND lease_until<=? AND next_attempt_at<=?
      AND EXISTS(SELECT 1 FROM indexnow_queue WHERE pending=1 AND available_at<=?) RETURNING failures`)
    .bind(owner, now + LEASE_MS, now + INDEXNOW_MIN_INTERVAL_MS, now, now, now, now).all()).results[0]
  if (!lease) return { attempted: false, success: true, status: null, submitted: [] as string[], ...(await getIndexNowQueueStatus(db)) }

  const rows = (await db.prepare(`SELECT url, version FROM indexnow_queue
    WHERE pending=1 AND available_at<=? ORDER BY available_at, url LIMIT ?`)
    .bind(now, INDEXNOW_BATCH_SIZE).all()).results
  const submitted = rows.map(row => String(row.url))
  let delivery: IndexNowDelivery
  try {
    delivery = await send(submitted)
  } catch {
    delivery = { success: false, status: null }
  }
  const failures = delivery.success ? 0 : Number(lease.failures) + 1
  const delay = delivery.success ? INDEXNOW_MIN_INTERVAL_MS : indexNowRetryDelay(failures, delivery.retryAfter, now)
  const changes = delivery.success ? rows.map(row => db.prepare(`UPDATE indexnow_queue
    SET pending=CASE WHEN version=? THEN 0 ELSE 1 END, last_submitted_at=?, available_at=max(available_at,?)
    WHERE url=? AND EXISTS(SELECT 1 FROM indexnow_delivery WHERE id=1 AND lease_owner=?)`)
    .bind(row.version, now, now + INDEXNOW_MIN_INTERVAL_MS, row.url, owner)) : []
  changes.push(db.prepare(`UPDATE indexnow_delivery SET next_attempt_at=?, lease_owner=NULL, lease_until=0,
    failures=?, last_status=?, last_success_at=CASE WHEN ?=1 THEN ? ELSE last_success_at END
    WHERE id=1 AND lease_owner=?`).bind(now + delay, failures, delivery.status, delivery.success ? 1 : 0, now, owner))
  await db.batch(changes)
  // Keep recent delivery history for deduplication; bound storage and cleanup work.
  await db.prepare(`DELETE FROM indexnow_queue WHERE url IN (SELECT url FROM indexnow_queue
    WHERE pending=0 AND last_submitted_at<? LIMIT 1000)`).bind(now - 30 * MAX_BACKOFF_MS).all()
  return { attempted: true, success: delivery.success, status: delivery.status, submitted, ...(await getIndexNowQueueStatus(db)) }
}
