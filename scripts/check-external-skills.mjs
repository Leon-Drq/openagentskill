import assert from 'node:assert/strict'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { EXTERNAL_SKILLS } = await import('../lib/skills/external-catalog.ts')

const base = process.argv[2] || 'http://localhost:3114'
const slug = 'redskill-curtain-branch-swallow'
const path = `/skills/${slug}`
const get = (suffix, options = {}) => fetch(base + suffix, { ...options, signal: AbortSignal.timeout(20000) })
for (const lang of ['', '?lang=zh']) {
  const response = await get(path + lang)
  const html = await response.text()
  assert.equal(response.status, 200)
  assert.ok(html.includes('流白Livo'))
  assert.ok(html.includes('CC BY-NC 4.0'))
  const links = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(match => match[1])
  assert.ok(links.some(href => href === 'https://xhslink.cn/o/2WbYk12a1h4'), 'exact author source link')
  const title = html.match(/<title>(.*?)<\/title>/)?.[1]
  assert.equal((title?.match(/OpenAgentSkill/g) || []).length, 1, 'single title suffix')
  assert.ok(html.includes(`rel="canonical" href="https://www.openagentskill.com${path}"`))
  assert.ok(html.includes(`name="robots" content="${lang ? 'noindex' : 'index'}, follow"`))
  const json = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(match => JSON.parse(match[1]))
  assert.ok(json.some(value => value['@graph']?.some(item => item.about?.author?.name === '流白Livo')))
  const video = json.flatMap(value => value['@graph'] || []).find(item => item['@type'] === 'VideoObject')
  assert.equal(video?.duration, 'PT21S')
  assert.equal(video?.contentUrl, 'https://www.openagentskill.com/media/external/p5-animation/runtime-v1.mp4')
  assert.match(html, /<video[^>]+preload="none"/)
  assert.match(html, /<track[^>]+srcLang="zh"/i)
}
assert.equal((await get('/skills/skillry-unknown-entry')).status, 404)
const api = `/api/external-skills/${slug}`
const data = await (await get(api)).json()
assert.equal(data.auto_install_allowed, false)
assert.equal(data.human_review_required, true)
assert.equal(data.install_command, null)
assert.equal(data.github_stars, undefined)
assert.equal(data.runtime_verified, false)
assert.equal(data.runtime_demo.security_certification, false)
const media = await get('/media/external/p5-animation/runtime-v1.mp4', { headers: { Range: 'bytes=0-1023' } })
assert.equal(media.status, 206)
assert.match(media.headers.get('content-type'), /video\/mp4/)
assert.equal((await media.arrayBuffer()).byteLength, 1024)
for (const file of ['poster-v1.webp', 'captions-en.vtt', 'captions-zh.vtt']) assert.equal((await get('/media/external/p5-animation/' + file)).status, 200)
assert.equal((await get(api, { method: 'POST' })).status, 405)
assert.equal((await get('/api/external-skills/unknown-entry')).status, 404)
const search = await (await get('/skills?q=skill-curtain-branch-swallow')).text()
assert.ok(search.includes(path))
const sitemap = await (await get('/sitemaps/core.xml')).text()
assert.ok(sitemap.includes(`https://www.openagentskill.com${path}</loc>`))
const catalog = EXTERNAL_SKILLS.filter(entry => entry.provider === 'skillry' && entry.active)
assert.ok(catalog.length >= 42 && catalog.every(entry => entry.listingEvidence.downloadCount > 10))
// Cover old URLs, independent/editorial and assembled details, Free/paid and all formats.
const sampleSlugs = ['skillry-grokbot-avatar', 'skillry-field-notes-deck', 'skillry-claude-style-illustration', 'skillry-cadence-marketing-landing', 'skillry-dot-avatar-maker', 'skillry-hyperframes-velocity-sting', 'skillry-project-knowledge-graph', 'skillry-cue-style-launch-video', 'skillry-mailchimp-style-og', 'skillry-soft-gradient-deck']
const skillry = sampleSlugs.map(slug => catalog.find(entry => entry.slug === slug))
assert.ok(skillry.every(Boolean))
for (const entry of skillry) {
  const detailPath = `/skills/${entry.slug}`
  const metadata = await (await get(`/api/external-skills/${entry.slug}`)).json()
  assert.equal(metadata.bundle_sha256, null)
  assert.equal(metadata.source_url, entry.sourceUrl)
  assert.equal(metadata.publisher.name, 'Skillry')
  assert.equal(metadata.listing_evidence.priceUsdCents, entry.listingEvidence.priceUsdCents)
  assert.equal(metadata.listing_evidence.downloadCount, entry.listingEvidence.downloadCount)
  assert.equal(metadata.install_command, null)
  for (const language of ['', '?lang=zh']) {
    const response = await get(detailPath + language)
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.ok(html.includes(`rel="canonical" href="https://www.openagentskill.com${detailPath}"`))
    assert.ok(html.includes(`name="robots" content="${language || !entry.seoIndexable ? 'noindex' : 'index'}, follow"`))
    assert.ok(html.includes(`href="${entry.sourceUrl}?via=openagentskill" target="_blank" rel="sponsored noopener noreferrer"`))
    assert.doesNotMatch(html, /referral commission|返佣|佣金/i, 'No user-facing commission explanation')
    const graphs = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].flatMap(match => JSON.parse(match[1])['@graph'] || [])
    const work = graphs.find(item => item.about)?.about
    assert.equal(work.publisher['@type'], 'Organization')
    assert.equal(work.publisher.name, 'Skillry')
    assert.equal(work.author, undefined)
    assert.equal(work.url, entry.sourceUrl)
    assert.equal(work.version, entry.version || undefined)
    assert.ok(!graphs.some(item => item['@type'] === 'VideoObject'))
    assert.ok(html.includes('id="showcase"'))
    for (const src of entry.previewImages) assert.ok(html.includes(src.replaceAll('&', '&amp;')), src)
  }
  assert.equal(sitemap.includes(`https://www.openagentskill.com${detailPath}</loc>`), entry.seoIndexable)
}
const selected = await (await get('/skills?q=Skillry&examples=true')).text()
assert.equal(new Set([...selected.matchAll(/data-skill-actions="(skillry-[^"]+)"/g)].map(match => match[1])).size,16)
const paidList = await (await get('/skills?examples=true&pricing=paid')).text()
assert.ok(paidList.includes('data-skill-price="paid"') && !paidList.includes('data-skill-price="free"'))
const freeList = await (await get('/skills?examples=true&pricing=free')).text()
assert.ok(freeList.includes('data-skill-price="free"') && !freeList.includes('data-skill-price="paid"'))
assert.ok(!selected.includes(path), 'Search excludes unrelated RedSkill listing')
console.log(`External listing smoke passed at ${base}: EN/ZH SSR, metadata, JSON-LD, HTTP 404, search, sitemap, read-only API.`)

for (const suffix of ['', '/skillry-grokbot-avatar?lang=zh']) {
  const response = await get('/skills/external' + suffix, {redirect: 'manual'})
  assert.equal(response.status, 308)
  assert.equal(new URL(response.headers.get('location'), base).pathname, '/skills' + suffix.split('?')[0])
  if (suffix) assert.equal(new URL(response.headers.get('location'),base).searchParams.get('lang'), 'zh')
}
assert.ok(!sitemap.includes('/skills/external'))
const engagement = await get('/api/skills/engagement?slugs=' + skillry.map(e=>e.slug).join(','))
if (new URL(base).hostname !== 'localhost' || engagement.status !== 503) {
  assert.equal(engagement.status,200)
  const body = await engagement.json()
  assert.equal(body.signedIn,false)
  for (const entry of skillry) assert.ok(body.stats[entry.slug] && body.stats[entry.slug].saved === false)
}
