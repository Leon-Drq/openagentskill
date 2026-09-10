import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { selectGuideSkills, selectComparisonSkills, scoreSkillForGuide } from '../lib/seo/guide-selection.ts'
import { GROWTH_GUIDES } from '../lib/seo/growth-guides.ts'
import { sitemapUnavailableResponse } from '../lib/seo/sitemap-response.ts'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const skill = (slug, description, extra = {}) => ({ slug, name: slug, description, ai_review_approved: true, github_stars: 1, tags: [], ...extra })
const guide = { skillKeywords: ['rag', 'retrieval'], primarySkillSlugs: [], compareTargetNames: [] }
const irrelevant = skill('storage-manager', 'A storage manager', { github_stars: 1000000, quality_score: 100 })
const relevant = skill('retrieval-tool', 'RAG retrieval workflow')
assert.equal(scoreSkillForGuide(irrelevant, guide), 0)
assert.deepEqual(selectGuideSkills([irrelevant, relevant, relevant], guide).map(s => s.slug), ['retrieval-tool'])
assert.deepEqual(selectGuideSkills([irrelevant], guide), [])
assert.deepEqual(selectGuideSkills([skill('blocked', 'RAG retrieval', { ai_review_approved: false })], guide), [])
assert.deepEqual(selectComparisonSkills([skill('firecrawl-wrapper', 'Firecrawl'), skill('crawl4ai', 'Crawl')], { compareTargetNames: ['firecrawl', 'crawl4ai'] }).map(s => s.slug), ['crawl4ai'])
const videoGuide = GROWTH_GUIDES.find(g => g.slug === 'agent-skills-for-product-videos')
assert.ok(videoGuide && videoGuide.resources.length >= 4)
assert.deepEqual(selectGuideSkills([skill('frontend-theme', 'Product launch video design')], videoGuide), [])
assert.equal(scoreSkillForGuide(skill('storage', 'Storage tool', { long_description: 'Does not support rag retrieval.' }), guide), 0)
assert.ok(videoGuide.faq.some(f => f.answer.includes('No. This is a source-based')))
assert.equal(new Set(GROWTH_GUIDES.map(g => g.slug)).size, GROWTH_GUIDES.length)
for (const g of GROWTH_GUIDES) for (const slug of g.relatedGuideSlugs) assert.ok(GROWTH_GUIDES.some(other => other.slug === slug))

function compile(path, dependencies) {
  const output = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  new Function('exports', 'require', output)(exports, name => {
    assert.ok(name in dependencies, `Missing test dependency: ${name}`)
    return dependencies[name]
  })
  return exports
}
const mocks = {
  '@/lib/agent-tasks': { AGENT_TASKS: [] }, '@/lib/collections': { SKILL_STACKS: [] },
  '@/lib/async': { withTimeout: promise => promise },
  '@/lib/db/skills': { getApprovedSkillSitemapCount: async () => 2001, getApprovedSkillSitemapRecords: async () => [] },
  '@/lib/rankings': { getRankingDefinitions: () => [] },
  '@/lib/seo/growth-guides': { GROWTH_GUIDES },
  '@/lib/seo/growth-directories': { AGENT_PROFILES: [], OFFICIAL_CREATORS: [] },
  '@/lib/seo/growth-pages': { BEST_SKILL_PAGES: [] },
  '@/lib/i18n/market-routing': { MARKET_LOCALES: [], LOCALIZED_CORE_PAGE_SLUGS: [] },
  '@/lib/seo/localized-pages': { LOCALIZED_LANDING_PAGES: {} },
  '@/lib/seo/skill-clusters': { SKILL_CLUSTERS: [] }, '@/lib/skill-packs': { SKILL_PACKS: [] },
  '@/lib/use-cases': { USE_CASES: [] },
  '@/lib/showcase': { SHOWCASE_CASES: [{ slug: 'example', updatedAt: '2026-09-01' }], SHOWCASE_UPDATED_AT: '2026-09-02' },
  '@/lib/supabase/public': {}, '@/lib/creator-directory': { FEATURED_CREATORS: [] },
  '@/lib/seo/search-indexability': { SEARCH_INDEX_MIN_GITHUB_STARS: 3, SEARCH_INDEX_MIN_QUALITY_SCORE: 50 },
}
const sitemap = compile('lib/seo/sitemap.ts', mocks)
const core = sitemap.getCoreSitemapEntries()
assert.equal(core.find(p => p.url.endsWith('/about')).lastModified, undefined)
assert.equal(core.find(p => p.url.endsWith('/showcase/example')).lastModified, '2026-09-01')
assert.equal(sitemap.getGuideSitemapEntries().find(p => p.url.endsWith(videoGuide.slug)).lastModified, videoGuide.updatedAt)
const xml = sitemap.renderUrlSet([{ url: 'https://example.com/?a=1&b=2', lastModified: 'invalid' }])
assert.ok(xml.includes('&amp;') && !xml.includes('<lastmod>'))
assert.equal((await sitemap.getSitemapIndexEntries()).filter(p => p.loc.includes('skills-')).length, 3)
mocks['@/lib/db/skills'].getApprovedSkillSitemapCount = async () => { throw new Error('db unavailable') }
mocks['@/lib/db/skills'].getApprovedSkillSitemapRecords = async () => { throw new Error('db unavailable') }
await assert.rejects(sitemap.getSitemapIndexEntries())
await assert.rejects(sitemap.getSkillSitemapEntries('skills', 4))

const unavailable = sitemapUnavailableResponse()
assert.equal(unavailable.status, 503)
assert.equal(unavailable.headers.get('cache-control'), 'no-store')
assert.equal(unavailable.headers.get('retry-after'), '300')
assert.equal(unavailable.headers.get('x-robots-tag'), null)
const routeDeps = {
  '@/lib/seo/sitemap': sitemap,
  '@/lib/seo/sitemap-response': { sitemapUnavailableResponse },
  'next/navigation': { notFound: () => { throw new Error('404') } },
}
assert.equal((await compile('app/sitemap.xml/route.ts', routeDeps).GET()).status, 503)
const shard = compile('app/sitemaps/[section]/route.ts', routeDeps)
const get = section => shard.GET(new Request('https://example.com'), { params: Promise.resolve({ section }) })
assert.equal((await get('skills-0.xml')).status, 503)
assert.equal((await get('core.xml')).status, 200)
assert.ok((await (await get('core.xml')).text()).includes('<lastmod>2026-09-01'))
assert.equal((await get('skill-audits-0.xml')).status, 410)
await assert.rejects(get('skills-01.xml'), /404/)
await assert.rejects(get('skills-9007199254740992.xml'), /404/)
// Ensure exceptions reach the persistent cache instead of poisoning it with a tiny snapshot.
const db = read('lib/db/skills.ts')
assert.ok(!db.includes('getSitemapFallbackRecords'))
const cacheCode = db.slice(db.indexOf('const getCachedApprovedSkillSitemapRecords'), db.indexOf('export async function getApprovedSkillSitemapRecords'))
assert.ok(!cacheCode.includes('catch'))
assert.ok(cacheCode.includes('approved-sitemap-count-v13-canonical-editorial') && cacheCode.includes('approved-sitemap-records-v13-canonical-editorial'))
assert.ok(!read('lib/seo/sitemap.ts').includes('lastModified: now'))
console.log('SEO regressions passed: relevance, honest comparisons, dates, XML, index/shard outage 503s and cold-cache safety.')
