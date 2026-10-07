import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { DISCOVERY_TASKS, DISCOVERY_OUTPUTS, DISCOVERY_AGENTS, discoveryCopy } from '../lib/discovery.ts'

import ts from 'typescript'
import { mediaSlugsNeedPost, slugQueryBatches } from '../lib/skills/media-query.ts'
import { normalizeSkillCategory } from '../lib/skills/taxonomy.ts'
import { clampResultPage } from '../lib/skills/pagination.ts'
import { directoryDiscoveryFilters, catalogSortColumn, canShowCatalogSnapshot, selectCatalogSnapshot } from '../lib/skills/catalog-query.ts'

assert.deepEqual(directoryDiscoveryFilters({}), { featured: false, examplesOnly: false }, 'Canonical directory defaults to all skills')
assert.deepEqual(directoryDiscoveryFilters({ view: 'all' }), { featured: false, examplesOnly: false })
assert.deepEqual(directoryDiscoveryFilters({ view: 'skills' }), { featured: true, examplesOnly: false }, 'Old featured bookmarks still work')
assert.deepEqual(directoryDiscoveryFilters({ view: 'skills', featured: 'false', examples: 'true' }), { featured: false, examplesOnly: true })
assert.deepEqual(directoryDiscoveryFilters({ featured: 'true', examples: 'true' }), { featured: true, examplesOnly: true })
assert.deepEqual(directoryDiscoveryFilters({ featured: 'garbage', examples: 'false' }), { featured: false, examplesOnly: false })
assert.equal(canShowCatalogSnapshot(1, 'all', 0, 'all'), true)
for (const args of [[2, 'all', 0, 'all'], [1, 'Design', 0, 'all'], [1, 'all', 100, 'all'], [1, 'all', 0, 'free']]) {
  assert.equal(canShowCatalogSnapshot(...args), false, 'Outage snapshots cannot impersonate database filters or later registry pages')
}
const saved = Array.from({length: 30}, (_, i) => ({slug: `saved-${i}`}))
assert.equal(selectCatalogSnapshot(saved, null).length, 16)
assert.deepEqual(selectCatalogSnapshot(saved, ['saved-25', 'saved-26']), saved.slice(25, 27), 'Saved case membership is applied before the first-page limit')
assert.deepEqual(selectCatalogSnapshot(saved, []), [])

