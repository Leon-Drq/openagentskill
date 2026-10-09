// Read-only HTTP verification against a running production build/deployment.
import assert from 'node:assert/strict'
import { parse } from 'parse5'
const origin = process.argv[2] || 'http://localhost:3100'
const nodes = (root, tag) => [ ...(root.tagName === tag ? [root] : []), ...(root.childNodes || []).flatMap(child => nodes(child, tag)) ]
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value
const results = []
async function get(path, headers) {
  const response = await fetch(origin + path, { headers, redirect: 'manual', signal: AbortSignal.timeout(30000) })
  const text = await response.text()
  results.push({ path, status: response.status, xRobots: response.headers.get('x-robots-tag') })
  return { response, text, dom: parse(text) }
}
for (const path of ['/', '/skills', '/zh/skills', '/skills/anthropics-skills', '/skills/raphire-win11debloat?ref=github&utm_source=github']) {
  const { response, dom } = await get(path)
  assert.equal(response.status, 200, path)
  assert.notEqual(response.headers.get('x-robots-tag'), 'noindex, follow', path)
  assert.ok(nodes(dom, 'link').some(n => attr(n, 'rel') === 'canonical' && !attr(n, 'href').includes('?')), path)
  assert.ok(nodes(dom, 'meta').some(n => attr(n, 'name') === 'robots' && attr(n, 'content').startsWith('index,')), path)
  const facets = nodes(dom, 'a').filter(n => /^\/(?:(?:zh|ja|ko|es|de|fr|id)\/)?skills\?/.test(attr(n, 'href') || ''))
  assert.ok(facets.every(n => attr(n, 'rel')?.split(' ').includes('nofollow')), `Followed faceted link on ${path}`)
}
for (const path of ['/skills/seo-crawl-check-missing-20261009', '/skills?page=999999', '/skills?page=-1', '/skills?q=no-such-skill-20261009&page=9999']) {
  assert.equal((await get(path)).response.status, 404, path)
}
assert.equal((await get('/skills/seo-crawl-check-missing-20261009', { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' })).response.status, 404)
for (const path of ['/api/badge/anthropics-skills?metric=trust', '/api/agent/skills/google-fully-homomorphic-encryption', '/api/skills/raiyanyahya-prompt/install?format=text']) {
  const { response } = await get(path)
  assert.equal(response.status, 200, path)
  assert.match(response.headers.get('x-robots-tag'), /noindex/, path)
}
const { text: robots } = await get('/robots.txt')
assert.match(robots, /User-agent: Googlebot/)
assert.match(robots, /Disallow: \/skills\?/)
assert.match(robots, /User-agent: OAI-SearchBot\s+Allow: \//)
const { text: sitemap } = await get('/sitemap.xml')
const children = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => new URL(m[1]).pathname)
assert.ok(children.length > 5)
const urls = new Set()
let skills = 0
for (const path of children) {
  const { response, text } = await get(path)
  assert.equal(response.status, 200, path)
  for (const match of text.matchAll(/<loc>(.*?)<\/loc>/g)) {
    assert.ok(!match[1].includes('?'), `Variant in sitemap: ${match[1]}`)
    assert.ok(!urls.has(match[1]), `Duplicate sitemap URL: ${match[1]}`)
    urls.add(match[1])
    if (new URL(match[1]).pathname.startsWith('/skills/')) skills++
  }
}
console.log(JSON.stringify({ origin, requests: results.length, sitemapUrls: urls.size, skillUrls: skills, results }, null, 2))
