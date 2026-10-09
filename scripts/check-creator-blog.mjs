import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from 'parse5'

// Read-only release check. This does not install Skills or contact publishing APIs.
const origin = new URL(process.argv[2] || 'https://www.openagentskill.com').origin
const canonicalOrigin = 'https://www.openagentskill.com'
const slug = 'ai-skills-for-content-creators'
const locales = ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']
const pathFor = locale => `${locale === 'en' ? '' : '/' + locale}/blog/${slug}`
const nodes = node => [node, ...(node.childNodes || []).flatMap(nodes)]
const attr = node => Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]))
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('')
const get = path => fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(45000), headers: { 'User-Agent': 'OpenAgentSkill-Editorial-Release-Check/1.0' } })

for (const locale of locales) {
  const copy = JSON.parse(readFileSync(`lib/blog/creator-workflows.${locale}.json`, 'utf8'))
  const path = pathFor(locale)
  const response = await get(path)
  assert.equal(response.status, 200, path)
  assert.doesNotMatch(response.headers.get('x-robots-tag') || '', /noindex/i, path)
  const tree = nodes(parse(await response.text()))
  const links = tree.filter(n => n.tagName === 'link').map(attr)
  assert.deepEqual(links.filter(l => l.rel === 'canonical').map(l => l.href), [canonicalOrigin + path])
  for (const code of [...locales, 'x-default']) {
    const matches = links.filter(l => l.rel === 'alternate' && l.hreflang === code)
    assert.equal(matches.length, 1, `${locale}: exactly one ${code} alternate`)
    assert.equal(matches[0].href, canonicalOrigin + pathFor(code === 'x-default' ? 'en' : code))
  }
  const meta = tree.filter(n => n.tagName === 'meta').map(attr)
  assert.equal(meta.find(m => m.name === 'description')?.content, copy.summary)
  assert.ok(!meta.some(m => m.name === 'robots' && /noindex/i.test(m.content)))
  assert.deepEqual(tree.filter(n => n.tagName === 'h1').map(text), [copy.title])
  const article = tree.find(n => n.tagName === 'article')
  assert.equal(attr(article).lang, locale === 'zh' ? 'zh-CN' : locale)
  assert.ok(!nodes(article).some(n => n.tagName === 'nav' && attr(n)['aria-label'] === copy.languageLabel), `${locale}: language selection belongs in the site header`)
  for (const [id, tool] of Object.entries(copy.tools)) {
    assert.ok(tree.some(n => attr(n).id === `tool-${id}`))
    assert.ok(text(article).includes(tool.use), `${locale}: rendered use for ${id}`)
    assert.ok(text(article).includes(tool.check), `${locale}: rendered caveat for ${id}`)
  }
  const schema = tree.filter(n => n.tagName === 'script' && attr(n).type === 'application/ld+json').map(n => JSON.parse(text(n))).find(n => n['@type'] === 'BlogPosting')
  assert.equal(schema?.headline, copy.title)
  assert.equal(schema.url, canonicalOrigin + path)
  assert.equal(schema.inLanguage, attr(article).lang)
  if (locale !== 'en') {
    const redirect = await get(`${pathFor('en')}?lang=${locale}&utm_source=qa`)
    assert.equal(redirect.status, 308)
    assert.equal(new URL(redirect.headers.get('location'), origin).pathname, path)
    assert.equal(new URL(redirect.headers.get('location'), origin).search, '?utm_source=qa')
  }
  console.log(`PASS ${path}: full translated body, canonical, 9 alternates, indexability and schema`)
}
for (const path of ['/zh/blog/no-such-editorial-post', '/pt/blog/' + slug, '/en/blog/' + slug]) {
  assert.equal((await get(path)).status, 404, `${path}: genuine missing route`)
}
const sitemapResponse = await get('/sitemaps/core.xml')
assert.equal(sitemapResponse.status, 200)
const sitemap = await sitemapResponse.text()
const blogResponse = await get('/blog')
assert.equal(blogResponse.status, 200)
const hub = nodes(parse(await blogResponse.text()))
for (const locale of locales) {
  assert.ok(sitemap.includes(`<loc>${canonicalOrigin}${pathFor(locale)}</loc>`))
}
assert.ok(hub.some(n => n.tagName === 'a' && attr(n).href === pathFor('en')), 'Default article is linked from blog hub; translations remain in hreflang and sitemap')
assert.ok(!hub.some(n => n.tagName === 'nav' && attr(n)['aria-label'] === 'Read the creator guide in your language'), 'No duplicate language toolbar on blog hub')
console.log(`PASS ${origin}: 8 article routes, 7 redirects, 3 missing routes, blog discovery and sitemap`)
