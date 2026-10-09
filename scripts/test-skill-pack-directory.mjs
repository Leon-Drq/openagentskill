import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as jsx from 'react/jsx-runtime'
import * as icons from 'lucide-react'
import { parse } from 'parse5'
import ts from 'typescript'

register('./test-owner-publication-loader.mjs', import.meta.url)
const packs = await import('../lib/skill-packs.ts')
const { SKILL_PACKS } = packs
let unavailable = false
let useFallback = true
const sample = { slug: 'addyosmani-agent-skills', name: 'Live frontend skill', description: 'Frontend React browser testing', github_stars: 100, quality_score: 80, tags: [], frameworks: [] }
const fallback = { ...sample, name: 'Saved frontend skill' }
const dependencies = {
  'react/jsx-runtime': jsx,
  '@/components/crawl-link': { default: ({ children, prefetch, ...props }) => { void prefetch; return createElement('a', props, children) } },
  'lucide-react': icons,
  '@/components/marketing-page': { MarketingPageShell: ({ children }) => createElement('main', null, children) },
  '@/lib/db/skills': {
    getAllSkills: async () => { if (unavailable) throw new Error('Database unavailable'); return [sample] },
    getSkillsBySlugs: async () => { if (unavailable) throw new Error('Database unavailable'); return [sample] },
  },
  '@/lib/skill-fallbacks': { getCuratedSkillFallback: slug => useFallback && slug === sample.slug ? fallback : null },
  '@/lib/skill-packs': packs,
}
const page = {}
const output = ts.transpileModule(readFileSync('app/skill-packs/page.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText
new Function('exports', 'require', output)(page, name => {
  assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
  return dependencies[name]
})
assert.equal(page.metadata.title, 'Installable AI Agent Skill Packs', 'Root layout supplies the brand suffix once')
assert.equal(page.metadata.description, 'Installable AI agent skill packs for frontend engineers, design agents, SEO automation, data analysts, startup founders, and full-stack SaaS builders. Each includes an agent-readable plan and audit links.')
assert.equal(page.metadata.alternates.canonical, 'https://www.openagentskill.com/skill-packs')
assert.equal(page.metadata.openGraph.url, page.metadata.alternates.canonical)
assert.equal(page.metadata.robots?.index, undefined, 'Inherit the root index policy')
assert.equal(page.revalidate, 300)
const nodes = node => [node, ...(node.childNodes || []).flatMap(nodes)]
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('')

async function verify() {
  const all = nodes(parse(renderToStaticMarkup(await page.default())))
  const headings = all.filter(node => node.tagName === 'h1')
  assert.equal(headings.length, 1)
  assert.match(text(headings[0]), /AI Agent\s*Skill Packs/)
  const cards = all.filter(node => node.tagName === 'article')
  assert.equal(cards.length, SKILL_PACKS.length)
  const urls = []
  for (const [index, card] of cards.entries()) {
    const pack = SKILL_PACKS[index]
    const elements = nodes(card)
    const heading = elements.find(node => node.tagName === 'h3')
    const link = nodes(heading).find(node => node.tagName === 'a')
    assert.equal(attr(link, 'href'), `/skill-packs/${pack.slug}`)
    assert.equal(text(link), pack.shortTitle)
    urls.push(`https://www.openagentskill.com${attr(link, 'href')}`)
    assert.ok(elements.some(node => node.tagName === 'p' && text(node) === pack.description), `${pack.slug}: retain the full visible description`)
    const workflow = elements.find(node => node.tagName === 'ol')
    assert.deepEqual(nodes(workflow).filter(node => node.tagName === 'li').map(text), pack.workflowSteps.map(step => step.title))
    const skillLinks = elements.filter(node => node.tagName === 'a' && attr(node, 'href').startsWith('/skills/'))
    assert.equal(new Set(skillLinks.map(node => attr(node, 'href'))).size, skillLinks.length, 'Deduplicate featured, fallback, and candidate records')
    for (const skillLink of skillLinks) assert.equal(text(skillLink), unavailable ? fallback.name : sample.name, 'Live records take precedence over saved records')
  }
  const scripts = all.filter(node => node.tagName === 'script' && attr(node, 'type') === 'application/ld+json')
  assert.equal(scripts.length, 1)
  const graph = JSON.parse(text(scripts[0]))['@graph']
  const list = graph.find(node => node['@type'] === 'ItemList')
  assert.equal(list.numberOfItems, cards.length)
  assert.deepEqual(list.itemListElement.map(item => item.item.url), urls)
  assert.deepEqual(list.itemListElement.map(item => item.item.description), SKILL_PACKS.map(pack => pack.description))
  assert.deepEqual(list.itemListElement.map(item => item.position), cards.map((_, i) => i + 1))
  assert.equal(graph.find(node => node['@type'] === 'CollectionPage').mainEntity['@id'], list['@id'])
  assert.equal(graph.find(node => node['@type'] === 'BreadcrumbList').itemListElement.at(-1).item, page.metadata.alternates.canonical)
  for (const href of ['/', '/api/agent/packs', '/collections', '/use-cases', '/skills', '#pack-directory']) {
    assert.ok(all.some(node => node.tagName === 'a' && attr(node, 'href') === href), `Preserve discoverable destination ${href}`)
  }
  assert.ok(all.some(node => node.tagName === 'section' && attr(node, 'id') === 'pack-directory'))
  return all.filter(node => node.tagName === 'a' && attr(node, 'href')?.startsWith('/skills/'))
}
assert.ok((await verify()).length > 0)
unavailable = true
assert.ok((await verify()).length > 0, 'Curated fallbacks remain available during a database outage')
useFallback = false
assert.equal((await verify()).length, 0, 'All pack content remains crawlable even with no skill records')
console.log(`Skill pack directory: ${SKILL_PACKS.length} server-rendered packs, complete descriptions, workflow previews, schema/link consistency, deduplicated live/fallback records, and outage coverage passed.`)
