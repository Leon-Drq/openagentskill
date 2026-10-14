import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as packed from '../lib/cache/packed-json.ts'
import * as coalesced from '../lib/cache/coalesced.ts'
import * as mediaQuery from '../lib/skills/media-query.ts'
import { withTimeout } from '../lib/async.ts'

const source = readFileSync('lib/db/skills.ts', 'utf8')
const deps = Object.fromEntries([...source.matchAll(/from '([^']+)'/g)].map(match => [match[1], {}]))
const shared = new Map(), cacheTags = new Map(), cachePolicies = new Map(), reads = []
let unavailable = false, revision = 1, active = 0, maxActive = 0
const row = slug => ({ slug, name: slug, version: String(revision), ai_review_approved: true, category: 'development', ai_review_score: { risk: 'retain source evidence' } })
Object.assign(deps, {
  '@/lib/cache/packed-json': packed, '@/lib/cache/coalesced': coalesced,
  '@/lib/skills/media-query': mediaQuery, '@/lib/async': { withTimeout },
  '@/lib/skills/publication': { PUBLIC_SKILL_FILTER: 'publication-gate' },
  '@/lib/skills/registry-scope': { isMcpOnlySkillRecord: value => value.slug === 'mcp-only' },
  'next/cache': { unstable_cache: (fn, keys, options) => async (...args) => {
    const key = JSON.stringify([keys, args])
    if (shared.has(key)) return shared.get(key)
    const value = await fn(...args); shared.set(key, value)
    cacheTags.set(key, options.tags || []); cachePolicies.set(key, options)
    return value
  } },
  '@/lib/supabase/public': { createPublicClient: options => {
    assert.equal(options.circuitScope, 'skill-lookup')
    return { from: table => {
      assert.equal(table, 'skills')
      let slugs = [], single = false
      const q = {
        select(value) { assert.equal(value, '*'); return q },
        or(gate) { assert.equal(gate, 'publication-gate'); return q },
        in(field, values) { assert.equal(field, 'slug'); slugs = values; return q },
        eq(field, value) { assert.equal(field, 'slug'); slugs = [value]; return q },
        maybeSingle() { single = true; return q },
        then(resolve, reject) {
          reads.push(slugs); active++; maxActive = Math.max(maxActive, active)
          return new Promise(done => setTimeout(() => {
            active--
            const rows = slugs.filter(slug => slug !== 'missing').map(row)
            done({ data: unavailable ? null : single ? rows[0] || null : rows, error: unavailable ? Error('offline') : null })
          }, 10)).then(resolve, reject)
        },
      }
      return q
    } }
  } },
})
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const db = {}
new Function('exports', 'require', code)(db, name => { assert.ok(name in deps, name); return deps[name] })
const inputs = ['charlie', 'alpha', 'bravo']
const simultaneous = await Promise.all(Array.from({ length: 8 }, (_, i) => db.getSkillsBySlugs(i % 2 ? [...inputs].reverse() : inputs)))
assert.equal(reads.length, 1, 'Eight reordered locale requests share one database read')
assert.deepEqual(simultaneous[0].map(x => x.slug), inputs)
assert.deepEqual(simultaneous[1].map(x => x.slug), [...inputs].reverse())
assert.equal(simultaneous[0][0].ai_review_score.risk, 'retain source evidence')
await db.getSkillsBySlugs(inputs)
assert.equal(reads.length, 1, 'Later requests reuse the shared packed batch')
shared.clear(); revision = 2
assert.equal((await db.getSkillsBySlugs(inputs))[0].version, '2', 'Publication invalidation exposes fresh rows')
assert.equal(reads.length, 2)

shared.clear(); unavailable = true
assert.deepEqual(await db.getSkillsBySlugs(inputs), [])
assert.equal(shared.size, 0, 'The outage fallback is outside the shared cache')
unavailable = false
assert.equal((await db.getSkillsBySlugs(inputs)).length, 3)
assert.equal(reads.length, 4, 'The first healthy request after failure can recover')
assert.deepEqual(await db.getSkillsBySlugs(['missing', 'alpha', 'alpha', 'mcp-only']), [row('alpha')])
const beforeEmpty = reads.length
assert.deepEqual(await db.getSkillsBySlugs([]), [])
assert.equal(reads.length, beforeEmpty)

const many = Array.from({ length: 350 }, (_, i) => `owner-long-public-skill-identity-${i}`)
maxActive = 0
assert.equal((await db.getSkillsBySlugs(many)).length, many.length)
assert.ok(maxActive <= 4, 'Large source sets preserve the existing concurrency cap')
assert.ok(reads.every(batch => encodeURIComponent(batch.join(',')).length <= 2400))
const beforeDetails = reads.length
await Promise.all(Array.from({ length: 8 }, () => db.getSkillBySlugStrict('detail')))
assert.equal(reads.length, beforeDetails + 1, 'Metadata and detail body misses share one lookup')
await db.getSkillBySlugStrict('other')
await db.getSkillBySlugStrict('detail', 900)
assert.ok([...cachePolicies.values()].some(policy => policy.revalidate === 300 && policy.tags.includes('public-skill:detail')), 'API lookup retains the original freshness window')
assert.ok([...cachePolicies.values()].some(policy => policy.revalidate === 900 && policy.tags.includes('public-skill:detail')), 'Public display uses its separate longer cache')
revision = 3
for (const [key, tags] of cacheTags) if (tags.includes('public-skill:detail')) shared.delete(key)
assert.equal((await db.getSkillBySlugStrict('detail')).version, '3')
assert.equal((await db.getSkillBySlugStrict('detail', 900)).version, '3', 'Targeted invalidation expires both freshness tiers')
assert.equal((await db.getSkillBySlugStrict('other')).version, '2', 'Unrelated details stay warm')
assert.ok([...cacheTags.values()].filter(tags => tags.includes('public-skill:detail')).every(tags => !tags.includes('public-skill-directory')), 'A directory refresh cannot invalidate every detail')
assert.ok(reads.every(batch => batch.length <= 100), 'Per-source tags stay below the framework tag limit')
console.log('Public source batches: canonical keys, 8-way coalescing, packed cache, invalidation, failure recovery, source evidence, ordering and bounded concurrency passed.')
