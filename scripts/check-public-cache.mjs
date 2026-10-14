// Read-only smoke test for `next build && next start` or the production domain.
// No cache-busting query, authentication, mutation, or publication is performed.
import assert from 'node:assert/strict'

const origin = process.env.BASE_URL || 'http://localhost:3124'
const canonicalOrigin = 'https://www.openagentskill.com'
const detail = '/skills/design-taste-frontend'
async function read(path, options = {}) {
  const response = await fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(45_000), ...options })
  const html = await response.text()
  return { response, html }
}
function seo(html, path) {
  assert.ok(html.includes(`<link rel="canonical" href="${canonicalOrigin}${path}"`), `${path}: original canonical`)
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${path}: SSR heading`)
  assert.doesNotMatch(html, /href="(?:https?:\/\/[^/]+)?\/(?:render-query|cached-public)\//, 'internal routes must not leak into links')
}
function nonemptyDirectory(html) {
  // Read numeric text only. This is an assertion, not an HTML sanitizer, and
  // no fetched markup is reinserted into a page or written to a public file.
  const count = html.match(/data-directory-count[^>]*>([\s\S]*?)<\/p>/)?.[1] || ''
  const total = Number((count.match(/\d+/g) || []).join(''))
  assert.equal((html.match(/<article\b[^>]*\bdata-directory-skill(?:[\s=>])/g) || []).length, 16, 'default directory must include 16 server-rendered cards')
  assert.ok(total >= 16, 'default directory has candidates')
}
for (const path of ['/skills', ...['zh', 'ja', 'ko', 'es', 'de', 'fr', 'id'].map(locale => `/${locale}/skills`)]) {
  const { response, html } = await read(path)
  assert.equal(response.status, 200, path)
  seo(html, path)
  nonemptyDirectory(html)
  assert.doesNotMatch(response.headers.get('cache-control') || '', /private|no-store/, `${path}: default directory is cacheable`)
  let hit = false
  for (let attempt = 0; attempt < 8; attempt++) {
    const next = await read(path)
    const status = next.response.headers.get('x-vercel-cache') || next.response.headers.get('x-nextjs-cache')
    if (status === 'HIT') { hit = true; break }
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  assert.ok(hit, `${path}: default directory must actually HIT`)
  console.log(`${path}: SSR directory and cached HTML passed`)
}
for (const path of [detail, detail + '/audit', detail + '/evals']) {
  let hit = false
  for (let attempt = 0; attempt < 8; attempt++) {
    const { response, html } = await read(path)
    assert.equal(response.status, 200, path)
    seo(html, path)
    if (path !== detail) assert.ok(html.includes('noindex'), 'report indexing policy stays unchanged')
    const cache = response.headers.get('x-vercel-cache') || response.headers.get('x-nextjs-cache')
    console.log(JSON.stringify({ path, attempt: attempt + 1, cache, control: response.headers.get('cache-control') }))
    if (cache === 'HIT') { hit = true; break }
    // A stale entry regenerates asynchronously; do not issue a burst of traffic.
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  assert.ok(hit, `${path}: expected an actual route/CDN HIT, not just a revalidate export`)
}
for (const [path, canonical] of [
  ['/skills?q=design', '/skills'], ['/skills?view=all', '/skills'],
  ['/zh/skills?category=design-creative&sort=stars', '/zh/skills'],
]) {
  const { response, html } = await read(path)
  assert.equal(response.status, 200, path)
  assert.match(response.headers.get('cache-control') || '', /private|no-store/, `${path}: query stays uncached`)
  seo(html, canonical)
  assert.ok(html.includes('noindex'), `${path}: preserve query noindex`)
}
for (const path of [detail + '?lang=zh', detail + '/audit?lang=zh', detail + '/evals?lang=zh', '/contact', '/sponsor', '/contact?lang=en', '/sponsor?utm_source=verification', '/contact?lang=zh']) {
  let hit = false
  for (let attempt = 0; attempt < 8; attempt++) {
    const { response, html } = await read(path)
    assert.equal(response.status, 200, path)
    seo(html, path.split('?')[0])
    assert.doesNotMatch(response.headers.get('cache-control') || '', /private|no-store/, `${path}: finite public variant is cacheable`)
    const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1] || ''
    if (path.includes('?')) assert.match(robots, /noindex/, `${path}: query indexing policy`)
    else assert.doesNotMatch(robots, /noindex/, `${path}: canonical indexing policy`)
    const cache = response.headers.get('x-vercel-cache') || response.headers.get('x-nextjs-cache')
    if (cache === 'HIT') { hit = true; break }
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  assert.ok(hit, `${path}: expected an actual finite variant HIT`)
  console.log(`${path}: cached variant, SSR/canonical and indexing policy passed`)
}
const localized = await read('/skills?lang=zh&q=design')
assert.equal(localized.response.status, 308)
const location = new URL(localized.response.headers.get('location'), origin)
assert.equal(location.pathname, '/zh/skills')
assert.equal(location.searchParams.get('q'), 'design')
assert.equal(location.searchParams.has('lang'), false)
for (const path of ['/cached-public/en/skills', '/cached-public/zh/skills/example', '/cached-public/en/profile', '/render-query/skills', '/render-query/zh/skills', '/render-query' + detail + '/audit', '/render-query' + detail + '/evals']) {
  const { response } = await read(path)
  assert.equal(response.status, 404, path)
  assert.match(response.headers.get('x-robots-tag') || '', /noindex/)
}
console.log('Public cache smoke passed: detail HITs, SSR/canonicals, stable directory routes, query isolation, locale redirects and internal-route 404s.')
