import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { publicSavedRow, usableSavedDirectory } from '../lib/skills/saved-directory-format.ts'
import { createResilientTimeoutFetch } from '../lib/supabase/resilient-fetch.ts'

function compile(file, dependencies) {
  const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  new Function('exports', 'require', output)(exports, name => { assert.ok(name in dependencies, `Missing ${name}`); return dependencies[name] })
  return exports
}
const snapshot = JSON.parse(readFileSync('data/public-directory-saved.json', 'utf8'))
assert.ok(snapshot.rows.length > 0 && snapshot.rows.length <= 1920)
assert.equal(snapshot.coverage, 'partial')
for (const row of snapshot.rows) {
  assert.deepEqual(publicSavedRow(row), row, 'Snapshot must contain only allowlisted public fields')
  for (const key of ['author_email', 'submitted_by_agent', 'owner_publication', 'product_metadata', 'long_description', 'ai_review_score']) assert.ok(!(key in row))
}
const fixture = { ...snapshot.rows[0], author_email: 'private@example.test', owner_publication: { token: 'private' }, submitted_by_agent: 'private', long_description: 'private' }
const sanitized = publicSavedRow(fixture)
assert.ok(sanitized && !('author_email' in sanitized) && !('owner_publication' in sanitized))
assert.equal(publicSavedRow({ ...fixture, ai_review_approved: false, listing_status: 'rejected' }), null)
assert.equal(publicSavedRow({ ...fixture, id: 'snapshot-invented' }), null)
assert.equal(publicSavedRow({ ...fixture, created_at: 'not-a-date' }), null)
const owner = publicSavedRow({ ...fixture, ai_review_approved: false, listing_status: 'owner_published' })
assert.equal(owner.ai_review_approved, false, 'Backing up an owner listing must not confer approval')
const savedNow = Date.parse(snapshot.savedThrough) + 1000
assert.ok(usableSavedDirectory(snapshot, savedNow))
assert.equal(usableSavedDirectory(snapshot, Date.parse(snapshot.savedFrom) + 31 * 86_400_000), false)
assert.equal(usableSavedDirectory({ ...snapshot, coverage: 'complete' }, savedNow), false)
assert.equal(usableSavedDirectory({ ...snapshot, rows: [] }, savedNow), false)

// Model a successful-only shared cache and a cold network failure.
let failed = true, cacheWrites = 0, savedWrites = 0, reads = 0, fallbackCalls = 0
const store = new Map()
const fakeRanking = { slug: 'new', kind: 'new-this-week' }
const candidate = { ...snapshot.rows[0], created_at: new Date().toISOString() }
const dependencies = {
  'server-only': {},
  'next/cache': { unstable_cache: (fn, keys) => async (...args) => {
    const key = JSON.stringify([keys, args])
    if (store.has(key)) return store.get(key)
    const result = await fn(...args)
    if (keys[0] === 'saved-ranking-selection-v1') savedWrites++; else cacheWrites++
    store.set(key, result); return result
  } },
  '@/lib/db/skills': { getSkillDirectory: async () => { reads++; if (failed) throw new Error('402'); return { records: [candidate], degraded: false } }, getAgentOutcomeStatsMapStrict: async () => { throw new Error('outcomes unavailable') } },
  '@/lib/rankings': { getRankingDefinition: slug => ({ ...fakeRanking, kind: slug === 'outcomes' ? 'agent-usage' : fakeRanking.kind }), rankSkillsForDefinition: rows => rows.map(skill => ({ skill })) },
  '@/lib/ranking-landing': { rankingCandidates: rows => rows },
  '@/lib/skills/directory': { isDirectorySnapshot: () => false },
  '@/lib/data-maintenance': { isDataPaused: () => process.env.SUPABASE_DATA_PAUSED === '1' },
  '@/lib/skills/saved-directory': { getSavedDirectoryInfo: () => ({ savedFrom: snapshot.savedFrom, savedThrough: snapshot.savedThrough }), getSavedDirectory: () => { fallbackCalls++; return { records: [candidate], savedFrom: snapshot.savedFrom, savedThrough: snapshot.savedThrough } } },
}
const loader = compile('lib/ranking-landing-data.ts', dependencies)
const fallback = await loader.getRankingLanding('new')
assert.equal(fallback.source, 'saved-directory'); assert.equal(fallback.savedThrough, snapshot.savedThrough)
assert.equal(cacheWrites, 0, 'Failure and fallback are never cached as a fresh list')
assert.equal(savedWrites, 1, 'A labelled snapshot may use a separate projection cache')
const beforeOutcomes = fallbackCalls
assert.equal((await loader.getRankingLanding('outcomes')).source, 'unavailable')
assert.equal(fallbackCalls, beforeOutcomes, 'Never synthesize outcome/safety evidence from a metadata backup')
failed = false
assert.equal((await loader.getRankingLanding('new')).source, 'directory')
assert.equal(cacheWrites, 1)
const readCount = reads
assert.equal((await loader.getRankingLanding('new')).source, 'directory')
assert.equal(reads, readCount, 'Successful rankings reuse shared cache')

