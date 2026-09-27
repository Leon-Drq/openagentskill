import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { AsyncLocalStorage } from 'node:async_hooks'
import { createContentMemo } from '../lib/cache/content-memo.ts'
import { publicPageRewrite, publicPageQueryVariant } from '../lib/routing/public-page-cache.ts'

const rewrite = (url) => {
  const parsed = new URL(url, 'https://www.openagentskill.com')
  return publicPageRewrite(parsed.pathname, parsed.searchParams)
}
const require = createRequire(import.meta.url)
// Next's server bootstrap installs this global before loading test utilities.
globalThis.AsyncLocalStorage ??= AsyncLocalStorage
// This installed Next version still exposes the pre-rename test helper.
const { unstable_doesMiddlewareMatch: unstable_doesProxyMatch } = require('next/experimental/testing/server')
const proxySource = readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8')
const config = new Function(`return (${proxySource.split('export const config = ')[1]})`)()
const directorySource = readFileSync(new URL('../components/skills-directory-page.tsx', import.meta.url), 'utf8')
assert.match(directorySource, /if \(cachePage && degraded\) throw new Error/, 'ISR failures must preserve the last healthy directory')
for (const path of ['../app/skills/page.tsx', '../app/[locale]/[page]/page.tsx']) {
  assert.match(readFileSync(new URL(path, import.meta.url), 'utf8'), /cachePage\s*\/>/, 'Canonical directories require successful data')
}
for (const url of ['/privacy', '/', '/es', '/partners/logo.svg', '/favicon-48x48.png', '/_next/static/app.js', '/api/github/repo', '/robots.txt']) {
  assert.equal(unstable_doesProxyMatch({ config, nextConfig: {}, url }), false, `No unnecessary middleware: ${url}`)
}
for (const url of ['/skills', '/skills/example?lang=zh', '/es/skills?sort=stars', '/?lang=zh', '/skill-packs/design?lang=ja', '/profile', '/api/claims/me', '/api/points/balance', '/rankings/unknown', '/showcase/unknown', '/creators/github/unknown']) {
  assert.equal(unstable_doesProxyMatch({ config, nextConfig: {}, url }), true, `Required routing/auth boundary: ${url}`)
}
for (const url of ['/skills', '/skills?utm_source=x', '/skills?_rsc=abc', '/es/skills', '/es/docs', '/skills/example', '/skills/example?lang=invalid', '/skills/new?lang=zh', '/skills/external?lang=zh']) {
  assert.equal(rewrite(url), null, `Canonical/cacheable or reserved URL: ${url}`)
}
for (const key of ['q', 'sort', 'category', 'useCase', 'platform', 'quality', 'trust', 'safety', 'track', 'minStars', 'page', 'view']) {
  assert.equal(rewrite(`/skills?${key}=value`), '/internal-render/skills/en', key)
  assert.equal(rewrite(`/es/skills?${key}=value&lang=zh`), '/internal-render/skills/es', 'path language wins')
}
assert.equal(rewrite('/zh/resolve?task=write&agent=codex'), '/internal-render/core/zh/resolve')
assert.equal(rewrite('/ja/agent-skills-registry?q=test'), '/internal-render/core/ja/agent-skills-registry')
for (const lang of ['zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) {
  assert.equal(rewrite(`/skills/example?lang=${lang}&utm_source=x`), `/internal-render/skill/${lang}/example`)
}
assert.equal(rewrite('/skills?q=&q=ignored'), null, 'first query value agrees with renderer')
assert.equal(publicPageQueryVariant('/skills', new URLSearchParams('_rsc=123')), false)
assert.equal(publicPageQueryVariant('/skills/example', new URLSearchParams('utm_source=x')), true)
assert.equal(publicPageQueryVariant('/zh/skills', new URLSearchParams('q=test')), true)
assert.equal(publicPageQueryVariant('/profile', new URLSearchParams('q=test')), false)

let calls = 0
let clock = 0
const compute = createContentMemo(input => { calls++; return { allowed: input.review === 'approved', views: input.views } }, { maxEntries: 2, ttlMs: 10, now: () => clock })
assert.deepEqual(compute({ review: 'approved', views: 1 }), { allowed: true, views: 1 })
compute({ review: 'approved', views: 1 })
assert.equal(calls, 1, 'separate objects with identical evidence reuse calculations')
assert.equal(compute({ review: 'rejected', views: 1 }).allowed, false, 'changed safety evidence invalidates immediately')
compute({ review: 'approved', views: 1 }) // promote to most recently used
compute({ review: 'approved', views: 2 })
compute({ review: 'approved', views: 1 })
assert.equal(calls, 3, 'bounded memo uses LRU eviction')
compute({ review: 'rejected', views: 1 })
assert.equal(calls, 4, 'evicted input is recomputed')
clock = 11
compute({ review: 'rejected', views: 1 })
assert.equal(calls, 5, 'time-dependent profiles expire')
let attempts = 0
const retry = createContentMemo(() => { if (++attempts === 1) throw Error('transient'); return 'ok' })
assert.throws(() => retry({}), /transient/)
assert.equal(retry({}), 'ok')
let largeCalls = 0
const bounded = createContentMemo(() => ++largeCalls, { maxInputChars: 4 })
bounded('oversized'); bounded('oversized')
assert.equal(largeCalls, 2, 'oversized inputs do not consume memo capacity')
console.log('CPU cost regression: cache routing, locales, query variants, evidence invalidation, expiry and bounded memo passed.')
