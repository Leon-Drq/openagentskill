import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { register } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as jsx from 'react/jsx-runtime'
import * as icons from 'lucide-react'
import { parse } from 'parse5'
import ts from 'typescript'

register('./test-owner-publication-loader.mjs', import.meta.url)
const data = await import('../lib/seo/presentation-pages.ts')
const growth = await import('../lib/seo/growth-pages.ts')
const useCases = await import('../lib/use-cases.ts')
const taxonomy = await import('../lib/skills/taxonomy.ts')
const discovery = await import('../lib/discovery.ts')
const read = path => readFileSync(path, 'utf8')
function compile(path, dependencies) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const exports = {}
  new Function('exports', 'require', output)(exports, name => {
    assert.ok(name in dependencies, `Unexpected dependency ${name} in ${path}`)
    return dependencies[name]
  })
  return exports
}
const forbidden = () => { throw new Error('PPT editorial pages must not depend on a database, scores or installations') }
const Link = { default: ({ children, ...props }) => { delete props.prefetch; return createElement('a', props, children) } }
const Image = { default: ({ ...props }) => { delete props.fill; delete props.sizes; return createElement('img', props) } }
const topic = compile('components/presentation-topic.tsx', {
  'react/jsx-runtime': jsx, 'next/link': Link, 'next/image': Image,
  '@/components/marketing-page': { MarketingPageShell: ({ children }) => createElement('main', null, children) },
  '@/lib/seo/presentation-pages': data,
  '@/lib/showcase': { SHOWCASE_CASES: [], getShowcaseEvidenceLabel: forbidden, getShowcaseImageSrc: forbidden },
})
const route = compile('app/best/[slug]/page.tsx', {
  'react/jsx-runtime': jsx, 'next/link': Link, 'next/navigation': { notFound: () => { throw new Error('404') } },
  '@/components/install-command': {}, '@/components/site-footer': {}, '@/components/site-header': {},
  '@/components/presentation-topic': topic,
  '@/components/scenario-topic': { ScenarioTopicPage: forbidden },
  '@/lib/seo/scenario-pages': { getScenarioTopic: () => undefined },
  '@/lib/agent-proven': {}, '@/lib/audits': {}, '@/lib/quality': {}, '@/lib/trust': {},
  '@/lib/db/skills': { getAllSkills: forbidden, getAgentOutcomeStatsMap: forbidden },
  '@/lib/rankings': { rankSkillsForDefinition: forbidden },
  '@/lib/seo/growth-pages': growth, '@/lib/seo/curated-skill-snapshot': {},
  '@/lib/seo/presentation-pages': data, '@/lib/use-cases': useCases,
})
const descendants = node => [node, ...(node.childNodes || []).flatMap(descendants)]
const attrs = node => Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value]))
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('')
const rendered = new Map()
for (const page of data.PRESENTATION_PAGES) {
  const args = { params: Promise.resolve({ slug: page.slug }) }
  const metadata = await route.generateMetadata(args)
  const canonical = `https://www.openagentskill.com/best/${page.slug}`
  assert.equal(metadata.alternates.canonical, canonical)
  assert.equal(metadata.title, page.title)
  assert.equal(metadata.description, page.description)
  assert.deepEqual(metadata.robots, { index: true, follow: true })
  const html = renderToStaticMarkup(await route.default(args))
  rendered.set(page.slug, html)
  const nodes = descendants(parse(html))
  const h1 = nodes.filter(node => node.tagName === 'h1')
  assert.equal(h1.length, 1)
  assert.equal(text(h1[0]), page.title)
  const ids = nodes.map(node => attrs(node).id).filter(Boolean)
  assert.equal(new Set(ids).size, ids.length, 'Every local anchor is unique')
  for (const node of nodes.filter(node => node.tagName === 'a')) {
    const href = attrs(node).href
    if (href?.startsWith('#')) assert.ok(ids.includes(href.slice(1)), `Broken anchor ${href} on ${page.slug}`)
  }
  const rows = nodes.filter(node => node.tagName === 'tr')
  assert.equal(rows.length, page.sourceIds.length + 1)
  const json = nodes.find(node => node.tagName === 'script' && attrs(node).type === 'application/ld+json')
  const structured = JSON.parse(text(json))
  const collection = structured['@graph'].find(node => node['@type'] === 'CollectionPage')
  const list = structured['@graph'].find(node => node['@type'] === 'ItemList')
  assert.equal(collection.url, canonical)
  assert.equal(collection.dateModified, data.PRESENTATION_UPDATED_AT)
  assert.equal(list.numberOfItems, page.sourceIds.length)
  assert.deepEqual(list.itemListElement.map(item => item.name), data.getPresentationSources(page).map(source => source.name))
  for (const source of data.getPresentationSources(page)) {
    assert.ok(html.includes(data.presentationSourceUrl(source)), 'Every recommendation exposes the inspected source revision')
    assert.ok(html.includes(`/skills/${source.registrySlug}`))
    assert.match(source.commit, /^[a-f0-9]{40}$/)
    assert.ok(source.path.endsWith('SKILL.md'))
  }
  assert.doesNotMatch(html, /Deck\.Gl|visgl\/deck\.gl|Safe to try|security-graded|Trust \d|Agent Proven \d/)
  assert.ok(nodes.some(node => node.tagName === 'p' && text(node).includes('runtime results have not been established')))
}
assert.equal(new Set(rendered.values()).size, 8, 'Each presentation URL must have distinct main content')
assert.deepEqual(data.PRESENTATION_PAGES.map(page => page.sourceIds.length), [7, 3, 1, 5, 1, 1, 3, 1])
const pptx = rendered.get('ppt-generation')
assert.ok(pptx.includes('PPT Master') && pptx.includes('Image to Editable PPT'))
assert.ok(!pptx.includes('id="codex-ppt"'), 'An image-based generator is not a native-editable recommendation')
assert.ok(rendered.get('presentation-generation').includes('HTML PPT Studio'), 'Editorial selection cannot truncate a relevant low-global-rank candidate')
assert.ok(rendered.get('codex-presentation-decks').includes('not separate text objects'))
const workbuddy = rendered.get('workbuddy-ppt-skills')
assert.ok(workbuddy.includes('id="workbuddy-pptx"') && workbuddy.includes(data.WORKBUDDY_DOCS.office), 'WorkBuddy native PPTX coverage needs its own visible section and official source')
assert.ok(workbuddy.includes(data.WORKBUDDY_DOCS.skills))
assert.ok(!workbuddy.includes('id="guizang-ppt"'), 'An in-adaptation package is not a supported WorkBuddy recommendation')
for (const source of data.getPresentationSources(data.getPresentationPage('workbuddy-ppt-skills'))) {
  assert.equal(source.workbuddy?.status, 'documented')
  assert.ok(workbuddy.includes(`https://github.com/${source.repository}/blob/${source.commit}/${source.workbuddy.evidencePath}`))
}
assert.equal(data.PRESENTATION_SOURCES.find(source => source.id === 'guizang-ppt').workbuddy.status, 'in-adaptation')
assert.ok(rendered.get('presentation-generation').includes('WorkBuddy: in adaptation'))
assert.ok(rendered.get('presentation-generation').includes(data.WORKBUDDY_PRESENTATION_PATH), 'The main PPT hub must expose the WorkBuddy route')
const mainHub = rendered.get('presentation-generation')
for (const slug of ['trae-ppt-skills', 'doubao-ppt-skills', 'cursor-ppt-skills', 'codebuddy-ppt-skills']) {
  assert.ok(mainHub.includes(`/best/${slug}`), `The main hub must expose ${slug}`)
  const page = data.getPresentationPage(slug)
  const html = rendered.get(slug)
  assert.ok(html.includes(`href="#${page.platformGuide.id}"`), 'The primary CTA must reach the current platform setup')
  assert.ok(html.includes(`id="${page.platformGuide.id}"`))
  for (const link of page.platformGuide.links) assert.ok(html.includes(link.href), 'Platform instructions need a visible source')
}
assert.ok(rendered.get('trae-ppt-skills').includes('.trae/skills/'))
assert.ok(rendered.get('trae-ppt-skills').includes('~/.trae-cn/skills'))
assert.ok(rendered.get('cursor-ppt-skills').includes('type /') && rendered.get('cursor-ppt-skills').includes('shell'))
const doubao = rendered.get('doubao-ppt-skills')
assert.ok(doubao.includes('office mode') && doubao.includes('Node.js 20+'))
assert.ok(doubao.includes('not establish a universal Doubao skill installer'))
assert.deepEqual(data.getPresentationSources(data.getPresentationPage('doubao-ppt-skills')).map(source => source.id), ['dashi-ppt'], 'Doubao selections must stay within documented office-mode compatibility')
assert.ok(!doubao.includes('id="codex-ppt"') && !doubao.includes('id="ppt-master"'))
assert.ok(rendered.get('codebuddy-ppt-skills').includes('separate clients'), 'CodeBuddy IDE and WorkBuddy must keep their own setup instructions')
assert.ok(!rendered.get('codebuddy-ppt-skills').includes('id="workbuddy-pptx"'))
assert.equal(new Set(growth.BEST_SKILL_PAGES.map(page => page.slug)).size, growth.BEST_SKILL_PAGES.length, 'Generated platform pages cannot duplicate existing URLs')
await assert.rejects(route.default({ params: Promise.resolve({ slug: 'not-a-real-topic' }) }), /404/)

