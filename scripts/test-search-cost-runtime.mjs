import assert from 'node:assert/strict'
import { mergeSearchTermResults } from '../lib/search-query.ts'
import { searchCostGuard, isExpensiveDirectoryRequest } from '../cloudflare/search-cost-guard.mjs'
import ts from 'typescript'
import { readFileSync } from 'node:fs'

// Compare bounded term unions against the full OR relation, including nulls,
// overlaps, ties and different requested limits. This guards retrieval recall.
const rows = Array.from({ length: 800 }, (_, i) => ({ slug: `skill-${String(i).padStart(4, '0')}`, quality_score: i % 17 === 0 ? null : i % 101 }))
const pools = [rows.filter((_, i) => i % 2 === 0), rows.filter((_, i) => i % 3 === 0), rows.filter((_, i) => i % 7 === 0)]
for (const limit of [1, 16, 120, 200]) {
  assert.deepEqual(mergeSearchTermResults(pools.map(pool => mergeSearchTermResults([pool], 200)), limit), mergeSearchTermResults(pools, limit))
}

// Only profiles actually consumed by a card/filter execute analysis, and
// multiple profile fields on a card reuse the same source computation.
let computations = 0
const deps = {
  '@/lib/bounded-content-memo': { createBoundedContentMemo: () => (_inputs, read) => read() },
  '@/lib/quality': { getSkillQualityProfile: () => { computations++; return { score: 1 } }, getPlatformHints: () => ['Codex'] },
  '@/lib/trust': { getSkillTrustProfile: () => ({ score: 2 }) },
  '@/lib/audits': { buildSkillAudit: () => ({}) }, '@/lib/agent-safety': { getAgentSafetyProfile: () => ({ blocked: false }) },
  '@/lib/supply': { getSkillSupplyProfile: () => ({ track: { slug: 'test' } }) },
}
const mod = {}
new Function('exports', 'require', ts.transpileModule(readFileSync('lib/skills/directory-profiles.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText)(mod, name => { assert.ok(name in deps, name); return deps[name] })
const candidates = rows.map(record => mod.withLazyDirectoryProfiles({ record }, record, null))
assert.equal(computations, 0)
for (const item of candidates.slice(0, 16)) {
  assert.equal(item.qualityProfile.score, 1); assert.equal(item.trustProfile.score, 2)
  assert.equal(item.safetyProfile.blocked, false); assert.equal(item.supplyProfile.track.slug, 'test')
}
assert.equal(computations, 16)
assert.equal(candidates[300].safetyProfile.blocked, false)
assert.equal(computations, 17, 'A requested safety filter still evaluates the actual source')

let limiterCalls = 0, allowed = true, failure = false
const keys = []
const env = { SEARCH_COST_GUARD: '1', DIRECTORY_SEARCH_LIMITER: { limit: async ({ key }) => {
  limiterCalls++; keys.push(key); if (failure) throw Error('Unavailable'); return { success: allowed }
} } }
const request = (path, options = {}) => new Request('https://www.openagentskill.com' + path, { headers: { 'cf-connecting-ip': '192.0.2.10' }, ...options })
for (const path of ['/skills', '/zh/skills?category=design-creative&page=2', '/best/presentation-generation', '/skills/example', '/api/payments/webhook', '/api/agent/skills?q=code', '/profile']) {
  assert.equal(isExpensiveDirectoryRequest(request(path)), false)
  assert.equal(await searchCostGuard(request(path), env), null)
}
assert.equal(limiterCalls, 0)
for (const locale of ['', '/zh', '/ja', '/ko', '/es', '/de', '/fr', '/id']) {
  assert.equal(await searchCostGuard(request(`${locale}/skills?q=design`), env), null)
}
assert.equal(new Set(keys).size, 1, 'Changing locale or query cannot reset the same source counter')
assert.ok(!keys[0].includes('192.0.2.10'))
allowed = false
const denied = await searchCostGuard(request('/skills?category=design-creative&access=free'), env)
assert.equal(denied.status, 429); assert.equal(denied.headers.get('retry-after'), '60')
assert.equal(denied.headers.get('cache-control'), 'private, no-store')
assert.equal(await (await searchCostGuard(request('/skills?q=design', { method: 'HEAD' }), env)).text(), '')
failure = true
const states = []
assert.equal(await searchCostGuard(request('/skills?q=design'), env, state => states.push(state)), null, 'Limiter outage preserves availability')
assert.deepEqual(states, ['unavailable'], 'A failed production binding must be observable')
assert.equal(await searchCostGuard(request('/skills?q=design'), { ...env, SEARCH_COST_GUARD: '0' }), null)
assert.equal(await searchCostGuard(new Request('https://www.openagentskill.com/skills?q=design'), env), null)
console.log('Search cost: OR top-N equivalence, lazy source analysis, scoped rate limits, retry and failure recovery passed.')
