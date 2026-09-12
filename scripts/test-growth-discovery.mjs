import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import ts from 'typescript'
import { z } from 'zod'
import * as packed from '../lib/cache/packed-json.ts'
import * as showcase from '../lib/showcase.ts'
import * as tasks from '../lib/showcase-task.ts'
import * as discovery from '../lib/showcase-discovery.ts'
import * as indexPolicy from '../lib/seo/search-indexability.ts'
import * as useCases from '../lib/use-cases.ts'
import { locales } from '../lib/i18n/config.ts'
import * as searchResults from '../lib/search-results.ts'
import * as presentationCategory from '../lib/skills/presentation-category.ts'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
function compile(path, dependencies, clock = Date) {
  const output = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  new Function('exports', 'require', 'Date', output)(exports, name => {
    assert.ok(name in dependencies, `Missing test dependency: ${name}`)
    return dependencies[name]
  }, clock)
  return exports
}
const forbidden = () => { throw new Error('Unexpected network, execution or database access') }
const sourceEvidence = compile('lib/skills/source-evidence.ts', {})
const directory = compile('lib/skills/directory.ts', { './source-evidence': sourceEvidence })

const ok = value => ({ status: 'fulfilled', value })
const fail = { status: 'rejected', reason: new Error('timeout') }
assert.deepEqual(searchResults.collectSearchResults([fail, ok([{slug:'broad'}])], 10), { records: [{slug:'broad'}], degraded: true })
assert.deepEqual(searchResults.collectSearchResults([ok([{slug:'exact'}]), fail], 10), { records: [{slug:'exact'}], degraded: true })
assert.deepEqual(searchResults.collectSearchResults([ok([{slug:'exact'}]), ok([{slug:'exact'}, {slug:'other'}])], 10), { records: [{slug:'exact'}, {slug:'other'}], degraded: false })
assert.throws(() => searchResults.collectSearchResults([ok([]), fail], 10), /incomplete/)
assert.throws(() => searchResults.collectSearchResults([fail, fail], 10), /incomplete/)
assert.deepEqual(searchResults.collectSearchResults([ok([]), ok([])], 10), { records: [], degraded: false })
assert.ok(directory.directoryCategoryTerms('Coding Agents').includes('developer tools'))
assert.deepEqual(directory.directoryCategoryTerms('bad,or(x)'), ['bad'])
for (const item of showcase.SHOWCASE_CASES) {
  const card = showcase.getShowcaseCardData(item)
  assert.equal(card.slug, item.slug)
  assert.equal(card.media.length, 1)
  for (const field of ['prompt','productionNote','requirements','sourceRevision']) assert.ok(!(field in card), `Gallery card must not serialize ${field}`)
}
assert.ok(JSON.stringify(showcase.SHOWCASE_CASES.map(showcase.getShowcaseCardData)).length < JSON.stringify(showcase.SHOWCASE_CASES).length / 3)

for (const agent of tasks.SHOWCASE_AGENT_TARGETS) {
  assert.equal(tasks.normalizeShowcaseAgentTarget(agent), agent)
  const url = new URL(tasks.getShowcaseTaskUrl('example', 'zh', agent, true), 'https://www.openagentskill.com')
  assert.equal(url.searchParams.get('agent'), agent)
  assert.equal(url.searchParams.get('format'), 'markdown')
  assert.equal(url.searchParams.get('download'), '1')
}
const untrusted = '<img src=x onerror=alert(1)>&download=1#fragment'
assert.equal(tasks.normalizeShowcaseAgentTarget(untrusted), 'auto')
const encodedTaskUrl = tasks.getShowcaseTaskUrl('example/with?query', untrusted, untrusted)
assert.ok(!encodedTaskUrl.includes('<'))
assert.ok(!encodedTaskUrl.includes('>'))
const parsedTaskUrl = new URL(encodedTaskUrl, 'https://www.openagentskill.com')
assert.equal(parsedTaskUrl.pathname, '/api/agent/showcase/example%2Fwith%3Fquery')
assert.equal(parsedTaskUrl.searchParams.get('lang'), untrusted)
assert.equal(parsedTaskUrl.searchParams.get('agent'), 'auto')
assert.equal(parsedTaskUrl.searchParams.has('download'), false)
assert.equal(parsedTaskUrl.hash, '')

