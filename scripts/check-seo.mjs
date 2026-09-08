import assert from 'node:assert/strict'

// Read-only, bounded release smoke test. No private keys or search submissions.
const origin = new URL(process.argv[2] || 'https://www.openagentskill.com').origin
const canonicalOrigin = 'https://www.openagentskill.com'
const entities = { amp: '&', quot: '"', '#x27': "'" }
const decode = s => s.replace(/&(amp|quot|#x27);/g, (_, name) => entities[name])
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)=["']([^"']*)["']/g)].map(m => [m[1].toLowerCase(), decode(m[2])]))
}
async function get(path) {
  const response = await fetch(origin + path, { signal: AbortSignal.timeout(45000), headers: { 'User-Agent': 'OpenAgentSkill-SEO-Release-Check/1.0' } })
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`)
  return { response, body: await response.text() }
}
const paths = [
  ['/', '/', true], ['/skills', '/skills', true], ['/showcase', '/showcase', true],
  ['/showcase?page=2', '/showcase?page=2', true], ['/showcase?category=video', '/showcase', false],
  ['/showcase/silicon-valley-explainer', '/showcase/silicon-valley-explainer', true],
  ['/showcase/silicon-valley-explainer?lang=ja', '/showcase/silicon-valley-explainer', false],
  ['/creators', '/creators', true],
  ['/guides/agent-skills-for-product-videos', '/guides/agent-skills-for-product-videos', true],
  ['/guides/best-agent-skills-for-rag', '/guides/best-agent-skills-for-rag', true],
  ['/zh/skills', '/zh/skills', true], ['/ja/skills', '/ja/skills', true],
]
for (const [path, expectedCanonical, indexable] of paths) {
  const { body, response } = await get(path)
  // Read target tags while skipping script/comment tokens. This is inspection,
  // not an HTML sanitizer; no transformed HTML is ever rendered or executed.
  const tags = [...body.matchAll(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>|<(link|meta|h1|title)\b[^>]*>/gi)]
    .filter(m => m[1]).map(m => ({ name: m[1].toLowerCase(), attributes: attributes(m[0]) }))
  const links = tags.filter(t => t.name === 'link').map(t => t.attributes)
  const metas = tags.filter(t => t.name === 'meta').map(t => t.attributes)
  assert.equal(links.filter(l => l.rel === 'canonical').length, 1, `${path}: one canonical`)
  assert.equal(new URL(links.find(l => l.rel === 'canonical')?.href).href, new URL(canonicalOrigin + expectedCanonical).href, `${path}: canonical`)
  assert.ok(metas.some(m => m.name === 'description' && m.content?.trim()), `${path}: description`)
  assert.ok(tags.some(t => t.name === 'title') && /<title>[^<]+<\/title>/i.test(body), `${path}: title`)
  assert.equal(tags.filter(t => t.name === 'h1').length, 1, `${path}: one H1`)
  const robots = metas.filter(m => ['robots', 'googlebot'].includes(m.name)).map(m => m.content).join(',') + (response.headers.get('x-robots-tag') || '')
  assert.equal(/noindex/i.test(robots), !indexable, `${path}: indexability`)
  for (const block of body.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script\b[^>]*>/gi)) JSON.parse(block[1])
  if (path === '/guides/agent-skills-for-product-videos') {
    assert.ok(body.includes('Sources and examples') && body.includes('2026-09-08'))
    assert.ok(body.includes('source-based planning guide'))
  }
  if (path === '/zh/skills' || path === '/ja/skills') {
    assert.ok(links.some(l => l.hreflang && l.href === canonicalOrigin + path), `${path}: self alternate`)
    assert.ok(links.some(l => l.hreflang === 'en' && l.href === canonicalOrigin + '/skills'), `${path}: English alternate`)
  }
  console.log(`PASS ${path}: status, canonical, robots, title, description, H1, JSON-LD`)
}
const { body: index } = await get('/sitemap.xml')
const locations = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => decode(m[1]))
assert.equal(new Set(locations).size, locations.length)
const shards = locations.filter(l => /\/skills-\d+\.xml$/.test(l))
assert.ok(shards.length > 0)
const checks = [...new Set(['/sitemaps/core.xml', '/sitemaps/guides.xml', new URL(shards[0]).pathname, new URL(shards.at(-1)).pathname])]
for (const path of checks) {
  const { body } = await get(path)
  const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => decode(m[1]))
  assert.ok(urls.length && new Set(urls).size === urls.length, `${path}: nonempty unique URLs`)
  assert.ok(urls.every(u => new URL(u).origin === canonicalOrigin))
  if (path.endsWith('/core.xml')) {
    const about = body.match(/<url>\s*<loc>https:\/\/www\.openagentskill\.com\/about<\/loc>[\s\S]*?<\/url>/)?.[0]
    assert.ok(about && !about.includes('<lastmod>'))
    assert.ok(body.includes('<lastmod>'), 'Preserve known Gallery dates')
  }
  console.log(`PASS ${path}: ${urls.length} unique URLs`)
}
console.log(`SEO smoke passed on ${origin}; ${shards.length} skill shards advertised. Search-engine indexing/rankings are not asserted.`)
