import assert from 'node:assert/strict'
import { parse } from 'parse5'
import { SKILL_GROWTH_PROFILES, growthProfileSource } from '../lib/seo/skill-growth-profiles.ts'

const base = new URL(process.argv[2] || 'https://www.openagentskill.com')
const descendants = node => [node, ...(node.childNodes || []).flatMap(descendants)]
const attrs = node => Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]))
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('')
const pages = [
  ...SKILL_GROWTH_PROFILES.map(profile => ({ path: `/skills/${profile.slug}`, profile })),
  { path: '/best/presentation-generation', contains: 'Check one slide before generating the whole deck' },
  { path: '/best/codex-presentation-decks', contains: 'Diagnose the first blocked step' },
  { path: '/rankings/best-design-creative-skills', contains: 'Repository stars describe popularity' },
]
const results = []
for (const page of pages) {
  const response = await fetch(new URL(page.path, base), { signal: AbortSignal.timeout(45000) })
  assert.equal(response.status, 200, `${page.path}: HTTP ${response.status}`)
  const nodes = descendants(parse(await response.text()))
  const canonical = nodes.find(n => n.tagName === 'link' && attrs(n).rel === 'canonical')
  assert.equal(attrs(canonical).href, `https://www.openagentskill.com${page.path}`)
  assert.equal(nodes.filter(n => n.tagName === 'h1').length, 1, page.path)
  if (page.profile) {
    const overview = nodes.find(n => 'data-growth-overview' in attrs(n))
    assert.ok(overview, `${page.path}: source-matched overview is visible`)
    assert.ok(text(overview).includes(page.profile.summary))
    assert.ok(nodes.some(n => n.tagName === 'a' && attrs(n).href === growthProfileSource(page.profile)))
    const graphs = nodes.filter(n => n.tagName === 'script' && attrs(n).type === 'application/ld+json').map(n => JSON.parse(text(n)))
    assert.ok(graphs.some(g => g['@graph']?.some(n => n.citation === growthProfileSource(page.profile))))
  } else assert.ok(nodes.some(n => (n.tagName === 'p' || n.tagName === 'h2') && text(n).includes(page.contains)), `${page.path}: guidance is visible in page content`)
  const robots = nodes.find(n => n.tagName === 'meta' && attrs(n).name === 'robots')
  results.push({ path: page.path, status: response.status, robots: robots && attrs(robots).content })
}
console.log(JSON.stringify({ origin: base.origin, checked: results.length, results }, null, 2))
