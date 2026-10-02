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
  assert.doesNotMatch(html, /href="(?:https?:\/\/[^/]+)?\/render-query\//, 'internal routes must not leak into links')
}
function nonemptyDirectory(html) {
  // Read numeric text only. This is an assertion, not an HTML sanitizer, and
  // no fetched markup is reinserted into a page or written to a public file.
  const count = html.match(/data-directory-count[^>]*>([\s\S]*?)<\/p>/)?.[1] || ''
  const numbers = (count.match(/\d+/g) || []).map(Number)
  assert.deepEqual(numbers.slice(0, 2), [1, 16], 'default directory must include real visible cards, not an empty outage fallback')
  assert.ok(numbers[2] > 0, 'default directory has candidates')
}
for (const path of ['/skills', '/zh/skills']) {
  const { response, html } = await read(path)
  assert.equal(response.status, 200, path)
  seo(html, path)
  nonemptyDirectory(html)
  assert.match(response.headers.get('cache-control') || '', /private|no-store/, `${path}: request-time HTML uses shared data caches`)
  console.log(`${path}: SSR directory and uncached HTML passed`)
}
for (const path of [detail]) {
  let hit = false
  for (let attempt = 0; attempt < 8; attempt++) {
    const { response, html } = await read(path)
    assert.equal(response.status, 200, path)
    seo(html, path)
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
  [detail + '?lang=zh', detail],
]) {
  const { response, html } = await read(path)
  assert.equal(response.status, 200, path)
  assert.match(response.headers.get('cache-control') || '', /private|no-store/, `${path}: query stays uncached`)
  seo(html, canonical)
  assert.ok(html.includes('noindex'), `${path}: preserve query noindex`)
}
const localized = await read('/skills?lang=zh&q=design')
assert.equal(localized.response.status, 308)
const location = new URL(localized.response.headers.get('location'), origin)
assert.equal(location.pathname, '/zh/skills')
assert.equal(location.searchParams.get('q'), 'design')
assert.equal(location.searchParams.has('lang'), false)
for (const path of ['/render-query/skills', '/render-query/zh/skills']) {
  const { response } = await read(path)
  assert.equal(response.status, 404, path)
  assert.match(response.headers.get('x-robots-tag') || '', /noindex/)
}
console.log('Public cache smoke passed: detail HITs, SSR/canonicals, stable directory routes, query isolation, locale redirects and internal-route 404s.')