// Wide cached records retain all evidence; no field truncation to fit Next's limit.
const wide = Array.from({ length: 2200 }, (_, i) => ({ slug: `skill-${i}`, source_path: 'skills/演示/SKILL.md', ai_review_approved: false, risk: 'Requires manual review. '.repeat(60) }))
assert.ok(Buffer.byteLength(JSON.stringify(wide)) > 2_000_000)
const compressed = await packed.packCacheJson(wide)
assert.ok(Buffer.byteLength(compressed) < packed.PACKED_CACHE_MAX_BYTES)
assert.deepEqual(await packed.unpackCacheJson(compressed), wide)
await assert.rejects(packed.packCacheJson('x'.repeat(packed.PACKED_CACHE_MAX_RAW_BYTES)), /raw payload exceeds/)
await assert.rejects(packed.packCacheJson(randomBytes(1_600_000).toString('base64')), /packed payload exceeds/)
await assert.rejects(packed.unpackCacheJson('x'.repeat(packed.PACKED_CACHE_MAX_BYTES + 1)), /packed payload exceeds/)
await assert.rejects(packed.unpackCacheJson('not-gzip'))
await assert.rejects(packed.unpackCacheJson(gzipSync('x'.repeat(packed.PACKED_CACHE_MAX_RAW_BYTES + 1)).toString('base64')), /raw payload exceeds/)
await assert.rejects(packed.packCacheJson(undefined), /requires JSON/)

// Exercise the real directory and sitemap functions with a chainable read-only DB.
const item = (slug, extra = {}) => ({ slug, name: slug, description: 'Example', category: 'design', tags: [], frameworks: [], github_stars: 20, quality_score: 80, ai_review_approved: true, created_at: '2026-01-01', ...extra })
const live = [item('live', { ai_review_approved: false, listing_status: 'owner_published', ai_review_issues: ['License missing'] })]
const snapshot = [item('snapshot', { ai_review_approved: false })]
let now = Date.now(), failing = false, reads = 0
let rows = live
const operations = [], sharedWrites = []
class Clock extends Date { static now() { return now } }
const client = { from(table) {
  assert.equal(table, 'skills')
  const operationsForQuery = []
  operations.push(operationsForQuery)
  const query = {
    select(...args) { operationsForQuery.push(['select', ...args]); return query },
    or(...args) { operationsForQuery.push(['or', ...args]); return query },
    eq(...args) { operationsForQuery.push(['eq', ...args]); return query },
    gte(...args) { operationsForQuery.push(['gte', ...args]); return query },
    order(...args) { operationsForQuery.push(['order', ...args]); return query },
    range(...args) { operationsForQuery.push(['range', ...args]); return query },
    limit(...args) { operationsForQuery.push(['limit', ...args]); return query },
    then(resolve, reject) {
      reads++
      return Promise.resolve(failing ? { data: null, error: new Error('Simulated outage') } : { data: rows, count: rows.length, error: null }).then(resolve, reject)
    },
  }
  return query
} }
const db = compile('lib/db/skills.ts', {
  '@/lib/skills/publication': { PUBLIC_SKILL_FILTER: 'PUBLIC_TEST_GATE' },
  '@/lib/supabase/public': { createPublicClient: () => client },
  '@/lib/supabase/admin': { createAdminClient: () => client },
  '@/lib/async': { withTimeout: promise => promise },
  '@/lib/search-results': searchResults,
  '@/lib/skills/directory': directory,
  '@/lib/skills/presentation-category': presentationCategory,
  '@/lib/skills/registry-scope': { isMcpOnlyCategory: () => false, isMcpOnlySkillRecord: () => false },
  '@/lib/seo/curated-skill-snapshot': { CURATED_SKILL_SNAPSHOT: snapshot },
  '@/lib/search-query': {},
  '@/lib/cache/packed-json': packed,
  '@/lib/seo/search-indexability': indexPolicy,
  'next/cache': { unstable_cache: (fn, key) => async (...args) => {
    const value = await fn(...args) // A thrown refresh must never become a cached snapshot.
    sharedWrites.push({ key, value })
    return value
  } },
}, Clock)
const [first, concurrent] = await Promise.all([db.getSkillDirectory('stars', 'all', 20), db.getSkillDirectory('stars', undefined, 10)])
assert.equal(reads, 1, 'Concurrent reads share one directory fetch')
assert.deepEqual(first, { records: live, degraded: false, source: 'registry-cache' })
assert.deepEqual(concurrent.records, live)
assert.equal(typeof sharedWrites[0].value, 'string')
assert.deepEqual(await packed.unpackCacheJson(sharedWrites[0].value), live)
now += 31_000
failing = true
const warmFailure = await db.getSkillDirectory('stars', undefined, 20)
assert.equal(warmFailure.degraded, true)
assert.equal(warmFailure.source, 'last-good')
assert.deepEqual(warmFailure.records, live)
assert.equal(sharedWrites.length, 1, 'An outage does not persist fallback in the shared cache')
now += 16 * 60_000
const coldFailure = await db.getSkillDirectory('stars', 'all', 20)
assert.deepEqual(coldFailure, { records: snapshot, degraded: true, source: 'curated-snapshot' })
assert.equal(sharedWrites.length, 1)
now += 31_000
failing = false
const recovered = await db.getSkillDirectory('stars', undefined, 20)
assert.equal(recovered.degraded, false)
assert.deepEqual(await db.getAllSkills('stars', undefined, 20), live, 'Existing consumers retain their array contract')
assert.equal(live[0].ai_review_approved, false, 'Caching cannot change review state')
rows = []
assert.deepEqual((await db.getSkillDirectory('new', 'empty', 20)).records, [], 'A successful empty query is not replaced by a snapshot')

