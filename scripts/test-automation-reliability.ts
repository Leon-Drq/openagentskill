import assert from 'node:assert/strict'
// @ts-expect-error Standalone Node type stripping requires extensions.
import { fetchX } from '../lib/x/request.ts'
// @ts-expect-error Standalone Node type stripping requires extensions.
import { createCoalescedCache } from '../lib/cache/coalesced.ts'
// @ts-expect-error Standalone Node type stripping requires extensions.
import { analysisRetryDelayMs, DeferredAnalysisError } from '../lib/ai/deferred-analysis.ts'

async function main() {
const keepAlive = setInterval(() => {}, 100)
const originalFetch = globalThis.fetch
try {
  let requests = 0
  globalThis.fetch = async (_input, init) => {
    requests++
    return new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true }))
  }
  await assert.rejects(fetchX('https://api.x.com/2/tweets', { method: 'POST' }, 15))
  assert.equal(requests, 1, 'a timed-out mutation is never replayed')
  globalThis.fetch = async () => new Response('{"data":{"id":"123"}}', { status: 201 })
  assert.equal((await (await fetchX('https://api.x.com/2/tweets')).json()).data.id, '123')
  // Slow body: the request deadline must remain active after headers arrive.
  globalThis.fetch = async (_input, init) => new Response(new ReadableStream({
    start(controller) { init?.signal?.addEventListener('abort', () => controller.error(init.signal?.reason), { once: true }) },
  }))
  await assert.rejects(fetchX('https://api.x.com/2/tweets', {}, 15))
} finally { globalThis.fetch = originalFetch; clearInterval(keepAlive) }

let reads = 0
const cache = createCoalescedCache<{ degraded: boolean; value: number }>({ ttlMs: 20, maxEntries: 2, cacheWhen: v => !v.degraded })
const read = async () => { reads++; return { degraded: false, value: reads } }
const [a,b] = await Promise.all([cache('same', read), cache('same', read)])
assert.equal(reads, 1, 'concurrent identical searches share a read')
assert.deepEqual(a,b)
await cache('same', read)
assert.equal(reads, 1, 'healthy results are cached')
await cache('other-limit', read)
assert.equal(reads, 2, 'different limits have separate cache keys')
await new Promise(resolve => setTimeout(resolve, 25))
await cache('same', read)
assert.equal(reads, 3, 'expired values are refreshed')
let failures = 0
const fail = async () => { failures++; throw new Error('database unavailable') }
await assert.rejects(cache('failure', fail))
await assert.rejects(cache('failure', fail))
assert.equal(failures, 2, 'failures are not cached')
let partial = 0
const degraded = async () => { partial++; return { degraded: true, value: partial } }
await cache('partial', degraded); await cache('partial', degraded)
assert.equal(partial, 2, 'partial results are not cached as healthy')
assert.equal(analysisRetryDelayMs('budget_exhausted',0), 86_400_000)
assert.equal(analysisRetryDelayMs('database_unavailable',0), 3_600_000)
assert.ok(analysisRetryDelayMs('database_unavailable',1) > analysisRetryDelayMs('database_unavailable',0))
assert.equal(new DeferredAnalysisError('queued', 'database_unavailable').code, 'database_unavailable')
console.log('Automation reliability: bounded X requests, no replay, coalesced search and classified retry tests passed.')

}
main().catch(error => { console.error(error); process.exitCode = 1 })
