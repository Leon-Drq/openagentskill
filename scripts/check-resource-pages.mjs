import assert from 'node:assert/strict'
import { parse } from 'parse5'

const base = process.env.RESOURCE_CHECK_BASE_URL || 'https://www.openagentskill.com'
const site = 'https://www.openagentskill.com'
const routes = ['/blog', '/guides', '/reports/weekly', '/reports/monthly', '/reports/state-of-agent-skills-2026', '/docs', '/agent', '/api-docs', '/cli']
const locales = ['zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']
for (const locale of locales) for (const page of ['docs', 'api-docs']) routes.push(`/${locale}/${page}`)
const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value
const text = (node) => node.value || (node.childNodes || []).map(text).join('')
function nodes(node, output = []) { output.push(node); for (const child of node.childNodes || []) nodes(child, output); return output }
let legacyArticleFound = false
for (let index = 0; index < routes.length; index++) {
  const path = routes[index]
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(60000), headers: { 'User-Agent': 'Googlebot' } })
  assert.equal(response.status, 200, `${path} status`)
  const all = nodes(parse(await response.text()))
  const find = (tag, key, value) => all.find((node) => node.tagName === tag && attr(node, key) === value)
  const h1s = all.filter((node) => node.tagName === 'h1')
  assert.equal(h1s.length, 1, `${path} needs exactly one h1`)
  assert.ok(text(h1s[0]).trim().length > 3)
  assert.equal(attr(find('link', 'rel', 'canonical'), 'href'), `${site}${path}`, `${path} canonical`)
  assert.equal(attr(find('meta', 'property', 'og:url'), 'content'), `${site}${path}`, `${path} social URL`)
  assert.ok(attr(find('meta', 'name', 'description'), 'content')?.length > 30)
  assert.ok(attr(find('meta', 'name', 'twitter:title'), 'content')?.length > 3)
  assert.ok(!/noindex/.test(attr(find('meta', 'name', 'robots'), 'content') || ''))
  const schemas = all.filter((node) => node.tagName === 'script' && attr(node, 'type') === 'application/ld+json').flatMap((node) => JSON.parse(text(node)))
  assert.equal(schemas.filter((schema) => schema['@type'] === 'BreadcrumbList').length, 1, `${path} breadcrumb schema`)
  for (const anchor of all.filter((node) => node.tagName === 'a' && attr(node, 'href')?.startsWith('#'))) {
    const target = decodeURIComponent(attr(anchor, 'href').slice(1))
    if (target) assert.ok(all.some((node) => attr(node, 'id') === target), `${path} broken fragment #${target}`)
  }
  if (/\/(docs|api-docs)$/.test(path)) assert.equal(all.filter((node) => node.tagName === 'link' && attr(node, 'rel') === 'alternate' && attr(node, 'hreflang')).length, 9, `${path} language alternates`)
  if (path === '/guides') {
    const first = all.find((node) => node.tagName === 'a' && /^\/guides\/[^/?]+$/.test(attr(node, 'href') || ''))
    assert.ok(first, 'Guides must link to guide content')
    routes.push(attr(first, 'href'))
  }
  if (path === '/blog') {
    const links = all.filter((node) => node.tagName === 'a').map((node) => attr(node, 'href') || '')
    const useCase = links.find((href) => /^\/blog\/use-cases\/[^/?]+$/.test(href))
    if (useCase) routes.push(useCase)
    const legacy = links.find((href) => /^\/blog\/[^/?]+$/.test(href) && !href.endsWith('/ai-skills-for-content-creators'))
    if (legacy) { routes.push(legacy); legacyArticleFound = true }
  }
  console.log(`PASS ${path}`)
}
assert.ok(legacyArticleFound, 'No historical article found in Blog hub; inspect its live template separately')
console.log(`Checked ${routes.length} pages: HTTP, SSR headings, metadata, JSON-LD, alternates and chapter links.`)
