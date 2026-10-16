import assert from 'node:assert/strict'
import { createOgCache, ogCacheKey, ogError, OG_TTL_SECONDS, OG_MAX_BYTES, readOgBytes } from '../lib/og/cache.ts'

// Small fixture with a PNG signature; production integration also renders real 1200×630 PNGs.
const png = new Uint8Array(40)
png.set([137,80,78,71,13,10,26,10])
let now = 100_000, renders = 0, reads = 0, writes = 0
const objects = new Map()
const events = []
const storage = {
  async get(key) { reads++; return objects.get(key) || null },
  async put(key, image) { writes++; objects.set(key, image) },
}
const render = async () => {
  renders++
  await new Promise(resolve => setTimeout(resolve, 2))
  const body = png.slice(); body[30] = renders
  return new Response(body, { headers: { 'Content-Type': 'image/png' } })
}
const makeCache = extra => createOgCache({ storage, now: () => now, onEvent: e => events.push(e), ...extra })
let cache = makeCache()
const key = await ogCacheKey('skill', ['one'])
assert.match(key, /^og\/v1\/skill\/[a-f0-9]{64}\.png$/)
assert.equal(key, await ogCacheKey('skill', ['one']))
assert.notEqual(key, await ogCacheKey('creator', ['one']))
assert.notEqual(await ogCacheKey('preview', ['name','one']), await ogCacheKey('preview', ['different','one']))
const simultaneous = await Promise.all(Array.from({length: 30}, () => cache(key, render)))
assert.equal(renders, 1); assert.equal(reads, 1); assert.equal(writes, 1)
for (const response of simultaneous) {
  assert.equal(response.status, 200)
  assert.equal((await response.arrayBuffer()).byteLength, png.length, 'each response body is independently readable')
}
assert.equal((await cache(key, render)).headers.get('x-og-cache'), 'memory')
assert.equal(reads, 1, 'warm hits make no billed storage reads')
now += 1000
cache = makeCache() // cold instance, same durable store
const coldHit = await cache(key, render)
assert.equal(coldHit.headers.get('x-og-cache'), 'storage'); assert.equal(renders, 1)
assert.match(coldHit.headers.get('cache-control'), /s-maxage=7199,/)
now += (OG_TTL_SECONDS - 1) * 1000
assert.equal((await cache(key, render)).headers.get('x-og-cache'), 'render')
assert.equal(renders, 2); assert.equal(objects.size, 1, 'expiry overwrites a stable key, no time-bucket objects')
assert.equal(writes, 2)

// Free-form previews never create durable objects. Unknown/error results can recover immediately.
await cache('preview', render, false)
assert.equal(objects.has('preview'), false)
for (const status of [404, 503]) {
  let attempts = 0
  const failing = () => { attempts++; return ogError(status) }
  const responses = await Promise.all([cache(`error-${status}`, failing), cache(`error-${status}`, failing)])
  for (const response of responses) {
    assert.equal(response.status, status); assert.match(response.headers.get('cache-control'), /no-store/)
    await response.text()
  }
  assert.equal(attempts, 1)
  assert.equal((await cache(`error-${status}`, render)).status, 200)
}
assert.equal((await cache('throws', () => { throw new Error('backend unavailable') })).status, 503)
assert.equal((await cache('throws', render)).status, 200)
assert.equal((await cache('html', () => new Response('<html>error</html>'))).status, 503)
assert.equal(objects.has('html'), false)
const broken = new ReadableStream({ start(controller) { controller.error(new Error('render stream failed')) } })
assert.equal((await cache('broken-stream', () => new Response(broken, { headers: { 'Content-Type': 'image/png' } }))).status, 503)
assert.equal(objects.has('broken-stream'), false)

// Corrupt, stale and future-dated storage cannot become a hit.
for (const [name, override] of [
  ['bad-body', { body: new Uint8Array(40) }],
  ['bad-type', { contentType: 'text/html' }],
  ['future', { generatedAt: now + 60_000 }],
  ['expired', { generatedAt: now - OG_TTL_SECONDS * 1000 }],
]) {
  objects.set(name, { body: png, contentType: 'image/png', generatedAt: now, ...override })
  assert.equal((await cache(name, render)).headers.get('x-og-cache'), 'render')
}

let failures = 0
const unavailable = makeCache({ storage: { get: async () => { failures++; throw new Error('private SDK message') }, put: async () => assert.fail('circuit must skip writes') } })
assert.equal((await unavailable('outage-a', render)).status, 200)
assert.equal((await unavailable('outage-b', render)).status, 200)
assert.equal(failures, 1, 'storage outage is circuit-broken, not retried for every key')
now += 60_000
await unavailable('outage-c', render)
assert.equal(failures, 2)
let abortSignal
const slow = makeCache({ storageTimeoutMs: 10, storage: {
  get: (_key, signal) => { abortSignal = signal; return new Promise(() => {}) },
  put: async () => assert.fail('timeout opens storage circuit'),
} })
assert.equal((await slow('slow', render)).status, 200)
assert.equal(abortSignal.aborted, true)
const writeFailure = makeCache({ storage: { get: async () => null, put: async () => { throw new Error('write failed') } } })
assert.equal((await writeFailure('write-failure', render)).status, 200)
assert.equal((await writeFailure('write-failure', render)).headers.get('x-og-cache'), 'memory')

// Both entry count and byte budget are bounded. Pending renders are not evicted.
for (const budget of [{maxEntries: 1}, {maxBytes: png.length}]) {
  const bounded = createOgCache({ now: () => now, ...budget })
  await bounded('a', render); await bounded('b', render)
  assert.equal((await bounded('b', render)).headers.get('x-og-cache'), 'memory')
  assert.equal((await bounded('a', render)).headers.get('x-og-cache'), 'render')
}
let release
const busy = createOgCache({ maxPending: 1 })
const blocked = busy('busy', () => new Promise(resolve => { release = () => resolve(new Response(png, { headers: {'Content-Type':'image/png'} })) }))
const samePending = busy('busy', render)
assert.equal((await busy('other', render)).status, 503)
release()
assert.equal((await blocked).status, 200); assert.equal((await samePending).status, 200)
const oversized = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(OG_MAX_BYTES + 1)); controller.close() } })
await assert.rejects(() => readOgBytes(oversized), /exceeds/)
assert.ok(events.some(e => e.event === 'storage-error'))
console.log('OG cache passed: single render/write for 30 concurrent calls, cold storage hit, true 2h expiry, no error caching, timeouts, recovery, PNG validation and bounded memory.')
