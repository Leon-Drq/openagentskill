import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as core from '../lib/og/cache.ts'

let calls = [], uploadedAt = Date.now(), cancelled = false
const png = new Uint8Array(40); png.set([137,80,78,71,13,10,26,10])
const sdk = {
  get: async (key, options) => {
    calls.push(['get', key, options])
    return { statusCode: 200, blob: { uploadedAt: new Date(uploadedAt), contentType: 'image/png', size: png.length },
      stream: new ReadableStream({ start(c) { c.enqueue(png) }, pull(c) { c.close() }, cancel() { cancelled = true } }) }
  },
  put: async (...args) => { calls.push(['put', ...args]) },
}
// Exercise the real adapter against a stub SDK, with no credentials/network.
const compiled = ts.transpileModule(readFileSync('lib/og-storage.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const output = {}
new Function('exports', 'require', compiled)(output, name => {
  if (name === 'server-only') return {}
  if (name === '@vercel/blob') return sdk
  if (name === './og/cache') return core
  throw new Error(`Unexpected import ${name}`)
})
const { createOgStorage } = output
assert.equal(createOgStorage({}), undefined)
assert.equal(createOgStorage({ BLOB_STORE_ID: 'test', OG_STORAGE_ENABLED: '0' }), undefined)
assert.equal(createOgStorage({ BLOB_STORE_ID: 'test', VERCEL_ENV: 'preview' }), undefined)
const store = createOgStorage({ BLOB_STORE_ID: 'test', VERCEL_ENV: 'production' })
assert.ok(store, 'OIDC can be resolved from request context without a static token')
const signal = new AbortController().signal
uploadedAt -= core.OG_TTL_SECONDS * 1000
assert.equal(await store.get('og/v1/skill/test.png', signal), null)
assert.equal(cancelled, true, 'expired bodies are not downloaded')
assert.equal(calls.length, 1, 'no extra HEAD request')
assert.equal(calls[0][2].useCache, false, 'overwrites must read current origin metadata')
assert.equal(calls[0][2].abortSignal, signal)
uploadedAt = Date.now()
assert.deepEqual((await store.get('og/v1/skill/test.png', signal)).body, png)
await store.put('og/v1/skill/test.png', { body: png, contentType: 'image/png', generatedAt: Date.now() }, signal)
const upload = calls.find(c => c[0] === 'put')
assert.equal(upload[3].cacheControlMaxAge, 7200)
assert.equal(upload[3].addRandomSuffix, false)
assert.equal(upload[3].allowOverwrite, true)
assert.equal(upload[3].abortSignal, signal)
assert.equal(upload[3].access, 'public')
console.log('OG storage passed: optional configuration, preview isolation, OIDC, origin freshness, expired stream cancellation and stable-key uploads.')
