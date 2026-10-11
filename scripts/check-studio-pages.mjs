import assert from 'node:assert/strict'
import { parse } from 'parse5'
const base = process.env.STUDIO_CHECK_BASE_URL || 'https://www.openagentskill.com'
const site = 'https://www.openagentskill.com'
const locales = ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']
const paths = locales.flatMap(locale => ['/membership', '/studio/launch-card-studio'].map(path => `${locale === 'en' ? '' : '/' + locale}${path}`))
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value
function nodes(node) { return [node, ...(node.childNodes || []).flatMap(nodes)] }
for (const path of paths) {
  const response = await fetch(base + path)
  assert.equal(response.status, 200, path)
  const all = nodes(parse(await response.text()))
  assert.equal(all.filter(node => node.tagName === 'h1').length, 1, `${path} H1`)
  const canonical = all.find(node => node.tagName === 'link' && attr(node, 'rel') === 'canonical')
  assert.equal(attr(canonical, 'href'), site + path, `${path} canonical`)
  assert.equal(all.filter(node => node.tagName === 'link' && attr(node, 'hreflang')).length, 9, `${path} alternates`)
  assert.ok(all.some(node => node.tagName === 'button' && attr(node, 'disabled') !== undefined), `${path} closed checkout`)
  const meta = all.find(node => node.tagName === 'meta' && attr(node, 'name') === 'robots')
  assert.ok(!attr(meta || {}, 'content')?.includes('noindex'), `${path} indexability`)
  const language = path.split('/')[1]
  assert.equal(attr(all.find(node => node.tagName === 'main'), 'lang'), locales.includes(language) ? language : 'en')
  console.log(`PASS ${path}`)
}
for (const path of ['/membership', '/studio/launch-card-studio']) {
  const response = await fetch(`${base}${path}?lang=zh&source=nav`, { redirect: 'manual' })
  assert.equal(response.status, 308, `${path} legacy language redirect`)
  assert.equal(new URL(response.headers.get('location'), base).pathname, `/zh${path}`)
}
for (const format of ['wide', 'square', 'portrait']) {
  const response = await fetch(`${base}/studio/launch-card-studio/${format}.svg`)
  assert.equal(response.status, 200)
  assert.ok(response.headers.get('content-type').includes('image/svg+xml'))
  assert.match(await response.text(), /<svg/)
}
const sitemap = await fetch(base + '/sitemaps/core.xml').then(response => response.text())
for (const path of paths) assert.ok(sitemap.includes(`<loc>${site}${path}</loc>`), `Sitemap missing ${path}`)
console.log('Studio HTTP checks passed: 16 pages, canonical/alternates, disabled checkout, locale redirects, SVG downloads and sitemap.')
