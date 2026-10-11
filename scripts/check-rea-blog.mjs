import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from 'parse5'

// Read-only rendered-page checks. No Skill installation or external mutation.
const origin = new URL(process.argv[2] || 'https://www.openagentskill.com').origin
const canonical = 'https://www.openagentskill.com'
const slug = 'rea-reverse-engineering-skill-guide'
const locales = ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']
const pathFor = l => (l === 'en' ? '' : '/' + l) + '/blog/' + slug
const nodes = n => [n, ...(n.childNodes || []).flatMap(nodes)]
const attr = n => Object.fromEntries((n?.attrs || []).map(a => [a.name, a.value]))
const text = n => n.nodeName === '#text' ? n.value : (n.childNodes || []).map(text).join('')
const get = path => fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(45000), headers: { 'User-Agent': 'OpenAgentSkill-Editorial-Release-Check/1.0' } })
for (const locale of locales) {
  const copy = JSON.parse(readFileSync('lib/blog/rea-guide.' + locale + '.json', 'utf8'))
  const path = pathFor(locale), response = await get(path)
  assert.equal(response.status, 200, path)
  assert.doesNotMatch(response.headers.get('x-robots-tag') || '', /noindex/i)
  const tree = nodes(parse(await response.text())), links = tree.filter(n => n.tagName === 'link').map(attr)
  assert.deepEqual(links.filter(l => l.rel === 'canonical').map(l => l.href), [canonical + path])
  for (const lang of [...locales, 'x-default']) {
    const matches = links.filter(l => l.rel === 'alternate' && l.hreflang === lang)
    assert.equal(matches.length, 1)
    assert.equal(matches[0].href, canonical + pathFor(lang === 'x-default' ? 'en' : lang))
  }
  assert.deepEqual(tree.filter(n => n.tagName === 'h1').map(text), [copy.title])
  const meta = tree.filter(n => n.tagName === 'meta').map(attr)
  assert.equal(meta.find(m => m.name === 'description')?.content, copy.summary)
  assert.equal(meta.find(m => m.property === 'og:type')?.content, 'article')
  assert.ok(!meta.some(m => m.name === 'robots' && /noindex/i.test(m.content)))
  const article = tree.find(n => n.tagName === 'article')
  assert.equal(attr(article).lang, locale === 'zh' ? 'zh-CN' : locale)
  const articleNodes = nodes(article), rendered = text(article)
  for (const paragraph of copy.intro) assert.ok(rendered.includes(paragraph))
  for (const section of copy.sections) {
    const element = articleNodes.find(n => attr(n).id === section.id)
    assert.ok(element, locale + ': section ' + section.id)
    assert.ok(text(element).includes(section.title))
    assert.ok(text(element).length > 200, 'Render full text, not headings alone')
  }
  assert.doesNotMatch(rendered, /\{\{\w+\}\}/)
  assert.doesNotMatch(rendered, /\*\*/, 'No unrendered Markdown emphasis in translated prose')
  assert.ok(rendered.includes('npx rea-agents@6.4.0 setup --client codex --dry-run --json'))
  assert.ok(rendered.includes('23d50ea3bec186b4459d36c04854a92276accdf1'))
  assert.deepEqual(articleNodes.filter(n => n.tagName === 'nav').map(n => attr(n)['aria-label']), [copy.contentsLabel], 'Language selection stays in shared header')
  const cta = articleNodes.find(n => n.tagName === 'a' && text(n).includes(copy.cta))
  assert.equal(attr(cta).href, '/skills/morluto-rea-reverse-engineer-anything' + (locale === 'en' ? '' : '?lang=' + locale))
  const schemas = tree.filter(n => n.tagName === 'script' && attr(n).type === 'application/ld+json').flatMap(n => JSON.parse(text(n)))
  const schema = schemas.find(s => s['@type'] === 'BlogPosting')
  assert.equal(schema?.headline, copy.title)
  assert.equal(schema?.url, canonical + path)
  assert.equal(schema?.inLanguage, attr(article).lang)
  assert.equal(schema?.citation.length, 7)
  assert.ok(schemas.some(s => s['@type'] === 'BreadcrumbList' && s.itemListElement[1].item === canonical + path))
  if (locale !== 'en') {
    const r = await get(pathFor('en') + '?lang=' + locale + '&utm_source=qa')
    assert.equal(r.status, 308)
    const destination = new URL(r.headers.get('location'), origin)
    assert.equal(destination.pathname, path)
    assert.equal(destination.search, '?utm_source=qa')
  }
  console.log('PASS ' + path + ': translated SSR body, metadata, 9 alternates, schema and Skill link')
}
for (const path of ['/en/blog/' + slug, '/pt/blog/' + slug, '/zh/blog/no-such-editorial-post']) assert.equal((await get(path)).status, 404, path)
const sitemapResponse = await get('/sitemaps/core.xml')
assert.equal(sitemapResponse.status, 200)
const sitemap = await sitemapResponse.text()
for (const locale of locales) assert.ok(sitemap.includes('<loc>' + canonical + pathFor(locale) + '</loc>'))
const hubResponse = await get('/blog')
assert.equal(hubResponse.status, 200)
const hub = nodes(parse(await hubResponse.text()))
assert.ok(hub.some(n => n.tagName === 'a' && attr(n).href === pathFor('en')))
console.log('PASS ' + origin + ': 8 routes, 7 redirects, genuine 404s, sitemap and blog discovery')
