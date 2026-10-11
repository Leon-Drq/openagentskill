import assert from 'node:assert/strict'
import { parse } from 'parse5'
const base = process.env.STUDIO_CHECK_BASE_URL || 'https://www.openagentskill.com'
const site = 'https://www.openagentskill.com'
const locales = ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']
const paths = locales.flatMap(locale => ['/membership', '/studio/launch-card-studio'].map(path => `${locale === 'en' ? '' : '/' + locale}${path}`))
const sampleUrls = new Set()
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value
function nodes(node) { return [node, ...(node.childNodes || []).flatMap(nodes)] }
for (const path of paths) {
  const response = await fetch(base + path)
  assert.equal(response.status, 200, path)
  const all = nodes(parse(await response.text()))
  for (const node of all.filter(node => node.tagName === 'img')) {
    const src = attr(node, 'src')
    if (src?.startsWith('/studio/launch-card-studio/')) sampleUrls.add(src)
  }
  assert.equal(all.filter(node => node.tagName === 'h1').length, 1, `${path} H1`)
  const canonical = all.find(node => node.tagName === 'link' && attr(node, 'rel') === 'canonical')
  assert.equal(attr(canonical, 'href'), site + path, `${path} canonical`)
  assert.equal(all.filter(node => node.tagName === 'link' && attr(node, 'hreflang')).length, 9, `${path} alternates`)
  assert.ok(all.some(node => node.tagName === 'button' && attr(node, 'disabled') !== undefined), `${path} closed checkout`)
  const meta = all.find(node => node.tagName === 'meta' && attr(node, 'name') === 'robots')
  assert.ok(!attr(meta || {}, 'content')?.includes('noindex'), `${path} indexability`)
  const language = path.split('/')[1]
  const locale = locales.includes(language) ? language : 'en'
  const pricingHref = `${locale === 'en' ? '' : '/' + locale}/membership`
  const pricingNav = all.find(node => node.tagName === 'a' && attr(node, 'data-nav-section') === 'pricing')
  assert.equal(attr(pricingNav, 'href'), pricingHref, `${path} localized Pricing navigation`)
  if (path.endsWith('/membership')) {
    assert.equal(attr(pricingNav, 'aria-current'), 'page', `${path} active Pricing navigation`)
    const main = all.find(node => node.tagName === 'main')
    assert.equal(nodes(main).filter(node => node.tagName === 'img').length, 0, `${path} image-free pricing`)
    assert.equal(nodes(main).filter(node => node.tagName === 'article').length, 3, `${path} three plans`)
  }
  assert.equal(attr(all.find(node => node.tagName === 'main'), 'lang'), locale)
  const standalonePrice = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(4.99)
  assert.ok(all.some(node => node.tagName === 'strong' && nodes(node).filter(child => child.nodeName === '#text').map(child => child.value).join('') === standalonePrice), `${path} standalone USD 4.99`)
  console.log(`PASS ${path}`)
}
for (const path of ['/membership', '/studio/launch-card-studio']) {
  const response = await fetch(`${base}${path}?lang=zh&source=nav`, { redirect: 'manual' })
  assert.equal(response.status, 308, `${path} legacy language redirect`)
  assert.equal(new URL(response.headers.get('location'), base).pathname, `/zh${path}`)
}
assert.equal(sampleUrls.size, 3, 'Three actual versioned SVG samples')
for (const src of sampleUrls) {
  const response = await fetch(base + src)
  assert.equal(response.status, 200)
  assert.ok(response.headers.get('content-type').includes('image/svg+xml'))
  assert.match(await response.text(), /<svg/)
}
const sitemap = await fetch(base + '/sitemaps/core.xml').then(response => response.text())
for (const path of paths) assert.ok(sitemap.includes(`<loc>${site}${path}</loc>`), `Sitemap missing ${path}`)
console.log('Studio HTTP checks passed: 16 pages, canonical/alternates, disabled checkout, locale redirects, SVG downloads and sitemap.')