// Execute the actual cached SQL query with a fake public client: filters must
// intersect before exact counting and pagination, including empty selections.
const db = readFileSync('lib/db/skills.ts', 'utf8')
const part = db.slice(db.indexOf('function applyCatalogFilters'), db.indexOf('export function getSkillCatalogPage'))
const helper = db.slice(db.indexOf('function applyTaxonomyFilters'), db.indexOf('// Apply discoverability'))
const code = ts.transpileModule(helper + part, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const calls = []
const cached = fn => {
  const cache = new Map()
  return (...args) => {
    const key = JSON.stringify(args)
    if (!cache.has(key)) cache.set(key, fn(...args))
    return cache.get(key)
  }
}
let count = 17
const fakeQuery = (rpcCount = false) => {
  let head = false
  const query = { then: done => Promise.resolve({ data: head ? null : [{ slug: 'example-skill' }], count: head || rpcCount ? count : null, error: null }).then(done) }
  for (const method of ['select','or','in','not','gte','order','range','eq','contains','limit']) query[method] = (...args) => {
    calls.push([method, ...args]); if (method === 'select') head = Boolean(args[1]?.head); return query
  }
  return query
}
const fakeClient = () => ({
  from: name => { calls.push(['from', name]); return fakeQuery() },
  rpc: (name, args, options) => { calls.push(['rpc', name, args, options]); return fakeQuery(Boolean(options?.count)) },
})
const getPage = new Function('unstable_cache','createPublicClient','SKILL_TAXONOMY_SELECT','PUBLIC_SKILL_FILTER','normalizeSkillCategory','directoryCategoryTerms','CATALOG_PAGE_SIZE','catalogSortColumn','clampResultPage','mediaSlugsNeedPost', code + ';return getCachedCatalogPage')(
  cached, fakeClient, 'slug', 'public gate', normalizeSkillCategory, value => [value], 16, catalogSortColumn, clampResultPage, mediaSlugsNeedPost,
)
const result = await getPage('quality', 'all', 2, 0, 'free', ['example-skill', 'other-skill'], ['example-skill'], 'all', 'all')
assert.equal(result.total, 17)
assert.equal(result.hasMore, false)
assert.equal(result.page, 2)
assert.deepEqual(calls.filter(call => call[0] === 'in'), Array(2).fill([['in', 'slug', ['example-skill', 'other-skill']], ['in', 'slug', ['example-skill']]]).flat())
assert.ok(calls.findIndex(call => call[0] === 'in') < calls.findIndex(call => call[0] === 'range'))
assert.deepEqual(calls.find(call => call[0] === 'range'), ['range', 16, 31])
assert.ok(calls.filter(call=>call[0]==='from').every(call=>call[1]==='skill_directory_entries'), 'Count and row windows exclude MCP-only entries before LIMIT')
assert.deepEqual(calls.filter(call=>call[0]==='select'), [['select','slug',{count:'exact',head:true}],['select','slug']], 'The row query does not recount')
assert.ok(calls.some(call => call[0] === 'or' && call[1] === 'public gate'))
calls.length = 0
await getPage('stars', 'all', 1, 0, 'free', ['example-skill', 'other-skill'], ['example-skill'], 'all', 'all')
assert.ok(calls.filter(c=>c[0]==='select').every(c=>!c[2]?.count), 'Different sorts and pages reuse the same count')
calls.length = 0
assert.deepEqual(await getPage('quality', 'all', 1, 0, 'all', [], [], 'all', 'all'), { records: [], total: 0, hasMore: false, page: 1 })
assert.equal(calls.length, 0, 'Empty intersections query neither counts nor rows')
await getPage('quality','ai-knowledge',1,0,'all',[],null,'rag','document')
assert.ok(calls.some(c => c[0]==='eq' && c[1]==='primary_category' && c[2]==='ai-knowledge'))
assert.deepEqual(calls.filter(c => c[0]==='contains'), Array(2).fill([['contains','taxonomy_tags',['rag']],['contains','output_types',['document']]]).flat())
assert.ok(calls.findIndex(c => c[0]==='contains') < calls.findIndex(c => c[0]==='range'))
calls.length = 0
await getPage('quality','all',1,0,'all',[],null,'all','all',0,8,385,8)
assert.deepEqual(calls.find(c=>c[0]==='range'),['range',0,7], 'Provider cards occupy eight of the first sixteen slots')
calls.length = 0
await getPage('quality','all',2,0,'all',[],null,'all','all',8,16,385,8)
assert.deepEqual(calls.find(c=>c[0]==='range'),['range',8,23], 'Next page resumes after the eight displayed registry rows')
calls.length = 0
const last = await getPage('quality','all',9999,0,'all',[],null,'all','all',159960,16,385,8)
assert.equal(last.page, 26, 'Combined provider/registry totals clamp an invalid jump to the last page')
assert.equal(last.total, 17)
assert.equal(last.records.length, 0, 'Provider-only tail pages avoid a pointless registry read')
assert.equal(calls.length, 0)
count = 35
const clamped = await getPage('quality','design-creative',9999,0,'all',[],null,'all','all',159960,16,1,1)
assert.equal(clamped.page, 3)
assert.deepEqual(calls.find(c=>c[0]==='range'),['range',31,46], 'Clamped registry pages recompute their offset after the provider prefix')
const server = readFileSync('app/skills/content.tsx', 'utf8')
assert.match(server, /const catalogMode = !featured/)
assert.match(server, /examplesOnly && !DIRECTORY_EXAMPLE_SKILL_SLUGS.includes/)
const client = readFileSync('components/skills-page-client.tsx', 'utf8')
assert.doesNotMatch(client, /DiscoveryTabs/)
assert.match(readFileSync('components/directory-filter-panel.tsx','utf8'), /data-discovery-filters/)
assert.match(client, /data-skill-examples/)
assert.match(readFileSync('app/render-query/[locale]/layout.tsx', 'utf8'), /export \{ default \} from '@\/app\/\[locale\]\/layout'/, 'Localized query rewrites inherit the SSR language provider')
assert.ok(existsSync('app/showcase/page.tsx') && existsSync('app/showcase/[slug]/page.tsx'), 'Indexed case routes remain available')
for (const item of [...DISCOVERY_TASKS, ...DISCOVERY_OUTPUTS, ...DISCOVERY_AGENTS]) {
  const root = item.href.split('/')[1]
  const route = existsSync(`app${item.href}/page.tsx`) || existsSync(`app/${root}/[slug]/page.tsx`)
  assert.ok(route, item.href)
  for (const locale of ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) assert.ok(item.label[locale].trim())
}
for (const locale of ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) {
  const copy = discoveryCopy(locale)
  assert.deepEqual(Object.keys(copy), Object.keys(discoveryCopy('en')))
  assert.ok(Object.values(copy).every(value => value.trim()))
}
console.log('Unified discovery: default directory, legacy filters, example SQL pagination, existing topic routes and eight languages passed.')

const many = Array.from({length:5000}, (_, i) => `author-long-skill-example-${i}`)
assert.ok(mediaSlugsNeedPost(many))
const batches = slugQueryBatches(many)
assert.deepEqual(batches.flat(), many)
assert.ok(batches.every(batch => encodeURIComponent(batch.join(',')).length <= 2400))
calls.length = 0
await getPage('quality','presentation',1,0,'all',[],many,'all','all')
assert.equal(calls.filter(call => call[0] === 'rpc').length, 2)
assert.ok(calls.filter(call => call[0] === 'rpc').every(call => call[1] === 'skill_directory_by_slugs' && call[2].p_slugs === many))
assert.ok(!calls.some(call => call[0] === 'in'), 'Large memberships never leak back into the URL')
assert.ok(calls.some(call => call[0] === 'range'), 'POST membership retains server pagination')
console.log('Large example catalogs: 5,000 identities use POST bodies, exact counts, SQL pagination and bounded lookup batches.')