operations.length = 0
await db.getApprovedSkillSitemapCount(3, 50)
await db.getApprovedSkillSitemapRecords({ minStars: 3, minQualityScore: 50, limit: 10 })
assert.equal(operations.length, 2)
for (const query of operations) {
  assert.ok(query.some(op => op[0] === 'or' && op[1] === indexPolicy.buildSearchIndexFilter(3, 50)))
  assert.ok(!query.some(op => op[0] === 'gte' && op[1] === 'quality_score'), 'Editorial eligibility is separate from model scores')
}
assert.ok(indexPolicy.buildSearchIndexFilter().includes('and(ai_review_approved.eq.true,quality_score.gte.50,or(github_stars.gte.3,publisher_verified.eq.true),'))
const editorialEntries = JSON.parse(read('lib/seo/editorial-index.json'))
const redirects = await (await import('../next.config.mjs')).default.redirects()
for (const entry of editorialEntries) {
  for (const alias of entry.aliases) {
    assert.match(alias, /^[a-z0-9-]+$/)
    assert.equal(indexPolicy.isSearchIndexEligible(item(alias)), false, 'Redirecting aliases must not be in the sitemap')
    assert.ok(read('lib/skill-fallbacks.ts').includes(`'${alias}': '${entry.slug}'`))
    assert.ok(redirects.some(rule => rule.source === `/skills/${alias}` && rule.destination === `/skills/${entry.slug}` && rule.permanent), 'Canonical aliases redirect before streaming')
  }
  for (const field of ['slug', 'repository', 'path', 'license']) assert.match(entry[field], /^[\w./-]+$/, 'Filter values must not contain PostgREST operators')
  assert.match(entry.commit, /^[a-f0-9]{40}$/)
  assert.match(entry.hash, /^[a-f0-9]{64}$/)
  const candidate = item(entry.slug, { ai_review_approved: false, quality_score: 0, github_stars: 0, publisher_verified: false,
    github_repo: entry.repository, source_path: entry.path, source_commit_sha: entry.commit, source_content_hash: entry.hash,
    source_sync_status: 'current', license: entry.license, listing_status: 'owner_published' })
  assert.equal(indexPolicy.isSearchIndexEligible(candidate), true)
  for (const field of ['slug', 'github_repo', 'source_path', 'source_commit_sha', 'source_content_hash', 'source_sync_status', 'license', 'listing_status']) {
    assert.equal(indexPolicy.isSearchIndexEligible({ ...candidate, [field]: 'changed' }), false, `Changed ${field} must revoke editorial eligibility`)
    assert.equal(indexPolicy.isSearchIndexEligible({ ...candidate, [field]: undefined }), false)
  }
  assert.equal(candidate.ai_review_approved, false, 'Editorial discovery must never grant AI approval')
}
assert.equal(indexPolicy.SEARCH_INDEX_PUBLICATION_FILTER, 'ai_review_approved.eq.true')
assert.equal(indexPolicy.isSearchIndexEligible(item('approved')), true)
assert.equal(indexPolicy.isSearchIndexEligible(live[0]), false)
assert.equal(indexPolicy.isSearchIndexEligible(item('low-quality', { quality_score: 49, publisher_verified: true })), false)
assert.equal(indexPolicy.isSearchIndexEligible(item('claimed', { github_stars: 0, publisher_verified: true })), true)

