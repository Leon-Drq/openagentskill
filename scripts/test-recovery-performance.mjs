import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as packed from '../lib/cache/packed-json.ts'
import * as coalesced from '../lib/cache/coalesced.ts'
import * as searchQuery from '../lib/search-query.ts'
import * as searchResults from '../lib/search-results.ts'
import { withTimeout } from '../lib/async.ts'
import { scheduleSourceSync } from '../lib/indexer/source-sync-scheduler.ts'

function compile(path, deps) {
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const exports = {}
  new Function('exports', 'require', code)(exports, name => { assert.ok(name in deps, name); return deps[name] })
  return exports
}
const source = (name, kind = name) => ({ sourceUrl: `https://github.com/owner/${name}`, discoverySource: kind })
const queues = { requested: [], claimed: ['c1', 'c2', 'c3', 'c4'].map(x => source(x)), stale: ['s1', 's2', 's3'].map(x => source(x)), seeds: ['d1', 'd2', 'd3', 'd4', 'd5'].map(x => source(x)), limit: 8, now: 0 }
const scheduled = scheduleSourceSync(queues).map(x => x.discoverySource)
assert.deepEqual(scheduled.slice(0, 6), ['c1', 's1', 'd1', 'c2', 's2', 'd2'], 'Existing repositories must get a share even when claims and seeds fill the budget')
assert.equal(scheduled.length, 8)
const manual = { ...source('c1', 'manual'), sourceUrl: 'https://github.com/OWNER/C1/' }
assert.equal(scheduleSourceSync({ ...queues, requested: [manual], limit: 1 })[0], manual, 'Explicit requests retain priority')
assert.equal(scheduleSourceSync({ ...queues, requested: [manual] }).filter(x => x.sourceUrl.toLowerCase().replace(/\/$/, '').endsWith('/c1')).length, 1)
assert.equal(scheduleSourceSync({ ...queues, claimed: [], stale: [], now: 6 * 3600000, limit: 1 })[0].discoverySource, 'd2', 'Seeds rotate rather than repeatedly consuming the same slot')
assert.deepEqual(scheduleSourceSync({ ...queues, claimed: [], stale: [], seeds: [], limit: 2 }), [])

function searchFixture() {
  const calls = { slug: 0, name: 0, rpc: 0, fallback: 0 }
  let nameFailed = true, rpcError = null
  const row = slug => ({ slug, name: slug, ai_review_approved: true, category: 'development' })
  function query(kind = 'fallback') {
    const q = {
      select() { return q }, or() { return q }, order() { return q }, limit() { return q },
      eq() { kind = 'slug'; return q }, ilike() { kind = 'name'; return q }, textSearch() { kind = 'fallback'; return q },
      then(resolve, reject) {
        calls[kind]++
        const error = kind === 'name' && nameFailed ? { code: '57014', message: 'timeout' } : kind === 'rpc' ? rpcError : null
        return Promise.resolve({ error, data: error ? null : kind === 'name' ? [] : [row(kind === 'slug' ? 'alpha' : 'broad')] }).then(resolve, reject)
      },
    }
    return q
  }
  const client = { from: () => query(), rpc: name => query(name === 'lookup_public_skill_name' ? 'name' : 'rpc') }
  const names = [...readFileSync(new URL('../lib/db/skills.ts', import.meta.url), 'utf8').matchAll(/from '([^']+)'/g)].map(x => x[1])
  const deps = Object.fromEntries(names.map(x => [x, {}]))
  Object.assign(deps, {
    '@/lib/supabase/public': { createPublicClient: () => client }, '@/lib/skills/publication': { PUBLIC_SKILL_FILTER: 'ai_review_approved.eq.true' },
    '@/lib/skills/registry-scope': { isMcpOnlySkillRecord: () => false }, '@/lib/async': { withTimeout },
    '@/lib/search-query': searchQuery, '@/lib/search-results': searchResults, '@/lib/cache/packed-json': packed, '@/lib/cache/coalesced': coalesced,
    'next/cache': { unstable_cache: (fn, keys) => {
      const cache = new Map()
      return async (...args) => {
        const key = JSON.stringify([keys, args])
        if (cache.has(key)) return cache.get(key)
        const result = await fn(...args); cache.set(key, result); return result
      }
    } },
  })
  return { db: compile('lib/db/skills.ts', deps), calls, recoverName: () => { nameFailed = false }, errorRpc: error => { rpcError = error } }
}
const f = searchFixture()
const partial = await f.db.searchSkillsWithStatus('alpha')
assert.deepEqual(partial.records.map(x => x.slug), ['alpha', 'broad'])
assert.equal(partial.degraded, true, 'A failed exact-name sibling must remain visible as degraded')
await f.db.searchSkillsWithStatus('alpha')
assert.deepEqual(f.calls, { slug: 1, name: 2, rpc: 1, fallback: 0 }, 'Successful shared reads survive while failed reads retry')
f.recoverName()
assert.equal((await f.db.searchSkillsWithStatus('alpha')).degraded, false)
await f.db.searchSkillsWithStatus('alpha')
assert.deepEqual(f.calls, { slug: 1, name: 3, rpc: 1, fallback: 0 }, 'Healthy searches reuse their complete result')
const timeout = searchFixture(); timeout.recoverName(); timeout.errorRpc({ code: '57014', message: 'timeout' })
assert.equal((await timeout.db.searchSkillsWithStatus('alpha')).degraded, true)
assert.equal(timeout.calls.fallback, 0, 'Timeouts must not replay the expensive legacy search')
const oldDb = searchFixture(); oldDb.recoverName(); oldDb.errorRpc({ code: 'PGRST202', message: 'function missing' })
assert.equal((await oldDb.db.searchSkillsWithStatus('alpha')).degraded, false)
assert.equal(oldDb.calls.fallback, 1, 'An older schema retains a bounded compatibility path')
assert.equal(searchQuery.normalizeExactSearchQuery('*%_'), '')
assert.deepEqual(await f.db.searchSkillsWithStatus('*%_'), { records: [], degraded: false })

