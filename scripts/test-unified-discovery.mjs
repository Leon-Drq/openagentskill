import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { DISCOVERY_TASKS, DISCOVERY_OUTPUTS, DISCOVERY_AGENTS, discoveryCopy } from '../lib/discovery.ts'

import ts from 'typescript'
import { directoryDiscoveryFilters, catalogSortColumn } from '../lib/skills/catalog-query.ts'

assert.deepEqual(directoryDiscoveryFilters({}), { featured: false, examplesOnly: false }, 'Canonical directory defaults to all skills')
assert.deepEqual(directoryDiscoveryFilters({ view: 'all' }), { featured: false, examplesOnly: false })
assert.deepEqual(directoryDiscoveryFilters({ view: 'skills' }), { featured: true, examplesOnly: false }, 'Old featured bookmarks still work')
assert.deepEqual(directoryDiscoveryFilters({ view: 'skills', featured: 'false', examples: 'true' }), { featured: false, examplesOnly: true })
assert.deepEqual(directoryDiscoveryFilters({ featured: 'true', examples: 'true' }), { featured: true, examplesOnly: true })
assert.deepEqual(directoryDiscoveryFilters({ featured: 'garbage', examples: 'false' }), { featured: false, examplesOnly: false })

// Execute the actual cached SQL query with a fake public client: filters must
// intersect before exact counting and pagination, including empty selections.
const db = readFileSync('lib/db/skills.ts', 'utf8')
const part = db.slice(db.indexOf('const getCachedCatalogPage'), db.indexOf('export function getSkillCatalogPage'))
const code = ts.transpileModule(part, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const calls = []
const fakeQuery = { then: done => Promise.resolve({ data: [{ slug: 'example-skill' }], count: 17, error: null }).then(done) }
for (const method of ['select','or','in','not','gte','order','range']) fakeQuery[method] = (...args) => { calls.push([method, ...args]); return fakeQuery }
const getPage = new Function('unstable_cache','createPublicClient','SKILL_DIRECTORY_SELECT','PUBLIC_SKILL_FILTER','directoryCategoryTerms','CATALOG_PAGE_SIZE','catalogSortColumn','filterSkillOnly', code + ';return getCachedCatalogPage')(
  fn => fn, () => ({ from: name => { calls.push(['from', name]); return fakeQuery } }), 'slug', 'public gate', () => [], 16, catalogSortColumn, rows => rows,
)
const result = await getPage('quality', 'all', 2, 0, 'free', ['example-skill', 'other-skill'], ['example-skill'])
assert.equal(result.total, 17)
assert.equal(result.hasMore, false)
assert.deepEqual(calls.filter(call => call[0] === 'in'), [['in', 'slug', ['example-skill', 'other-skill']], ['in', 'slug', ['example-skill']]])
assert.ok(calls.findIndex(call => call[0] === 'in') < calls.findIndex(call => call[0] === 'range'))
assert.deepEqual(calls.find(call => call[0] === 'range'), ['range', 16, 31])
assert.ok(calls.some(call => call[0] === 'or' && call[1] === 'public gate'))
calls.length = 0
assert.deepEqual(await getPage('quality', 'all', 1, 0, 'all', [], []), { records: [], total: 0, hasMore: false })
assert.ok(!calls.some(call => call[0] === 'range'))
const server = readFileSync('app/skills/content.tsx', 'utf8')
assert.match(server, /const catalogMode = !featured/)
assert.match(server, /examplesOnly && !SHOWCASE_SKILL_SLUGS.includes/)
const client = readFileSync('components/skills-page-client.tsx', 'utf8')
assert.doesNotMatch(client, /DiscoveryTabs/)
assert.match(client, /data-discovery-filters/)
assert.match(client, /data-skill-examples/)
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