const rag = { keywords: ['rag'], featuredSlugs: [] }
assert.equal(useCases.scoreSkillForUseCase(item('storage', { description: 'Storage backup', github_stars: 1_000_000, quality_score: 100, verified: true }), rag), 0)
assert.ok(useCases.scoreSkillForUseCase(item('retrieval', { description: 'A RAG workflow' }), rag) > 0)
assert.ok(useCases.scoreSkillForUseCase(item('featured'), { ...rag, featuredSlugs: ['featured'] }) > 90)
assert.ok(useCases.scoreSkillForUseCase(item('cn', { description: '产品视频制作' }), { keywords: ['视频'], featuredSlugs: [] }) > 0)
assert.equal(useCases.scoreSkillForUseCase(item('cpp', { description: 'C++' }), { keywords: ['C++'], featuredSlugs: [] }) > 0, true)

// Every existing Gallery entry is a reference, not a new publication or runtime claim.
assert.equal(showcase.SHOWCASE_CASES.length, 101)
const originalCatalog = JSON.stringify(showcase.SHOWCASE_CASES)
for (const example of showcase.SHOWCASE_CASES) {
  for (const locale of ['en', 'zh']) {
    const brief = tasks.buildShowcaseTaskPackage(example, locale, 'codex')
    const markdown = tasks.renderShowcaseTaskMarkdown(example, locale, 'codex')
    assert.equal(brief.status, 'reference_only')
    assert.equal(brief.task, showcase.localizeShowcase(example.prompt, locale))
    assert.equal(brief.evidence.preview_revision, example.sourceRevision)
    assert.match(brief.evidence.artwork_license_url, /^https:\/\//)
    assert.deepEqual(brief.permissions, { auto_execute: false, auto_install: false, external_side_effects: false })
    assert.ok(markdown.includes(showcase.getShowcaseHandoff(example, locale)))
    assert.ok(markdown.includes(brief.task))
    assert.ok(markdown.includes(brief.evidence.artwork_license_url))
    assert.equal(brief.checklist.length, 5)
  }
}
assert.equal(JSON.stringify(showcase.SHOWCASE_CASES), originalCatalog)
const video = discovery.searchShowcaseWorkflows({ category: 'video', limit: 8 })
assert.equal(video.total, 20)
assert.equal(video.items.length, 8)
const secondVideo = discovery.searchShowcaseWorkflows({ category: 'video', limit: 8, offset: video.next_offset })
assert.equal(new Set([...video.items, ...secondVideo.items].map(v => v.slug)).size, 16)
assert.equal(discovery.searchShowcaseWorkflows({ query: 'nonexistent-unique-workflow' }).total, 0)
assert.equal(discovery.searchShowcaseWorkflows({ limit: Infinity, offset: NaN }).items.length, 8)
assert.equal(discovery.getShowcaseTaskPackage('unknown'), null)
const listRoute = compile('app/api/agent/showcase/route.ts', { zod: { z }, '@/lib/showcase-discovery': discovery, '@/lib/i18n/config': { locales } })
const request = query => new Request('https://www.openagentskill.com/api/agent/showcase' + query)
for (const query of ['?limit=21', '?offset=-1', '?category=invalid', '?lang=xx', '?q=' + 'a'.repeat(201)]) {
  const result = listRoute.GET(request(query))
  assert.equal(result.status, 400)
  assert.equal(result.headers.get('cache-control'), 'no-store')
}
const listResponse = listRoute.GET(request('?category=video&limit=8'))
assert.equal(listResponse.status, 200)
assert.equal(listResponse.headers.get('x-robots-tag'), 'noindex')
assert.deepEqual(await listResponse.json(), video)
const detailRoute = compile('app/api/agent/showcase/[slug]/route.ts', { zod: { z }, '@/lib/showcase': showcase, '@/lib/showcase-task': tasks, '@/lib/i18n/config': { locales } })
const detail = (query = '', slug = video.items[0].slug) => detailRoute.GET(request(query), { params: Promise.resolve({ slug }) })
assert.equal((await detail('', 'unknown')).status, 404)
assert.equal((await detail('?agent=unknown')).status, 400)
assert.equal((await detail('?format=html')).status, 400)
const download = await detail('?agent=cursor&lang=zh&format=markdown&download=1')
assert.equal(download.status, 200)
assert.equal(download.headers.get('content-type'), 'text/markdown; charset=utf-8')
assert.match(download.headers.get('content-disposition'), /attachment; filename="[a-z0-9-]+-task.md"/)
assert.ok((await download.text()).includes('Cursor'))
assert.deepEqual(await (await detail()).json(), discovery.getShowcaseTaskPackage(video.items[0].slug))

const NextResponse = class extends Response { static json(value, options) { return Response.json(value, options) } }
const mcp = compile('app/api/mcp/route.ts', {
  'next/server': { NextResponse }, zod: { z },
  '@/lib/agent-resolve': { resolveAgentSkill: forbidden }, '@/lib/db/skills': { searchSkills: async () => live },
  '@/lib/registry': { buildInstallHandoff: forbidden }, '@/lib/skill-fallbacks': { getSkillBySlugOrFallbackStrict: async () => live[0] },
  '@/lib/ranking-snapshots': { getLatestRankingSnapshot: forbidden },
  '@/lib/showcase-discovery': discovery, '@/lib/showcase-task': tasks, '@/lib/i18n/config': { locales },
  '@/lib/skills/source-evidence': { getSkillSourceEvidence: () => ({ canOfferInstall: false }) },
  '@/lib/skills/review-evidence': { getReviewEvidence: () => ({ ai_reviewed: false }) },
})
const rpc = async (method, params) => (await mcp.POST(new Request('https://example.com/api/mcp', { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }))).json()
const toolNames = (await rpc('tools/list')).result.tools.map(t => t.name)
const manifest = compile('app/.well-known/mcp.json/route.ts', { 'next/server': { NextResponse } })
assert.deepEqual(toolNames, (await manifest.GET().json()).capabilities)
assert.equal((await rpc('tools/call', { name: 'find_workflows', arguments: { category: 'video' } })).result.structuredContent.total, 20)
assert.equal((await rpc('tools/call', { name: 'find_workflows', arguments: { limit: 100 } })).result.isError, true)
assert.equal((await rpc('tools/call', { name: 'get_workflow', arguments: { slug: video.items[0].slug } })).result.structuredContent.status, 'reference_only')
assert.equal((await rpc('tools/call', { name: 'get_workflow', arguments: { slug: 'unknown' } })).result.isError, true)
assert.equal((await rpc('tools/call', { name: 'get_skill', arguments: { slug: 'live' } })).result.structuredContent.install, null)
assert.equal((await rpc('tools/call', { name: 'search_skills', arguments: { query: 'live' } })).result.structuredContent.skills[0].install, null)
for (const name of ['find_workflows', 'get_workflow']) {
  const tool = (await rpc('tools/list')).result.tools.find(t => t.name === name)
  assert.equal(tool.annotations.readOnlyHint, true)
  assert.equal(tool.annotations.destructiveHint, false)
}
for (const path of ['app/openapi.json/route.ts', 'app/.well-known/agent-manifest.json/route.ts', 'app/llms.txt/route.ts', 'app/agent/page.tsx']) {
  assert.ok(read(path).includes('/api/agent/showcase'), `${path} advertises the real discovery route`)
}
console.log('Growth discovery passed: lossless bounded cache, outage/recovery, SEO predicates, relevance, 101 evidence-linked tasks, JSON/Markdown APIs, MCP contracts and no fabricated installs.')

failing = false
rows = live
const browse = await db.getBrowseSkillCandidates('stars', 'Research', 96, true, 20)
assert.deepEqual(browse.records, live)
const browseOps = operations.at(-1)
assert.ok(browseOps.some(op => op[0] === 'or' && op[1] === 'PUBLIC_TEST_GATE'))
assert.ok(browseOps.some(op => op[0] === 'or' && op[1].includes('source_path.ilike.*SKILL.md')))
assert.ok(browseOps.some(op => op[0] === 'or' && op[1].includes('rag knowledge')))
assert.ok(browseOps.findIndex(op => op[0] === 'gte') < browseOps.findIndex(op => op[0] === 'limit'))
const writesBeforeFailure = sharedWrites.length
failing = true
await assert.rejects(db.getBrowseSkillCandidates('stars', 'Research', 96, true, 20))
assert.deepEqual(await db.getCategories(), [])
assert.equal(sharedWrites.length, writesBeforeFailure, 'Failed category and filtered reads must not poison shared caches')