// Aggregate cache excludes cookies, user IDs and personal votes. Mutation
// invalidation immediately refreshes aggregates; failures cannot cache a zero.
let user = 'one', aggregateReads = 0, failCounts = false, personalReads = 0
const aggregateCache = new Map()
const catalog = [{ slug: 'example' }]
const route = compile('app/api/showcase/engagement/route.ts', {
  'next/server': { NextResponse: { json: (body, init) => ({ body, ...init }) } },
  '@/lib/showcase': { SHOWCASE_CASES: catalog, getShowcaseCase: slug => catalog.find(x => x.slug === slug) },
  '@/lib/supabase/server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: user } } }) }, from: () => ({ select() { return this }, eq: async () => { personalReads++; return { data: [{ case_slug: 'example', vote: user === 'one' ? 1 : -1 }] } } }), rpc: async () => ({ error: null }) }) },
  '@/lib/supabase/admin': { createAdminClient: () => ({ rpc: async () => { aggregateReads++; return { error: failCounts ? Error('offline') : null, data: [{ case_slug: 'example', likes: aggregateReads, dislikes: 0 }] } }, from: () => ({ upsert: async () => ({ error: null }) }) }) },
  'next/cache': { unstable_cache: fn => async () => { if (aggregateCache.has('totals')) return aggregateCache.get('totals'); const value = await fn(); aggregateCache.set('totals', value); return value }, revalidateTag: () => aggregateCache.clear() },
})
const one = await route.GET(); user = 'two'; const two = await route.GET()
assert.equal(one.body.stats.example.vote, 1); assert.equal(two.body.stats.example.vote, -1)
assert.equal(aggregateReads, 1); assert.equal(personalReads, 2)
assert.equal(two.headers['Cache-Control'], 'private, no-store')
const put = await route.PUT({ headers: new Headers({ origin: 'https://example.test', 'content-type': 'application/json' }), nextUrl: new URL('https://example.test/api/showcase/engagement'), text: async () => JSON.stringify({ slug: 'example', vote: 1 }) })
assert.equal(put.status, 200)
await route.GET(); assert.equal(aggregateReads, 3, 'A write reads one fresh case and expires the shared aggregate')
aggregateCache.clear(); failCounts = true
assert.equal((await route.GET()).status, 503); assert.equal(aggregateCache.size, 0)
failCounts = false; assert.equal((await route.GET()).status, 200)
console.log('Recovery performance: fair source scheduling, seed rotation, indexed RPC, independent exact caches, degraded recovery, no timeout replay, private vote isolation and aggregate invalidation passed.')

// Security/performance contracts of the final DB API: the caller must not be
// able to widen the projection or turn the definer into arbitrary SQL access.
const files = (await import('node:fs')).readdirSync(new URL('../supabase/migrations/', import.meta.url))
const projectedFields = [...readFileSync(new URL('../lib/db/skills.ts', import.meta.url), 'utf8').split('const SKILL_DIRECTORY_SELECT = [')[1].split('].join')[0].matchAll(/'([^']+)'/g)].map(x => x[1])
for (const suffix of ['public_search_rls_index_plan.sql', 'public_exact_name_lookup.sql']) {
  const migration = readFileSync(new URL('../supabase/migrations/' + files.find(x => x.endsWith(suffix)), import.meta.url), 'utf8')
  const returned = migration.split('returns table (')[1].split(')\nlanguage')[0].trim().split(/,\n/).map(line => line.trim().split(' ')[0])
  assert.deepEqual(returned, projectedFields, 'RPC has precisely the public directory projection')
  assert.match(migration, /stable security definer/)
  assert.match(migration, /set search_path = ''/)
  assert.match(migration, /set statement_timeout = '3s'/)
  assert.match(migration, /revoke all on function[\s\S]*from public/)
  assert.match(migration, /s\.ai_review_approved=true or s\.listing_status in \('owner_published','static_checked'\)/)
  assert.doesNotMatch(migration, /select\s+s\.\*|returns setof public\.skills|execute\s+format\(/i)
  if (suffix.startsWith('public_search_rls')) {
    assert.match(migration, /force_custom_plan/)
    assert.match(migration, /left\(p_query,512\)/)
    assert.match(migration, /least\(200,greatest\(1/)
  } else {
    assert.match(migration, /lower\(s\.name\)=lower\(left\(trim\(p_name\),180\)\)/)
    assert.match(migration, /limit 8/)
  }
}
console.log('Public search SQL contracts: exact projection, fixed publication gate, read-only definer, bound input, empty search path and result/statement caps passed.')
