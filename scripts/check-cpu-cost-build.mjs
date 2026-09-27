// Read-only smoke test against `pnpm build && pnpm start --port 3217`.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const base = new URL(process.env.CPU_CHECK_URL || 'http://localhost:3217')
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'Use a local production build')
const manifest = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8'))
for (const path of ['/skills', '/zh/skills', '/es/skills', '/ja/docs']) {
  assert.equal(manifest.routes[path]?.initialRevalidateSeconds, 300, `${path} must have a full-page ISR entry`)
}
for (const path of ['/skills/[slug]', '/internal-render/skill/[locale]/[slug]']) {
  assert.ok(manifest.dynamicRoutes[path], `${path} must support on-demand static generation`)
}

async function get(path, headers) {
  const start = performance.now()
  const response = await fetch(new URL(path, base), { redirect: 'manual', headers, signal: AbortSignal.timeout(30000) })
  const body = await response.text()
  return { response, body, ms: Math.round(performance.now() - start) }
}

for (const path of ['/skills', '/es/skills', '/skills/last30days-skill', '/skills/last30days-skill?lang=zh']) {
  await get(path)
  const { response, body, ms } = await get(path)
  assert.equal(response.status, 200, path)
  assert.equal(response.headers.get('x-nextjs-cache'), 'HIT', path)
  assert.match(response.headers.get('cache-control'), /s-maxage=300/, path)
  assert.match(body, /<h1\b/, `${path}: cached HTML must contain the visible page, not just a loading shell`)
  if (path === '/skills' || path === '/es/skills') {
    assert.match(body, /data-directory-modes/, path)
    assert.match(body, /<article\b[^>]*data-directory-skill/, `${path}: cached directory must include actual skill cards`)
  }
  assert.doesNotMatch(body, /href="\/internal-render\//, 'Internal renderer URLs must not leak into navigation')
  console.log(`${path}: full HTML cache HIT, ${ms}ms`)
}

for (const path of ['/skills?q=postgres&sort=stars', '/es/skills?category=research&page=2']) {
  const { response, body } = await get(path)
  assert.equal(response.status, 200, path)
  assert.match(response.headers.get('cache-control'), /private.*no-store/, 'Filtered responses must not pollute the default cache')
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, follow')
  assert.match(body, /data-directory-modes/)
  assert.doesNotMatch(body, /href="\/internal-render\//)
  assert.doesNotMatch(body, /href="\/skills\?[^"\s]*lang=en/, 'Directory navigation must not add redundant locale queries')
  if (path.includes('q=postgres')) assert.match(body, /<input\b[^>]*value="postgres"/)
  if (path.startsWith('/es')) assert.match(body, /rel="canonical" href="https:\/\/www.openagentskill.com\/es\/skills"/)
}

const lang = await get('/skills?lang=zh&sort=stars')
assert.equal(lang.response.status, 308)
assert.equal(lang.response.headers.get('location'), '/zh/skills?sort=stars')
const alias = await get('/skills/mvanhorn-last30days-skill?lang=zh')
assert.equal(alias.response.status, 308)
assert.equal(alias.response.headers.get('location'), '/skills/last30days-skill?lang=zh')

const tracked = await get('/skills?utm_source=cost-check')
assert.equal(tracked.response.headers.get('x-nextjs-cache'), 'HIT', 'Tracking must not force a render')
assert.equal(tracked.response.headers.get('x-robots-tag'), 'noindex, follow')
// Next 16 validates the transport hash. With no router-state headers its
// canonical transport key is empty (arbitrary hashes receive a 307).
const rsc = await get('/skills?_rsc', { RSC: '1' })
assert.match(rsc.response.headers.get('content-type'), /text\/x-component/, 'RSC and HTML must stay distinct')
assert.doesNotMatch(rsc.body, /^<!DOCTYPE html>/)
assert.equal(rsc.response.headers.get('x-robots-tag'), null, 'Transport params are not SEO variants')
const internal = await get('/internal-render/skills/en?sort=stars')
assert.equal(internal.response.headers.get('x-robots-tag'), 'noindex, follow')
console.log('Production smoke: full-page cache, filtered SSR, locale/alias redirects, tracking and RSC isolation passed.')