const example = (slug, skillSlug) => ({ slug, skillSlug, title: { en: slug }, description: { en: 'Author presentation example' }, media: [{ src: `/showcase/${slug}.webp`, alt: { en: `${slug} preview` } }] })
const withExamples = compile('components/presentation-topic.tsx', {
  'react/jsx-runtime': jsx, 'next/link': Link, 'next/image': Image,
  '@/components/marketing-page': { MarketingPageShell: ({ children }) => createElement('main', null, children) },
  '@/lib/seo/presentation-pages': data,
  '@/lib/showcase': {
    SHOWCASE_CASES: [example('editorial-html-slides', 'op7418-guizang-ppt-skill'), example('frontend-preview', 'zarazhangrui-frontend-slides')],
    getShowcaseEvidenceLabel: () => 'Author example', getShowcaseImageSrc: src => src,
  },
})
const examplesFor = slug => renderToStaticMarkup(createElement(withExamples.PresentationTopic, { page: data.getPresentationPage(slug) }))
assert.ok(examplesFor('presentation-generation').includes('/showcase/frontend-preview'))
assert.ok(examplesFor('codex-presentation-decks').includes('/showcase/editorial-html-slides'))
assert.ok(!examplesFor('codex-presentation-decks').includes('/showcase/frontend-preview'), 'Examples must belong to a skill compared on the current page')
assert.ok(!examplesFor('ppt-generation').includes('id="examples"'), 'An HTML example must not imply an editable PPTX result')

