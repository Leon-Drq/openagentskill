import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createResilientTimeoutFetch } from '../lib/supabase/resilient-fetch.ts'

const originalFetch = globalThis.fetch
const originalNow = Date.now
let now = 1000, calls = 0
Date.now = () => now
const reset = () => { globalThis.__openagentskillSupabaseCircuits = undefined; calls = 0 }
const bulk = createResilientTimeoutFetch(100)
const url = 'https://example.test'
const fail = async () => { calls++; return new Response('unavailable', { status: 522 }) }
const good = async () => { calls++; return new Response('ok') }
const trip = async () => { for (let i = 0; i < 3; i++) assert.equal((await bulk(url)).status, 522) }
try {
  reset()
  globalThis.fetch = fail
  await trip()
  await assert.rejects(() => bulk(url), /circuit is temporarily open/)
  await assert.rejects(() => createResilientTimeoutFetch(100)(url), /circuit is temporarily open/)
  assert.equal(calls, 3, 'Warm invocations in the same workload share protection')
  globalThis.fetch = good
  for (const scope of ['public-catalog', 'skill-lookup', 'skill-search', 'skill-search-broad', 'skill-support', 'sitemap', 'telemetry', 'admin']) {
    assert.equal((await createResilientTimeoutFetch(100, scope)(url)).status, 200, 'Bulk read failures cannot disable critical work')
  }
  now += 15_001
  let finishProbe
  globalThis.fetch = async () => { calls++; return new Promise(resolve => { finishProbe = resolve }) }
  const probe = bulk(url)
  await assert.rejects(() => bulk(url), /probe is already running/)
  finishProbe(new Response('recovered'))
  await probe
  globalThis.fetch = good
  assert.equal((await bulk(url)).status, 200, 'Successful half-open probe closes circuit')

  reset()
  const broadSearch = createResilientTimeoutFetch(100, 'skill-search-broad')
  globalThis.fetch = fail
  for (let i = 0; i < 3; i++) await broadSearch(url)
  await assert.rejects(() => broadSearch(url), /circuit is temporarily open/)
  globalThis.fetch = good
  assert.equal((await createResilientTimeoutFetch(100, 'skill-search')(url)).status, 200, 'Broad search failures cannot disable exact matches')
  assert.equal((await createResilientTimeoutFetch(100, 'public-catalog')(url)).status, 200, 'Broad search failures cannot disable browsing')

  reset()
  let finishOld
  globalThis.fetch = async () => new Promise(resolve => { finishOld = resolve })
  const old = bulk(url)
  globalThis.fetch = fail
  await trip()
  finishOld(new Response('late healthy response'))
  await old
  await assert.rejects(() => bulk(url), /circuit is temporarily open/, 'Late response cannot bypass cooldown')
  now += 15_001
  assert.equal((await bulk(url)).status, 522)
  await assert.rejects(() => bulk(url), /circuit is temporarily open/, 'Failed recovery probe reopens circuit')
  now += 15_001
  globalThis.fetch = good
  assert.equal((await bulk(url)).status, 200)

  reset()
  globalThis.fetch = async (_input, init) => new Promise((_resolve, reject) => {
    calls++
    init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true })
  })
  for (let i = 0; i < 3; i++) {
    const controller = new AbortController()
    const cancelled = bulk(new Request(url, { signal: controller.signal }))
    controller.abort()
    await assert.rejects(() => cancelled)
  }
  globalThis.fetch = good
  assert.equal((await bulk(url)).status, 200, 'Caller cancellation is not an outage')
  const before = calls
  await assert.rejects(() => bulk(url, { signal: AbortSignal.abort() }))
  assert.equal(calls, before, 'Already cancelled work never reaches upstream')

  reset()
  globalThis.fetch = async (_input, init) => new Promise((_resolve, reject) => {
    calls++
    init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true })
  })
  const timed = createResilientTimeoutFetch(5)
  for (let i = 0; i < 3; i++) await assert.rejects(() => timed(url))
  await assert.rejects(() => timed(url), /circuit is temporarily open/)
  assert.equal(calls, 3, 'Our own deadlines still trip protection')

  reset()
  globalThis.fetch = async () => new Response('RLS denial', { status: 403 })
  const telemetry = createResilientTimeoutFetch(100, 'telemetry')
  for (let i = 0; i < 4; i++) assert.equal((await telemetry(url)).status, 403)
  globalThis.fetch = good
  assert.equal((await telemetry(url)).status, 200, 'Permission errors are not gateway failures')

  for (const [status, retryAfterValue, delay] of [
    [402, null, 60_000], [429, null, 15_000], [429, '120', 120_000],
    [429, () => new Date(now + 90_000).toUTCString(), 90_000],
    [402, '1', 60_000], [429, 'invalid', 15_000], [429, '999999', 300_000],
  ]) {
    reset()
    now = Math.ceil(now / 1000) * 1000 // HTTP-date precision is whole seconds.
    const retryAfter = typeof retryAfterValue === 'function' ? retryAfterValue() : retryAfterValue
    globalThis.fetch = async () => {
      calls++
      return new Response('quota or rate limit', { status, headers: retryAfter ? { 'retry-after': retryAfter } : {} })
    }
    const limited = createResilientTimeoutFetch(100, 'public-catalog')
    const response = await limited(url)
    assert.equal(response.status, status, 'Preserve upstream error for the caller')
    assert.equal(await response.text(), 'quota or rate limit')
    await assert.rejects(() => limited(url), /circuit is temporarily open/)
    assert.equal(calls, 1, 'Quota/rate limits pause immediately without more upstream requests')
    now += delay - 1
    await assert.rejects(() => limited(url), /circuit is temporarily open/)
    now++
    globalThis.fetch = good
    assert.equal((await limited(url)).status, 200, 'The service can recover after the bounded cooldown')
  }

  reset()
  let completeBeforeLimit
  globalThis.fetch = async () => new Promise(resolve => { completeBeforeLimit = resolve })
  const inFlight = bulk(url)
  globalThis.fetch = async () => new Response('quota', { status: 402 })
  assert.equal((await bulk(url)).status, 402)
  completeBeforeLimit(new Response('late success'))
  await inFlight
  await assert.rejects(() => bulk(url), /circuit is temporarily open/, 'Late success must not cancel quota cooldown')
  now += 60_000
  assert.equal((await bulk(url)).status, 402)
  await assert.rejects(() => bulk(url), /circuit is temporarily open/, 'An unresolved quota pauses the recovery probe again')

  const db = readFileSync(new URL('../lib/db/skills.ts', import.meta.url), 'utf8')
  assert.match(db, /requestTimeoutMs: 8000, circuitScope: 'public-catalog'/)
  assert.match(db, /requestTimeoutMs: SKILL_LOOKUP_TIMEOUT_MS, circuitScope: 'skill-lookup'/)
  assert.match(db, /requestTimeoutMs: SKILL_EXACT_SEARCH_TIMEOUT_MS, circuitScope: 'skill-search'/)
  console.log('Circuit isolation passed: workloads, deadlines, cancellation, concurrent recovery and stale responses.')
} finally {
  globalThis.fetch = originalFetch
  Date.now = originalNow
  reset()
}
