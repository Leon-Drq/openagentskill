import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OG_TTL_SECONDS, OG_MAX_BYTES } from '../lib/og/cache.ts'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { createR2OgStorage } = await import('../lib/og/r2-storage.ts')

const png = new Uint8Array(40)
png.set([137, 80, 78, 71, 13, 10, 26, 10])
const signal = new AbortController().signal

test('R2 stores the original generation time and returns the same PNG', async () => {
  const generatedAt = Date.now() - 1234
  let stored, reads = 0
  const storage = createR2OgStorage(async () => ({
    async put(key, body, metadata) { stored = { key, body, ...metadata } },
    async get(key) {
      reads++
      assert.equal(key, stored.key)
      return { ...stored, size: stored.body.byteLength, body: new Blob([stored.body]).stream() }
    },
  }))
  await storage.put('og/card.png', { body: png, generatedAt, contentType: 'image/png' }, signal)
  const image = await storage.get('og/card.png', signal)
  assert.equal(reads, 1, 'one R2 read, no separate HEAD')
  assert.equal(image.generatedAt, generatedAt, 'cache reads must not extend freshness')
  assert.deepEqual(image.body, png)
})

test('expired, oversized, corrupt and missing R2 cards are cache misses', async () => {
  for (const change of [
    { customMetadata: { generatedAt: String(Date.now() - OG_TTL_SECONDS * 1000) } },
    { size: OG_MAX_BYTES + 1 },
    { customMetadata: {} },
    { httpMetadata: { contentType: 'text/html' } },
  ]) {
    let cancelled = false
    const storage = createR2OgStorage(async () => ({ async get() {
      return { size: png.byteLength, httpMetadata: { contentType: 'image/png' }, customMetadata: { generatedAt: String(Date.now()) }, ...change,
        body: new ReadableStream({ cancel() { cancelled = true } }) }
    } }))
    assert.equal(await storage.get('og/card.png', signal), null)
    assert.equal(cancelled, true)
  }
  const absent = createR2OgStorage(async () => ({ async get() { return null } }))
  assert.equal(await absent.get('missing', signal), null)
  const corrupt = createR2OgStorage(async () => ({ async get() {
    return { size: 40, httpMetadata: { contentType: 'image/png' }, customMetadata: { generatedAt: String(Date.now()) }, body: new Blob([new Uint8Array(40)]).stream() }
  } }))
  assert.equal(await corrupt.get('bad', signal), null)
})

test('aborted operations do not access the bucket and invalid writes are rejected', async () => {
  let calls = 0
  const storage = createR2OgStorage(async () => { calls++; throw new Error('unexpected bucket access') })
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(storage.get('x', controller.signal), { name: 'AbortError' })
  await assert.rejects(storage.put('x', { body: png, generatedAt: Date.now(), contentType: 'image/png' }, controller.signal), { name: 'AbortError' })
  await assert.rejects(storage.put('x', { body: png, generatedAt: Date.now(), contentType: 'text/html' }, signal), /Invalid OG/)
  assert.equal(calls, 0)
})
