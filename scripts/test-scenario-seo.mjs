import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as jsx from 'react/jsx-runtime'
import { parse } from 'parse5'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { SCENARIO_TOPICS, SCENARIO_SOURCES, getScenarioSources, getScenarioTopic, getScenarioLinksForSkill } = await import('../lib/seo/scenario-pages.ts')
const { SCENARIO_EXAMPLES } = await import('../lib/seo/scenario-examples.ts')
const { BEST_SKILL_PAGES, getBestSkillPage } = await import('../lib/seo/growth-pages.ts')
const { GROWTH_GUIDES } = await import('../lib/seo/growth-guides.ts')
const { getSkillStackBySlug, selectSkillsForStack } = await import('../lib/collections.ts')
const { CURATED_SKILL_SNAPSHOT } = await import('../lib/seo/curated-skill-snapshot.ts')

function compile(path, dependencies) {
  const source=readFileSync(path,'utf8')
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
  const exports={}
  new Function('exports','require',output)(exports,name=>{
    assert.ok(name in dependencies,`Unexpected dependency ${name} in ${path}`)
    return dependencies[name]
  })
  return exports
}
const forbidden=()=>{throw new Error('Editorial scenario pages cannot depend on catalog ranking or runtime outcomes')}
const { getBestSitemapEntries, getGuideSitemapEntries }=compile('lib/seo/sitemap.ts',{
  '@/lib/agent-tasks':{AGENT_TASKS:[]},'@/lib/collections':{SKILL_STACKS:[]},
  '@/lib/seo/skill-sitemap-data':{getSkillSitemapSnapshot:forbidden},'@/lib/rankings':{getRankingDefinitions:()=>[]},
  '@/lib/seo/growth-guides':{GROWTH_GUIDES},'@/lib/seo/growth-pages':{BEST_SKILL_PAGES},
  '@/lib/seo/growth-directories':{AGENT_PROFILES:[],OFFICIAL_CREATORS:[]},
  '@/lib/i18n/market-routing':{MARKET_LOCALES:[],LOCALIZED_CORE_PAGE_SLUGS:[]},
  '@/lib/seo/localized-pages':{LOCALIZED_LANDING_PAGES:{}},'@/lib/seo/skill-clusters':{SKILL_CLUSTERS:[]},
  '@/lib/skill-packs':{SKILL_PACKS:[]},'@/lib/use-cases':{USE_CASES:[]},
  '@/lib/showcase':{SHOWCASE_CASES:[],SHOWCASE_UPDATED_AT:'2026-10-07'},
  '@/lib/skills/external-catalog':{EXTERNAL_SKILLS:[]},'@/lib/supabase/public':{},
  '@/lib/creator-directory':{FEATURED_CREATORS:[]},
  '@/lib/seo/search-indexability':{SEARCH_INDEX_MIN_GITHUB_STARS:3,SEARCH_INDEX_MIN_QUALITY_SCORE:50},
})
const sourceData=await import('../lib/seo/scenario-pages.ts')
for (const source of SCENARIO_SOURCES.filter(source=>!source.registrySlug)) assert.equal(sourceData.scenarioProfileHref(source), sourceData.scenarioSourceUrl(source))
const exampleData=await import('../lib/seo/scenario-examples.ts')
const components=compile('components/scenario-topic.tsx',{
  'react/jsx-runtime':jsx,
  'next/link':{default:({children,...props})=>createElement('a',props,children)},
  'next/image':{default:props=>createElement('img',props)},
  '@/components/marketing-page':{MarketingPageShell:({children})=>createElement('main',null,children)},
  '@/lib/seo/scenario-pages':sourceData,'@/lib/seo/scenario-examples':exampleData,
})
const route=compile('app/best/[slug]/page.tsx',{
  'react/jsx-runtime':jsx,'next/link':{},'next/navigation':{notFound:forbidden},
  '@/components/install-command':{},'@/components/site-footer':{},'@/components/site-header':{},
  '@/components/presentation-topic':{},'@/components/scenario-topic':components,
  '@/lib/seo/scenario-pages':sourceData,'@/lib/agent-proven':{},'@/lib/audits':{},'@/lib/quality':{},'@/lib/trust':{},
  '@/lib/db/skills':{getAllSkills:forbidden,getAgentOutcomeStatsMap:forbidden},
  '@/lib/rankings':{rankSkillsForDefinition:forbidden},
  '@/lib/seo/growth-pages':{BEST_SKILL_PAGES,getBestSkillPage},'@/lib/seo/curated-skill-snapshot':{},
  '@/lib/seo/presentation-pages':{getPresentationPage:()=>undefined},'@/lib/use-cases':{},
})
const descendants=node=>[node,...(node.childNodes||[]).flatMap(descendants)]
const attrs=node=>Object.fromEntries((node.attrs||[]).map(attr=>[attr.name,attr.value]))
const text=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(text).join('')