const originalFetch = globalThis.fetch, originalNow = Date.now, paused = process.env.SUPABASE_DATA_PAUSED
try {
  process.env.SUPABASE_DATA_PAUSED = '1'
  assert.equal((await loader.getRankingLanding('new')).source, 'saved-directory')
  assert.equal((await loader.getRankingLanding('outcomes')).source, 'unavailable')
  assert.equal(reads, readCount, 'Pause bypasses live ranking and outcome caches even when a healthy cache exists')
  delete process.env.SUPABASE_DATA_PAUSED
  globalThis.__openagentskillSupabaseCircuits = undefined
  globalThis.__openagentskillSupabaseQuotas = undefined
  let now = originalNow(), calls = 0, recover = false, release
  Date.now = () => now
  globalThis.fetch = async () => {
    calls++
    if (recover) await new Promise(resolve => { release = resolve })
    return new Response(recover ? '[]' : '{"message":"exceed_egress_quota"}', { status: recover ? 200 : 402 })
  }
  const url = 'https://project.supabase.co/rest/v1/skills'
  assert.equal((await createResilientTimeoutFetch(100, 'public-catalog')(url)).status, 402)
  for (const scope of ['skill-search', 'skill-lookup', 'sitemap', 'admin', 'telemetry']) await assert.rejects(createResilientTimeoutFetch(100, scope)(url), /egress quota/)
  assert.equal(calls, 1, 'Quota failures stop requests across workload scopes')
  // Auth and another project are independent of this Data API quota.
  await createResilientTimeoutFetch(100, 'skill-support')('https://project.supabase.co/auth/v1/user')
  await createResilientTimeoutFetch(100, 'public-read')('https://other.supabase.co/rest/v1/skills')
  now += 10 * 60_000 + 1; recover = true
  const probe = createResilientTimeoutFetch(1000, 'skill-lookup')(url)
  await assert.rejects(createResilientTimeoutFetch(1000, 'skill-search')(url), /quota recovery probe/)
  release(); assert.equal((await probe).status, 200)
  const after = createResilientTimeoutFetch(1000, 'skill-search')(url)
  release(); assert.equal((await after).status, 200)
  process.env.SUPABASE_DATA_PAUSED = '1'
  const beforePaused = calls
  await assert.rejects(createResilientTimeoutFetch(100)(url), /paused/)
  await assert.rejects(createResilientTimeoutFetch(100, 'admin')(url, { method: 'POST', body: '{}' }), /paused/)
  assert.equal(calls, beforePaused, 'Manual pause prevents database reads and writes without bypassing restrictions')
} finally {
  globalThis.fetch = originalFetch; Date.now = originalNow
  globalThis.__openagentskillSupabaseCircuits = undefined
  globalThis.__openagentskillSupabaseQuotas = undefined
  if (paused === undefined) delete process.env.SUPABASE_DATA_PAUSED; else process.env.SUPABASE_DATA_PAUSED = paused
}
console.log('Quota fallback: public-field allowlist, dates, expiry, truthful approval/coverage, failure-safe cache, project-wide cooldown, recovery probe and pause passed.')
