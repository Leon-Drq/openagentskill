import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function compile(file, deps) {
  const source = readFileSync(file, 'utf8')
  const imports = Object.fromEntries([...source.matchAll(/from '([^']+)'/g)].map(match => [match[1], {}]))
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  const result = {}
  new Function('exports', 'require', compiled)(result, name => name in deps ? deps[name] : name in imports ? imports[name] : require(name))
  return result
}
let now = 0, accesses = 0, reads = 0, fail = false, revision = 1
const entries = new Map(), scopes = [], policies = []
const cache = (fn, keyParts, policy) => {
  policies.push(policy)
  return async (...args) => {
    accesses++
    const key = JSON.stringify([keyParts, args]), old = entries.get(key)
    if (old && old.expires > now) return structuredClone(old.value)
    const value = await fn(...args)
    entries.set(key, { value, tags: policy.tags, expires: now + policy.revalidate })
    return structuredClone(value)
  }
}
const invalidate = tag => { for (const [key, entry] of entries) if (entry.tags.includes(tag)) entries.delete(key) }
const admin = { from(table) {
  assert.equal(table, 'skill_download_totals')
  let ids
  const query = {
    select(columns) { assert.equal(columns, 'skill_slug,downloads'); return query },
    in(column, slugs) { assert.equal(column, 'skill_slug'); ids = slugs; return query },
    async limit(count) {
      assert.ok(ids.length <= count && count <= 100)
      assert.ok(encodeURIComponent(ids.join(',')).length <= 2400)
      scopes.push(ids); reads++
      return fail ? { error: Error('offline') } : {
        data: ids.filter(id => id !== 'missing').map(skill_slug => ({ skill_slug, downloads: revision })), error: null,
      }
    },
  }
  return query
} }
const downloads = compile('lib/skills/downloads.ts', {
  'server-only': {}, 'next/cache': { unstable_cache: cache },
  '@/lib/supabase/admin': { createAdminClient: () => admin },
  '@/lib/data-maintenance': compile('lib/data-maintenance.ts', {}),
  './media-query': compile('lib/skills/media-query.ts', {}),
})
const ranking = compile('lib/ranking-snapshots.ts', {
  'server-only': {}, 'next/cache': { unstable_cache: cache },
  '@/lib/skills/presentation-category': { skillPresentationCategory: item => item.category },
  '@/lib/supabase/public': { createPublicClient: () => ({ from: () => {
    const query = { select: () => query, eq: () => query, order: () => query, limit: () => query,
      async maybeSingle() { reads++; return { data: { items: [], revision }, error: fail ? Error('offline') : null } },
    }
    return query
  } }) },
})
const pausedBefore = process.env.SUPABASE_DATA_PAUSED
try {
  delete process.env.SUPABASE_DATA_PAUSED
  assert.deepEqual(await downloads.getDownloadTotals([]), {})
  assert.equal(reads, 0)
  assert.deepEqual(await downloads.getDownloadTotals(['b', 'a', 'b', 'missing']), { a: 1, b: 1 })
  await downloads.getDownloadTotals(['missing', 'a', 'b'])
  assert.equal(reads, 1, 'Canonical keys share reordered sets, with no whole-table query')
  now = 3599; revision = 2
  assert.equal((await downloads.getDownloadTotals(['b', 'a', 'missing'])).a, 1)
  now = 3601
  assert.equal((await downloads.getDownloadTotals(['b', 'a', 'missing'])).a, 2)
  const many = Array.from({ length: 1250 }, (_, i) => `long-public-skill-slug-${String(i).padStart(4, '0')}`)
  assert.equal(Object.keys(await downloads.getDownloadTotals(many)).length, many.length, 'All candidates survive API row and URL limits')
  fail = true
  await assert.rejects(downloads.getDownloadTotals(['retry']), /offline/)
  fail = false
  assert.equal((await downloads.getDownloadTotals(['retry'])).retry, 2, 'Failed reads do not become cached zeroes')
  revision = 3; invalidate('site-download-totals')
  assert.equal((await downloads.getDownloadTotals(['retry'])).retry, 3)
  assert.equal((await ranking.getLatestRankingSnapshot('trending')).revision, 3)
  now += 21599; revision = 4
  assert.equal((await ranking.getLatestRankingSnapshot('trending')).revision, 3)
  now += 2
  assert.equal((await ranking.getLatestRankingSnapshot('trending')).revision, 4)
  revision = 5; invalidate('ranking-snapshots')
  assert.equal((await ranking.getLatestRankingSnapshot('trending')).revision, 5, 'Daily publication can refresh before the TTL')
  const before = { accesses, reads, entries: entries.size }
  process.env.SUPABASE_DATA_PAUSED = '1'
  assert.equal(await downloads.getDownloadTotals(['retry']), null)
  assert.equal(await ranking.getLatestRankingSnapshot('trending'), null)
  await assert.rejects(ranking.getRankingSnapshotHistory('trending'), /unavailable/)
  assert.deepEqual({ accesses, reads, entries: entries.size }, before, 'Pause never reads or overwrites a warm cache')
  delete process.env.SUPABASE_DATA_PAUSED
  assert.equal((await ranking.getLatestRankingSnapshot('trending')).revision, 5)
  assert.ok(policies.some(p => p.revalidate === 3600 && p.tags.includes('site-download-totals')))
  assert.ok(policies.some(p => p.revalidate === 21600 && p.tags.includes('ranking-snapshots')))
} finally {
  if (pausedBefore === undefined) delete process.env.SUPABASE_DATA_PAUSED
  else process.env.SUPABASE_DATA_PAUSED = pausedBefore
}
console.log('Cost cache policy: scoped reads, 1250 candidates, URL limits, expiry, tag invalidation, failure recovery and pause isolation passed.')
