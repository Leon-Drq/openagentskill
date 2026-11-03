import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { sqliteD1 } from './fixtures/sqlite-d1.mjs'
import { enqueueIndexNowUrls, drainIndexNowQueue, getIndexNowQueueStatus, indexNowRetryDelay, INDEXNOW_MIN_INTERVAL_MS as HOUR } from '../lib/indexnow-queue.ts'
import { normalizeIndexNowUrl, buildIndexNowUrlsForSkill, eligibleIndexNowUrls } from '../lib/indexnow.ts'

const now = Date.UTC(2026, 10, 3)
const url = 'https://www.openagentskill.com/skills/example'
const fixture = () => {
  const result = sqliteD1()
  result.sqlite.exec(readFileSync(new URL('../cloudflare/migrations/data/0010_indexnow.sql', import.meta.url), 'utf8'))
  return result
}
const accepted = async () => ({ success: true, status: 200 })

test('canonical URLs reject foreign origins, credentials, API/audit/sitemap and remove tracking variants', () => {
  assert.equal(normalizeIndexNowUrl('http://openagentskill.com/skills/example?utm_source=x#install'), url)
  for (const value of ['https://evil.test/', 'https://secret@www.openagentskill.com/', 'ftp://www.openagentskill.com/', 'https://www.openagentskill.com:8443/', '/api/agent/skills/a', '/skills/a/audit', '/sitemap.xml']) assert.equal(normalizeIndexNowUrl(value), null)
  assert.ok(buildIndexNowUrlsForSkill('a').every(value => !/api|audit|sitemap/.test(value)))
})

test('only existing SEO-eligible skill pages are enqueued; publication/review states are not changed', async () => {
  const { sqlite, database } = fixture()
  sqlite.exec(`CREATE TABLE skills(slug TEXT PRIMARY KEY,ai_review_approved,quality_score,github_stars,publisher_verified,
    github_repo,source_path,source_commit_sha,source_content_hash,source_sync_status,license,listing_status);
    INSERT INTO skills(slug,ai_review_approved,quality_score,github_stars,publisher_verified) VALUES ('approved',1,70,100,0),('static',0,70,100,0);`)
  const urls = ['approved','static','missing'].map(slug => `https://www.openagentskill.com/skills/${slug}`)
  assert.deepEqual(await eligibleIndexNowUrls(database, [...urls, 'https://www.openagentskill.com/skills']), [urls[0], 'https://www.openagentskill.com/skills'])
  assert.equal(sqlite.prepare("SELECT ai_review_approved FROM skills WHERE slug='static'").get().ai_review_approved, 0)
  sqlite.close()
})

test('concurrent enqueue and drain coalesce duplicate URLs and allow exactly one sender', async () => {
  const { sqlite, database } = fixture()
  await Promise.all(Array.from({ length: 10 }, () => enqueueIndexNowUrls(database, [url, url], now)))
  let calls = 0
  const send = async urls => { calls++; assert.deepEqual(urls, [url]); return accepted() }
  const results = await Promise.all(Array.from({ length: 10 }, () => drainIndexNowQueue(database, send, now)))
  assert.equal(calls, 1)
  assert.equal(results.filter(result => result.attempted).length, 1)
  assert.equal((await getIndexNowQueueStatus(database)).pending, 0)
  sqlite.close()
})

test('429 survives new requests and honors Retry-After; recovery drains original URLs', async () => {
  const { sqlite, database } = fixture()
  await enqueueIndexNowUrls(database, [url], now)
  const first = await drainIndexNowQueue(database, async () => ({ success: false, status: 429, retryAfter: '7200' }), now)
  assert.equal(first.pending, 1)
  assert.equal(first.nextAttemptAt, new Date(now + 2 * HOUR).toISOString())
  await enqueueIndexNowUrls(database, [url, 'https://www.openagentskill.com/skills'], now + HOUR)
  await drainIndexNowQueue(database, () => assert.fail('cooldown must cover all requests'), now + HOUR)
  const recovered = await drainIndexNowQueue(database, accepted, now + 2 * HOUR)
  assert.equal(recovered.submitted.length, 2)
  assert.equal(recovered.pending, 0)
  assert.equal(recovered.failures, 0)
  sqlite.close()
})

test('timeout and 5xx retain queue with bounded exponential backoff and reset after 202', async () => {
  const { sqlite, database } = fixture()
  await enqueueIndexNowUrls(database, [url], now)
  const timeout = await drainIndexNowQueue(database, async () => { throw new Error('timeout') }, now)
  assert.equal(timeout.pending, 1)
  assert.equal(timeout.nextAttemptAt, new Date(now + HOUR).toISOString())
  const failed = await drainIndexNowQueue(database, async () => ({ success: false, status: 503 }), now + HOUR)
  assert.equal(failed.nextAttemptAt, new Date(now + 3 * HOUR).toISOString())
  const recovered = await drainIndexNowQueue(database, async () => ({ success: true, status: 202 }), now + 3 * HOUR)
  assert.equal(recovered.pending, 0)
  assert.equal(recovered.lastStatus, 202)
  assert.equal(recovered.failures, 0)
  sqlite.close()
})

test('a content change during delivery remains queued after the older version is acknowledged', async () => {
  const { sqlite, database } = fixture()
  await enqueueIndexNowUrls(database, [url], now)
  const first = await drainIndexNowQueue(database, async () => {
    await enqueueIndexNowUrls(database, [url], now + 1)
    return accepted()
  }, now)
  assert.equal(first.pending, 1)
  await drainIndexNowQueue(database, () => assert.fail('must wait'), now + HOUR - 1)
  assert.equal((await drainIndexNowQueue(database, accepted, now + HOUR)).pending, 0)
  sqlite.close()
})

test('batches are capped, pending leftovers are retained and an empty queue sends nothing', async () => {
  const { sqlite, database } = fixture()
  await drainIndexNowQueue(database, () => assert.fail('empty queue'), now)
  await enqueueIndexNowUrls(database, Array.from({ length: 205 }, (_, i) => `${url}-${i}`), now)
  const first = await drainIndexNowQueue(database, accepted, now)
  assert.equal(first.submitted.length, 100)
  assert.equal(first.pending, 105)
  assert.equal((await drainIndexNowQueue(database, accepted, now + HOUR)).pending, 5)
  assert.equal((await drainIndexNowQueue(database, accepted, now + 2 * HOUR)).pending, 0)
  sqlite.close()
})

test('a crashed sender cannot bypass the reserved cooldown after its lease expires', async () => {
  const { sqlite, database } = fixture()
  await enqueueIndexNowUrls(database, [url], now)
  sqlite.prepare('UPDATE indexnow_delivery SET lease_owner=?,lease_until=?,next_attempt_at=?').run('crashed', now + 120_000, now + HOUR)
  await drainIndexNowQueue(database, () => assert.fail('must honor reservation'), now + 180_000)
  assert.equal((await drainIndexNowQueue(database, accepted, now + HOUR)).pending, 0)
  sqlite.close()
})

test('Retry-After dates and malformed headers never cause immediate retries', () => {
  assert.equal(indexNowRetryDelay(1, new Date(now + 48 * HOUR).toUTCString(), now), 48 * HOUR)
  for (const header of [undefined, '', 'nonsense', '-1', '0']) assert.equal(indexNowRetryDelay(1, header, now), HOUR)
  assert.equal(indexNowRetryDelay(20, null, now), 24 * HOUR)
})
