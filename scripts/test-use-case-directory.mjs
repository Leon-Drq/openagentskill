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
const useCases = await import('../lib/use-cases.ts')
const directory = await import('../lib/use-case-directory.ts')
const collections = await import('../lib/collections.ts')
const { USE_CASES } = useCases
const groups = directory.groupUseCases(USE_CASES)
const ordered = groups.flatMap(group => group.useCases)
assert.equal(groups.length, 5)
assert.equal(ordered.length, USE_CASES.length)
assert.equal(new Set(ordered.map(item => item.slug)).size, USE_CASES.length)
assert.deepEqual(ordered.map(item => item.slug).sort(), USE_CASES.map(item => item.slug).sort())
assert.deepEqual(directory.USE_CASE_GROUPS.flatMap(group => group.slugs).sort(), USE_CASES.map(item => item.slug).sort())
const extra = { ...USE_CASES[0], slug: 'future-guide' }
assert.equal(directory.groupUseCases([...USE_CASES, extra]).at(-1).useCases[0], extra, 'Unassigned future guides must remain visible')

let unavailable = false
const sample = { slug: 'addyosmani-agent-skills', name: 'Code review example', description: 'Code review and debugging', github_stars: 100, quality_score: 80, tags: [], frameworks: [] }
const dependencies = {
  'react/jsx-runtime': jsx,
  'next/link': { default: ({ children, ...props }) => createElement('a', props, children) },
  'lucide-react': icons,
  '@/components/marketing-page': { MarketingPageShell: ({ children }) => createElement('main', null, children) },
  '@/components/navigation-hub-links': { NavigationHubLinks: () => null },
  '@/lib/db/skills': {
    getAllSkills: async () => { if (unavailable) throw new Error('Database unavailable'); return [sample] },
    getSkillsBySlugs: async () => { if (unavailable) throw new Error('Database unavailable'); return [sample] },
  },
  '@/lib/collections': collections,
  '@/lib/use-cases': useCases,
  '@/lib/use-case-directory': directory,
}
const output = ts.transpileModule(readFileSync('app/use-cases/page.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText
const page = {}
new Function('exports', 'require', output)(page, name => {
  assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
  return dependencies[name]
})
assert.equal(page.metadata.title, 'AI Agent Skill Use Cases')
assert.equal(page.metadata.alternates.canonical, 'https://www.openagentskill.com/use-cases')
assert.equal(page.metadata.openGraph.url, page.metadata.alternates.canonical)
assert.equal(page.metadata.robots?.index, undefined, 'Retain the root layout index policy')
assert.equal(page.revalidate, 300)

const nodes = node => [node, ...(node.childNodes || []).flatMap(nodes)]
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('')
async function verifyRenderedDirectory() {
  const html = renderToStaticMarkup(await page.default())
  const all = nodes(parse(html))
  const headings = all.filter(node => node.tagName === 'h1')
  assert.equal(headings.length, 1)
  assert.match(text(headings[0]), /AI Agent.*Use Cases/)
  const cards = all.filter(node => node.tagName === 'article')
  assert.equal(cards.length, USE_CASES.length)
  const urls = []
  for (const [index, card] of cards.entries()) {
    const item = ordered[index]
    const elements = nodes(card)
    const heading = elements.find(node => node.tagName === 'h3')
    const link = nodes(heading).find(node => node.tagName === 'a')
    assert.equal(attr(link, 'href'), `/use-cases/${item.slug}`)
    assert.equal(text(link), item.shortTitle)
    assert.ok(elements.some(node => node.tagName === 'p' && text(node) === item.description), `${item.slug}: full description must be in server HTML`)
    urls.push(`https://www.openagentskill.com${attr(link, 'href')}`)
    const skillLinks = elements.filter(node => node.tagName === 'a' && attr(node, 'href').startsWith('/skills/'))
    assert.equal(new Set(skillLinks.map(node => attr(node, 'href'))).size, skillLinks.length)
  }
  for (const group of groups) {
    assert.ok(all.some(node => node.tagName === 'a' && attr(node, 'href') === `#${group.id}`))
    assert.ok(all.some(node => node.tagName === 'section' && attr(node, 'id') === group.id))
    assert.ok(all.some(node => node.tagName === 'h2' && text(node) === group.title))
  }
  const schemaNodes = all.filter(node => node.tagName === 'script' && attr(node, 'type') === 'application/ld+json')
  assert.equal(schemaNodes.length, 1)
  const graph = JSON.parse(text(schemaNodes[0]))['@graph']
  const list = graph.find(node => node['@type'] === 'ItemList')
  assert.equal(list.numberOfItems, cards.length)
  assert.deepEqual(list.itemListElement.map(item => item.item.url), urls)
  assert.deepEqual(list.itemListElement.map(item => item.position), cards.map((_, i) => i + 1))
  assert.deepEqual(list.itemListElement.map(item => item.item.description), ordered.map(item => item.description))
  assert.equal(graph.find(node => node['@type'] === 'CollectionPage').url, page.metadata.alternates.canonical)
  assert.equal(graph.find(node => node['@type'] === 'BreadcrumbList').itemListElement.at(-1).item, page.metadata.alternates.canonical)
  for (const stack of collections.SKILL_STACKS.slice(0, 3)) {
    assert.ok(all.some(node => node.tagName === 'a' && attr(node, 'href') === `/collections/${stack.slug}`))
  }
  const form = all.find(node => node.tagName === 'form')
  assert.equal(attr(form, 'action'), '/skills')
  assert.equal(attr(form, 'method'), 'get')
  assert.ok(nodes(form).some(node => node.tagName === 'input' && attr(node, 'name') === 'q'))
  return all
}
const populated = await verifyRenderedDirectory()
assert.ok(populated.some(node => node.tagName === 'a' && attr(node, 'href') === `/skills/${sample.slug}` && text(node) === sample.name))
unavailable = true
const empty = await verifyRenderedDirectory()
assert.ok(!empty.some(node => node.tagName === 'a' && attr(node, 'href')?.startsWith('/skills/')))
console.log(`Use-case directory: ${USE_CASES.length} crawlable guides, complete descriptions, consistent schema, native navigation/search, featured skill links, and database-failure fallback passed.`)