assert.equal(new Set(BEST_SKILL_PAGES.map(page => page.slug)).size, BEST_SKILL_PAGES.length)
assert.equal(new Set(GROWTH_GUIDES.map(page => page.slug)).size, GROWTH_GUIDES.length)
for (const topic of SCENARIO_TOPICS) {
  assert.equal(getBestSkillPage(topic.slug).title, topic.title)
  assert.ok(getBestSitemapEntries().some(entry => entry.url.endsWith('/best/' + topic.slug)))
  assert.equal(getScenarioSources(topic).length, topic.sourceIds.length)
  if (topic.guideSlug) {
    assert.ok(GROWTH_GUIDES.some(guide => guide.slug === topic.guideSlug))
    assert.ok(getGuideSitemapEntries().some(entry => entry.url.endsWith('/guides/' + topic.guideSlug)))
  }
  for (const id of topic.exampleIds) assert.ok(SCENARIO_EXAMPLES.some(example => example.id === id))
  for (const pick of topic.choices) assert.ok(pick.href || topic.sourceIds.includes(pick.sourceId))
  const args={params:Promise.resolve({slug:topic.slug})}
  const metadata=await route.generateMetadata(args)
  assert.equal(metadata.title,topic.title)
  assert.equal(metadata.alternates.canonical,`https://www.openagentskill.com/best/${topic.slug}`)
  assert.deepEqual(metadata.robots,{index:true,follow:true})
  const html=renderToStaticMarkup(await route.default(args))
  const nodes=descendants(parse(html))
  const headings=nodes.filter(node=>node.tagName==='h1')
  assert.equal(headings.length,1)
  assert.equal(text(headings[0]),topic.title)
  const ids=nodes.map(node=>attrs(node).id).filter(Boolean)
  assert.equal(new Set(ids).size,ids.length)
  for(const node of nodes.filter(node=>node.tagName==='a')) {
    const href=attrs(node).href
    if(href?.startsWith('#'))assert.ok(ids.includes(href.slice(1)),`Broken anchor ${href}`)
  }
  assert.equal(nodes.filter(node=>node.tagName==='tr').length,topic.sourceIds.length+1)
  const schemaNode=nodes.find(node=>node.tagName==='script'&&attrs(node).type==='application/ld+json')
  const schema=JSON.parse(text(schemaNode))['@graph']
  assert.equal(schema.find(item=>item['@type']==='CollectionPage').url,metadata.alternates.canonical)
  assert.equal(schema.find(item=>item['@type']==='FAQPage').mainEntity.length,topic.faq.length)
  for(const question of topic.faq)assert.ok(html.includes(question.question))
  assert.doesNotMatch(html,/href="\/skills\/anthropic-(pdf|xlsx|docx)"/,'Unlisted sources must link to pinned instructions, not soft 404 profiles')
}
for (const source of SCENARIO_SOURCES) {
  assert.match(source.commit, /^[a-f0-9]{40}$/)
  assert.ok(source.path.endsWith('/SKILL.md'))
  if (source.registrySlug) assert.ok(getScenarioLinksForSkill(source.registrySlug).length > 0)
}
assert.deepEqual(getScenarioSources(getScenarioTopic('claude-code-pdf-parsing')).map(source => source.id), ['pdf'], 'PDF parsing excludes visual design and generic high-star libraries')
assert.deepEqual(getScenarioSources(getScenarioTopic('claude-excel-skills')).map(source => source.id), ['xlsx'], 'Spreadsheet selection does not drift into marketing candidates')
assert.match(SCENARIO_SOURCES.find(source => source.id === 'taste').limits, /excludes dashboards/)
assert.deepEqual(getScenarioLinksForSkill('unrelated-high-star-tool'), [])
const frontend = getSkillStackBySlug('frontend-product-ui')
const actual = CURATED_SKILL_SNAPSHOT.find(skill => skill.slug === 'anthropic-frontend-design')
const misleading = { ...actual, slug: 'unrelated-design-pdf-marketing', name: 'UI frontend PDF marketing', github_stars: 999999, quality_score: 100 }
assert.deepEqual(selectSkillsForStack([misleading, actual], frontend).map(skill => skill.slug), [actual.slug], 'Stars and keyword stuffing cannot enter a curated frontend collection')

for (const example of SCENARIO_EXAMPLES) {
  for (const asset of [...example.links.map(link => link.href), example.image, example.video].filter(Boolean)) {
    await access('public' + asset)
  }
  assert.ok(example.evidence && example.limitations)
}
for (const name of ['landing.html', 'dashboard.html', 'design-handoff.html']) {
  const html = await readFile('public/examples/scenarios/' + name, 'utf8')
  assert.match(html, /content="noindex,follow"/, 'Standalone fixtures must not compete with the editorial pages')
  assert.equal((html.match(/<h1\b/g) || []).length, 1)
}
console.log('Scenario SEO: curated relevance, unique routes, sitemap/guide discovery, source identity and example availability passed.')
