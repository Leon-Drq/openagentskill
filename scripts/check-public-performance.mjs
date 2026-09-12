import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'

// Bounded, read-only release check. Decoded byte totals are not Core Web Vitals
// or measured wire transfer sizes. Run against a production build, not next dev.
const origin = new URL(process.argv[2] || 'https://www.openagentskill.com').origin
for (const path of ['/', '/skills', '/showcase', '/showcase?page=2', '/skills/obra-using-superpowers']) {
  const start = performance.now()
  const response = await fetch(origin + path, { signal: AbortSignal.timeout(30_000) })
  const ttfb = performance.now() - start
  const html = await response.text()
  assert.equal(response.status, 200, path)
  const scripts = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]).filter(src => src.startsWith('/_next/')))]
  let jsBytes = 0, gzipEstimate = 0
  for (const src of scripts) {
    const script = await fetch(new URL(src, origin), { signal: AbortSignal.timeout(20_000) })
    assert.equal(script.status, 200, src)
    const data = Buffer.from(await script.arrayBuffer())
    jsBytes += data.length
    gzipEstimate += gzipSync(data).length
    assert.ok(!data.includes(Buffer.from('Visible paper fibers, subtle ink bleed')), 'Full Gallery prompt catalogue leaked into client JS')
  }
  console.log(JSON.stringify({ path, status: response.status, ttfbMs: Math.round(ttfb), htmlBytes: Buffer.byteLength(html), scriptCount: scripts.length, jsBytes, gzipEstimate }))
}
const missing = await fetch(origin + '/skills/does-not-exist-release-check-20260912')
const body = await missing.text()
assert.ok([200, 404].includes(missing.status))
assert.match(body, /<meta name="robots" content="noindex/)
assert.doesNotMatch(body, /<meta name="robots" content="index/)
console.log(`Missing skill: HTTP ${missing.status}, noindex without a conflicting index directive. Streaming 200 remains supported by Next.js.`)
