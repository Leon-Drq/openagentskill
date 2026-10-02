import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { createClient } from '@supabase/supabase-js'
import { createResilientTimeoutFetch } from '../lib/supabase/resilient-fetch.ts'
import { createCoalescedCache } from '../lib/cache/coalesced.ts'

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
function compile(path, dependencies) {
  const output = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  new Function('exports', 'require', output)(exports, name => {
    assert.ok(name in dependencies, `Missing dependency: ${name}`)
    return dependencies[name]
  })
  return exports
}
const originalFetch = globalThis.fetch
const originalKey = process.env.SUPABASE_SECRET_KEY
try {
  let calls = 0
  globalThis.__openagentskillSupabaseCircuits = undefined
  globalThis.fetch = async () => { calls++; return new Response('unavailable', { status: 503 }) }
  const publicClient = compile('lib/supabase/public.ts', {
    '@supabase/supabase-js': { createClient }, '@/lib/supabase/resilient-fetch': { createResilientTimeoutFetch },
  }).createPublicClient
  const adminClient = compile('lib/supabase/admin.ts', {
    'server-only': {}, '@supabase/supabase-js': { createClient }, '@/lib/supabase/resilient-fetch': { createResilientTimeoutFetch },
  }).createAdminClient
  process.env.SUPABASE_SECRET_KEY = 'test-only-key'
  for (const client of [publicClient(), publicClient({requestTimeoutMs: 100}), adminClient({requestTimeoutMs: 100})]) {
    const before = calls
    const response = await client.from('skills').select('slug')
    assert.ok(response.error)
    assert.equal(calls - before, 1, 'One logical failed query must issue one upstream request, without SDK backoff/retries')
  }
  globalThis.__openagentskillSupabaseCircuits = undefined
  globalThis.fetch = async (_url, init) => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('["unfinished'))
      init.signal.addEventListener('abort', () => controller.error(init.signal.reason), {once:true})
    },
  }))
  await assert.rejects(createResilientTimeoutFetch(10, 'skill-support')('https://example.test'), /abort/i,
    'Receiving headers must not clear the deadline for a stalled response body')
  globalThis.fetch = async () => new Response('["complete"]', {headers:{'content-type':'application/json'}})
  assert.deepEqual(await (await createResilientTimeoutFetch(100)('https://example.test')).json(), ['complete'])
  const originalTimer = globalThis.setTimeout
  let defaultDeadline
  try {
    globalThis.setTimeout = (fn, ms, ...args) => {
      defaultDeadline = ms
      return originalTimer(fn, 10, ...args)
    }
    globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason), {once:true})
    })
    const result = await publicClient().from('skills').select('slug')
    assert.ok(result.error, 'A default client must abort stalled public reads')
    assert.equal(defaultDeadline, 8000, 'Legacy callers receive the default eight-second budget')
  } finally { globalThis.setTimeout = originalTimer }
  globalThis.fetch = async () => new Response(null, {status:204})
  assert.equal((await createResilientTimeoutFetch(100)('https://example.test')).status, 204)
} finally {
  globalThis.fetch = originalFetch
  globalThis.__openagentskillSupabaseCircuits = undefined
  if (originalKey === undefined) delete process.env.SUPABASE_SECRET_KEY
  else process.env.SUPABASE_SECRET_KEY = originalKey
}

let active = 0, maxActive = 0, reads = 0, failBatch = false, cacheWrites = 0
const batches = []
const fakeClient = { from(table) {
  assert.equal(table, 'skill_audits')
  let slugs, signal, limit
  const query = {
    select() { return query },
    in(column, values) { assert.equal(column,'skill_slug'); slugs = values; return query },
    limit(value) { limit = value; return query },
    abortSignal(value) { signal = value; return query },
    async then(resolve, reject) {
      reads++; active++; maxActive = Math.max(maxActive,active)
      assert.ok(slugs.length <= 80); assert.equal(limit,slugs.length); assert.ok(signal instanceof AbortSignal)
      batches.push(slugs)
      await new Promise(r => setTimeout(r,1))
      active--
      return Promise.resolve(failBatch ? {error:new Error('Batch failed'),data:null} : {error:null,data:slugs.map(skill_slug => ({skill_slug,audit_score:74}))}).then(resolve,reject)
    },
  }
  return query
} }
const dbSource = read('lib/db/skills.ts')
const dependencyNames = [...dbSource.matchAll(/from '([^']+)'/g)].map(m => m[1])
const dependencies = Object.fromEntries(dependencyNames.map(name => [name,{}]))
Object.assign(dependencies, {
  '@/lib/cache/coalesced': {createCoalescedCache},
  '@/lib/supabase/public': {createPublicClient: options => {assert.equal(options.circuitScope,'skill-support'); return fakeClient}},
  'next/cache': {unstable_cache: fn => async (...args) => {const value = await fn(...args); cacheWrites++; return value}},
})
const db = compile('lib/db/skills.ts', dependencies)
const slugs = Array.from({length:170},(_,i)=>`skill-${i}`)
const [a,b] = await Promise.all([db.getSkillAuditsMap(slugs),db.getSkillAuditsMap([...slugs].reverse())])
assert.deepEqual(a,b); assert.equal(Object.keys(a).length,170)
assert.equal(reads,3,'Concurrent equivalent shortlists share one set of batches')
assert.equal(maxActive,2); assert.equal(cacheWrites,1)
assert.deepEqual(new Set(batches.flat()),new Set(slugs))
const before = reads
assert.deepEqual(await db.getSkillAuditsMap([]),{})
assert.equal(reads,before,'An empty shortlist must never start a full-table query')
failBatch = true
await assert.rejects(db.getSkillAuditsMap(['new-shortlist']),/Batch failed/)
assert.equal(cacheWrites,1,'A failed batch must not cache a partial audit map')
failBatch = false
assert.equal(Object.keys(await db.getSkillAuditsMap(['new-shortlist'])).length,1,'Failed reads can recover')
await assert.rejects(db.getSkillAuditsMap(Array.from({length:1201},(_,i)=>`too-many-${i}`)),/query budget/)
console.log('System data reliability: SDK retries disabled, body deadlines, bounded audit batches, concurrency, coalescing, failure recovery and no partial cache passed.')
