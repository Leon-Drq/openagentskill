import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function compile(file, deps) {
  const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  new Function('exports', 'require', output)(exports, name => {
    assert.ok(name in deps, `${file}: ${name}`)
    return deps[name]
  })
  return exports
}

// Use the actual adapter wrapper: a poisoned build seed must miss for both
// the interceptor and the Next renderer. Healthy entries are exact passthrough.
const entries = new Map(), calls = []
const base = { name: 'cf-r2-incremental-cache',
  async get(key, type) { calls.push(['get', key, type]); return entries.get(key) || null },
  async set(key, value, type) { calls.push(['set', key, type]); entries.set(key, { value, lastModified: 1000 }) },
  async delete(key) { entries.delete(key) },
}
const { withHomeCacheGuard } = compile('cloudflare/home-incremental-cache.ts', {
  '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache': { default: base },
})
const guard = withHomeCacheGuard(base)
const bad = { type: 'app', html: '<template data-oas-home-cache="fallback"></template>', rsc: 'empty build' }
const good = { type: 'app', html: '<template data-oas-home-cache="ready"></template>Leaderboard', rsc: 'healthy ranking', revalidate: 14400 }
for (const locale of ['', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) {
  const key = `/${locale}`
  entries.set(key, { value: bad, lastModified: Date.now() })
  assert.equal(await guard.get(key, 'cache'), null, 'Fresh upload time cannot validate a build fallback')
  await guard.set(key, good, 'cache')
  const healthy = await guard.get(key, 'cache')
  assert.equal(healthy.value, good)
  const writes = calls.filter(c => c[0] === 'set').length
  await guard.set(key, bad, 'cache')
  assert.equal(calls.filter(c => c[0] === 'set').length, writes, 'No R2 write for an incomplete refresh')
  assert.equal(await guard.get(key, 'cache'), healthy, 'Last-good HTML and Flight survive')
}
for (const value of [{ type: 'app', html: '<html>Other page</html>' }, { data: { body: 'null' } }, { type: 'route', body: '{}' }]) {
  await guard.set('unrelated', value, 'fetch')
  assert.equal((await guard.get('unrelated', 'fetch')).value, value)
}
await guard.delete('unrelated')
assert.equal(await guard.get('unrelated', 'fetch'), null)

let snapshot = null, snapshotReads = 0, landingReads = 0, paused = false
const skill = { slug: 'real-skill', name: 'Real Skill', description: 'Published skill', github_stars: 42,
  category: 'developer-tools', repository: 'https://github.com/owner/real-skill', author_name: 'owner' }
let landing = { source: 'directory', items: [{ skill, badge: '42 stars', reason: 'Actual ranking' }] }
const home = compile('lib/home-page-data.ts', {
  'next/cache': { unstable_cache: fn => fn },
  '@/lib/registry-stats': { getApprovedRegistrySkillCount: async () => ({ exact: true, count: 10 }) },
  '@/lib/db/skills': { getAgentOutcomeStatsMapStrict: async () => ({}) },
  '@/lib/registry-coverage': { getRegistryCoverageStats: async () => null },
  '@/lib/data-maintenance': { isDataPaused: () => paused },
  '@/lib/github-owner': { getGitHubOwner: () => 'owner' },
  '@/lib/ranking-snapshots': { getLatestRankingSnapshot: async slug => {
    assert.equal(slug, 'most-starred-agent-skills', 'Never substitute trending under a most-starred heading')
    snapshotReads++; return snapshot
  } },
  '@/lib/ranking-landing-data': { getRankingLanding: async slug => {
    assert.equal(slug, 'most-starred-agent-skills'); landingReads++; return landing
  } },
})
const fresh = await home.getHomePageData()
assert.equal(fresh.featuredSkills[0].slug, skill.slug)
assert.equal(fresh.rankingSource, 'directory')
assert.equal(fresh.rankingGeneratedAt, null, 'Do not invent a snapshot timestamp for directory data')
snapshot = { items: [], generated_at: '2026-11-09T02:55:00Z' }
assert.equal((await home.getHomePageData()).featuredSkills.length, 1, 'Empty snapshot also uses the fallback')
snapshot = { items: [{ ...skill, badge: '42 stars', reason: 'Snapshot' }], generated_at: '2026-11-09T02:55:00Z' }
const beforeLanding = landingReads
assert.equal((await home.getHomePageData()).rankingSource, 'snapshot')
assert.equal(landingReads, beforeLanding, 'Normal homepage needs no directory scan or alternate ranking read')
snapshot = null
landing = { ...landing, source: 'saved-directory', savedThrough: '2026-11-01T00:00:00Z' }
const saved = await home.getHomePageData()
assert.equal(saved.rankingSource, 'saved-directory')
assert.equal(saved.rankingGeneratedAt, landing.savedThrough)
landing = { source: 'unavailable', items: [] }
assert.equal((await home.getHomePageData()).rankingSource, 'unavailable')
paused = true
const beforePaused = [snapshotReads, landingReads]
assert.deepEqual((await home.getHomePageData()).featuredSkills, [])
assert.deepEqual([snapshotReads, landingReads], beforePaused)

// Null reads must never be cached: the same key recovers on the next request.
let data = null, failure = false
const stored = new Map()
const deps = Object.fromEntries([...readFileSync('lib/ranking-snapshots.ts', 'utf8').matchAll(/from '([^']+)'/g)].map(match => [match[1], {}]))
const snapshots = compile('lib/ranking-snapshots.ts', { ...deps, 'server-only': {},
  '@/lib/skills/presentation-category': { skillPresentationCategory: item => item.category },
  'next/cache': { unstable_cache: (fn, keys, policy) => async slug => {
    assert.equal(policy.revalidate, 14400)
    if (!stored.has(slug)) stored.set(slug, await fn(slug))
    return stored.get(slug)
  } },
  '@/lib/supabase/public': { createPublicClient: () => ({ from: () => {
    const q = { select: () => q, eq: () => q, order: () => q, limit: () => q,
      maybeSingle: async () => ({ data, error: failure ? new Error('offline') : null }) }
    return q
  } }) },
})
const pausedBefore = process.env.SUPABASE_DATA_PAUSED
try {
  delete process.env.SUPABASE_DATA_PAUSED
  assert.equal(await snapshots.getLatestRankingSnapshot('stars'), null)
  assert.equal(stored.size, 0)
  failure = true
  assert.equal(await snapshots.getLatestRankingSnapshot('stars'), null)
  assert.equal(stored.size, 0)
  failure = false; data = { items: [{ ...skill }], generated_at: '2026-11-09T02:55:00Z' }
  assert.equal((await snapshots.getLatestRankingSnapshot('stars')).items[0].slug, skill.slug)
} finally {
  if (pausedBefore === undefined) delete process.env.SUPABASE_DATA_PAUSED
  else process.env.SUPABASE_DATA_PAUSED = pausedBefore
}
console.log('Home leaderboard: build seed rejection, last-good retention, fallback, pause, recovery and cache passthrough passed.')
