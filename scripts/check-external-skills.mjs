import assert from 'node:assert/strict'

const base = process.argv[2] || 'http://localhost:3114'
const slug = 'redskill-curtain-branch-swallow'
const path = `/skills/external/${slug}`
const get = (suffix, options = {}) => fetch(base + suffix, { ...options, signal: AbortSignal.timeout(20000) })
for (const lang of ['', '?lang=zh']) {
  const response = await get(path + lang)
  const html = await response.text()
  assert.equal(response.status, 200)
  assert.ok(html.includes('流白Livo'))
  assert.ok(html.includes('CC BY-NC 4.0'))
  assert.ok(html.includes('https://xhslink.cn/o/2WbYk12a1h4'))
  const title = html.match(/<title>(.*?)<\/title>/)?.[1]
  assert.equal((title?.match(/OpenAgentSkill/g) || []).length, 1, 'single title suffix')
  assert.ok(html.includes(`rel="canonical" href="https://www.openagentskill.com${path}"`))
  assert.ok(html.includes(`name="robots" content="${lang ? 'noindex' : 'index'}, follow"`))
  const json = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(match => JSON.parse(match[1]))
  assert.ok(json.some(value => value['@graph']?.some(item => item.about?.author?.name === '流白Livo')))
}
assert.equal((await get('/skills/external/unknown-entry')).status, 404)
const api = `/api/external-skills/${slug}`
const data = await (await get(api)).json()
assert.equal(data.auto_install_allowed, false)
assert.equal(data.human_review_required, true)
assert.equal(data.install_command, null)
assert.equal(data.github_stars, undefined)
assert.equal((await get(api, { method: 'POST' })).status, 405)
assert.equal((await get('/api/external-skills/unknown-entry')).status, 404)
const search = await (await get('/skills?q=skill-curtain-branch-swallow')).text()
assert.ok(search.includes(path))
const sitemap = await (await get('/sitemaps/core.xml')).text()
assert.ok(sitemap.includes(`https://www.openagentskill.com${path}</loc>`))
console.log(`External listing smoke passed at ${base}: EN/ZH SSR, metadata, JSON-LD, HTTP 404, search, sitemap, read-only API.`)
