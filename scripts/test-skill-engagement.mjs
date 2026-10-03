import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { z } from 'zod'
import { withTimeout } from '../lib/async.ts'
import { normalizeEngagementSlugs } from '../lib/skill-engagement.ts'

assert.deepEqual(normalizeEngagementSlugs(['beta', 'alpha', 'alpha']), ['alpha', 'beta'])
assert.equal(normalizeEngagementSlugs(['']), null)
assert.equal(normalizeEngagementSlugs(Array(65).fill('alpha')), null)
let user = 'one', failCounts = false, reads = 0, failWrite = false
const cache = new Map(), writes = [], personalReads = []
function query(table) {
  const q = {
    select() { return q }, eq() { return q }, in(_field, values) { assert.ok(values.length <= 64); return q },
    abortSignal(signal) { assert.ok(signal); return q },
    maybeSingle: async () => ({ data: { slug: 'alpha' }, error: null }),
    upsert(row, options) { writes.push({ table, row, options }); return q },
    delete() { writes.push({ table, delete: true }); return q },
    then(resolve, reject) {
      personalReads.push({ table, user })
      const data = table === 'skill_votes' ? [{ skill_slug: 'alpha', vote: user === 'one' ? 1 : -1 }]
        : table === 'bookmarks' && user === 'one' ? [{ skill_slug: 'alpha' }] : []
      return Promise.resolve({ data, error: failWrite ? Error('offline') : null }).then(resolve, reject)
    },
  }
  return q
}
const deps = {
  'next/server': { NextResponse: { json: (body, init) => ({ body, ...init }) } }, zod: { z },
  'next/cache': {
    unstable_cache: fn => async (...args) => { const key = JSON.stringify(args); if (cache.has(key)) return cache.get(key); const result = await fn(...args); cache.set(key, result); return result },
    revalidateTag: (tag, profile) => { assert.equal(tag, 'public-skill-votes'); assert.equal(profile.expire, 0); cache.clear() },
  },
  '@/lib/async': { withTimeout }, '@/lib/skill-engagement': { normalizeEngagementSlugs },
  '@/lib/skills/external-catalog': { getExternalSkill: () => undefined },
  '@/lib/supabase/server': { createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: user ? { id: user, is_anonymous: user === 'anonymous' } : null }, error: null }) },
    from: query, rpc: async (name, params) => { writes.push({ name, params, user }); return { error: failWrite ? Error('offline') : null } },
  }) },
  '@/lib/supabase/admin': { createAdminClient: () => ({ rpc: async (_name, params) => {
    reads++; return { error: failCounts ? Error('offline') : null, data: params.skill_slugs.filter(slug => ['alpha','beta'].includes(slug)).map(skill_slug => ({ skill_slug, likes: 3, dislikes: 1 })) }
  } }) },
}
const code = ts.transpileModule(readFileSync(new URL('../app/api/skills/engagement/route.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const route = {}; new Function('exports','require',code)(route, name => { assert.ok(name in deps, name); return deps[name] })
const get = slugs => route.GET({ nextUrl: new URL('https://example.test/api/skills/engagement?slugs=' + encodeURIComponent(slugs)) })
const put = (body, origin = 'https://example.test') => route.PUT({ nextUrl: new URL('https://example.test/api/skills/engagement'), headers: new Headers({ origin, 'content-type': 'application/json' }), text: async () => JSON.stringify(body) })
const one = await get('beta,alpha'); user = 'two'; const two = await get('alpha,beta')
assert.equal(reads, 1, 'Same visible batch shares only aggregate reads')
assert.deepEqual(one.body.stats.alpha, { likes: 3, dislikes: 1, vote: 1, saved: true })
assert.deepEqual(two.body.stats.alpha, { likes: 3, dislikes: 1, vote: -1, saved: false })
assert.equal(personalReads.length, 4, 'One votes and one bookmarks query per account, never per card')
assert.equal(two.headers['Cache-Control'], 'private, no-store')
user = null; const guest = await get('alpha,beta')
assert.equal(guest.body.signedIn, false); assert.equal(guest.body.stats.alpha.vote, null); assert.equal(guest.body.stats.alpha.saved, false)
assert.equal(personalReads.length, 4, 'Guests do not query personal tables')
assert.equal((await put({ slug: 'alpha', vote: 1 })).status, 401)
user = 'anonymous'; assert.equal((await put({ slug: 'alpha', saved: true })).status, 401)
user = 'one'
assert.equal((await put({ slug: 'alpha', vote: 1 }, 'https://evil.test')).status, 403)
assert.equal((await put({ slug: 'alpha', vote: 2 })).status, 400)
assert.equal((await put({ slug: 'alpha', saved: true, user_id: 'two' })).status, 400)
assert.equal((await put({ slug: 'alpha', saved: true, vote: 1 })).status, 400)
for (const vote of [1,-1,null]) assert.equal((await put({ slug: 'alpha', vote })).status, 200)
assert.deepEqual(writes.filter(x => x.name).map(x => x.params.direction), [1,-1,null])
assert.equal(cache.size, 0, 'Votes invalidate aggregate state')
for (let i=0;i<2;i++) assert.equal((await put({ slug: 'alpha', saved: true })).status, 200)
assert.ok(writes.filter(x => x.row).every(x => x.row.user_id === 'one' && x.options.ignoreDuplicates && x.options.onConflict === 'user_id,skill_slug'))
assert.equal((await put({ slug: 'alpha', saved: false })).status, 200)
failWrite = true; assert.equal((await put({ slug: 'alpha', vote: 1 })).status, 503); failWrite = false
assert.equal((await put({ slug: 'alpha', vote: 1 })).status, 200)
failCounts = true; assert.equal((await get('alpha')).status, 503); assert.equal(cache.size, 0)
failCounts = false; assert.equal((await get('alpha')).status, 200)
assert.equal((await get('')).status, 400)
assert.equal((await get(Array(65).fill('alpha').join(','))).status, 400)
assert.deepEqual((await get('hidden')).body.stats, {}, 'Only public aggregates receive actions')
console.log('Skill engagement: bounded batching, private account isolation, guest/anonymous denial, CSRF, desired-state votes, idempotent saves, cache invalidation and outage recovery passed.')