const presentation = useCases.getUseCaseBySlug('presentation-generation')
const record = (name, description, github_repo, slug = 'test', extra = {}) => ({ name, description, github_repo, slug, github_stars: 100000, quality_score: 100, tags: [], frameworks: [], ...extra })
assert.equal(useCases.scoreSkillForUseCase(record('Deck.Gl', 'WebGL2 powered visualization framework', 'visgl/deck.gl'), presentation), 0)
assert.equal(useCases.scoreSkillForUseCase(record('NotebookLM client', 'Python API for NotebookLM', 'example/notebooklm'), presentation), 0)
assert.equal(useCases.scoreSkillForUseCase(record('Generic design', 'Color scheme advisor', 'example/design', presentation.featuredSlugs[0]), presentation), 0, 'A featured bonus cannot make unrelated metadata relevant')
assert.ok(useCases.scoreSkillForUseCase(record('PPT Master', 'Create editable PowerPoint with native objects', 'hugohe3/ppt-master', 'hugohe3-ppt-master'), presentation) > 0)
assert.ok(useCases.scoreSkillForUseCase(record('HTML PPT', 'HTML presentations with speaker notes', 'lewislulu/html-ppt-skill'), presentation) > 0)

for (const page of data.PRESENTATION_PAGES) {
  const entry = growth.getBestSkillPage(page.slug)
  assert.equal(entry.title, page.title)
  assert.equal(entry.description, page.description)
  assert.equal(entry.updatedAt, data.PRESENTATION_UPDATED_AT)
}
const sitemapSource = read('lib/seo/sitemap.ts')
const bestSitemapFunction = sitemapSource.slice(sitemapSource.indexOf('export function getBestSitemapEntries'), sitemapSource.indexOf('export function getRankingSitemapEntries'))
const sitemapCode = ts.transpileModule(bestSitemapFunction, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const sitemap = {}
new Function('exports', 'BEST_SKILL_PAGES', 'SITEMAP_BASE_URL', sitemapCode)(sitemap, growth.BEST_SKILL_PAGES, 'https://www.openagentskill.com')
const entries = sitemap.getBestSitemapEntries()
assert.equal(entries.filter(entry => entry.lastModified === data.PRESENTATION_UPDATED_AT).length, 8)
for (const page of data.PRESENTATION_PAGES) assert.ok(entries.some(entry => entry.url.endsWith(`/best/${page.slug}`)), 'Every presentation platform needs sitemap discovery')
assert.ok(entries.some(entry => entry.url.endsWith('/best/workbuddy-ppt-skills')), 'WorkBuddy needs sitemap discovery')
assert.ok(entries.some(entry => entry.url.endsWith('/coding-agents') && entry.lastModified === undefined))

const nav = compile('components/discovery-navigation.tsx', {
  'react/jsx-runtime': jsx, 'next/link': Link, 'lucide-react': icons,
  '@/lib/skills/taxonomy': taxonomy, '@/lib/discovery': discovery,
  '@/lib/i18n/market-routing': { getLocalizedNavigationHref: href => href },
  '@/lib/i18n/context': { useI18n: () => ({ locale: 'en' }) },
  '@/lib/utils': { cn: (...values) => values.filter(value => typeof value === 'string').join(' ') },
})
const navHtml = renderToStaticMarkup(createElement(nav.DiscoveryCategories, { variant: 'navigation' }))
assert.ok(navHtml.includes('href="/best/presentation-generation"') && navHtml.includes('PPT skills &amp; slides'))
const directoryHtml = renderToStaticMarkup(createElement(nav.DiscoveryCategories))
assert.ok(directoryHtml.includes('href="/skills?category=presentation"'))
assert.ok(directoryHtml.includes('href="/skills?output=slides"'), 'Directory filters keep their original behavior')
for (const guide of ['install-agent-skills-in-codex', 'install-agent-skills-in-claude-code']) assert.ok(read('lib/seo/growth-guides.ts').includes(`slug: '${guide}'`))
assert.ok(existsSync('docs/ppt-seo-upgrade.md'))
console.log('PPT SEO regressions passed: seven agent guides, scoped Doubao office mode, independent platform setup, source-backed selection, database-independent SSR, distinct intents, truthful outputs, anchors, metadata, sitemap and navigation.')
