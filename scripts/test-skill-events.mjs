import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { z } from 'zod'
import { getCanonicalSkillSlug, SKILL_SLUG_ALIASES } from '../lib/skill-slug-aliases.ts'

const source = readFileSync(new URL('../app/api/events/skill/route.ts', import.meta.url), 'utf8')
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const writes = []
let error = null, thrown = false
let visibleSlugs = ['last30days-skill'], lookupError = null
const reads = []
const dependencies = {
  'next/server': { NextResponse: { json: (data, init) => Response.json(data, init) } },
  zod: { z },
  '@/lib/skill-slug-aliases': { getCanonicalSkillSlug, SKILL_SLUG_ALIASES },
  '@/lib/supabase/public': { createPublicClient: options => {
    assert.deepEqual(options, { requestTimeoutMs: 3000, circuitScope: 'telemetry' })
    return { from: table => {
      if (table === 'skills') return { select: columns => {
        assert.equal(columns, 'slug')
        return { in: async (column, candidates) => {
          assert.equal(column, 'slug')
          reads.push(candidates)
          return { data: visibleSlugs.filter(slug => candidates.includes(slug)).map(slug => ({ slug })), error: lookupError }
        } }
      } }
      assert.equal(table, 'skill_events')
      return { insert: async record => {
        writes.push(record)
        if (thrown) throw Error('network unavailable')
        return { error }
      } }
    } }
  } },
}
const exported = {}
new Function('exports', 'require', output)(exported, name => {
  assert.ok(name in dependencies, `Unexpected dependency: ${name}`)
  return dependencies[name]
})
const post = payload => exported.POST(new Request('https://www.openagentskill.com/api/events/skill', {
  method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' },
}))
const payload = { skill_slug: 'last30days', event_type: 'view' }
assert.equal((await post({ ...payload, event_type: 'install_success' })).status, 400)
assert.equal(writes.length, 0)
const response = await post({ ...payload, is_verified: true, source: 'trusted', user_id: 'forged' })
assert.equal(response.status, 200)
assert.deepEqual(await response.json(), { ok: true })
assert.equal(writes[0].skill_slug, 'last30days-skill')
assert.equal(writes[0].source, 'web')
assert.equal(writes[0].is_verified, false)
assert.ok(!('user_id' in writes[0]))
visibleSlugs = ['mvanhorn-last30days-skill']
for (const slug of ['last30days', 'last30days-skill', 'mvanhorn-last30days-skill']) {
  assert.equal((await post({ ...payload, skill_slug: slug })).status, 200)
  assert.equal(writes.at(-1).skill_slug, 'mvanhorn-last30days-skill', 'Use the actual public database foreign key')
}
visibleSlugs = []
const beforeHidden = writes.length
assert.equal((await post(payload)).status, 404)
assert.equal(writes.length, beforeHidden, 'Hidden/missing alias targets must not be written')
lookupError = { code: '57014' }
assert.equal((await post(payload)).status, 503)
assert.equal(writes.length, beforeHidden, 'Failed reads must not produce writes or false 404s')
lookupError = null
visibleSlugs = ['last30days-skill']
const beforeOrdinary = reads.length
assert.equal((await post({ ...payload, skill_slug: '00200200-humanizer' })).status, 200)
assert.equal(reads.length, beforeOrdinary, 'Ordinary slugs must not add a database read')
assert.equal(writes.at(-1).skill_slug, '00200200-humanizer')
for (const code of ['42501', '23503']) {
  error = { code, message: 'Database detail must not be exposed' }
  const denied = await post(payload)
  assert.equal(denied.status, 404)
  assert.doesNotMatch(await denied.text(), /Database detail/)
}
error = { code: '57014', message: 'query timeout' }
for (const shouldThrow of [false, true]) {
  thrown = shouldThrow
  const before = writes.length
  const unavailable = await post(payload)
  assert.equal(unavailable.status, 503)
  assert.equal(unavailable.headers.get('retry-after'), '15')
  assert.equal(unavailable.headers.get('cache-control'), 'no-store')
  assert.equal(writes.length, before + 1, 'Non-idempotent writes must not retry')
}
console.log('Skill event API tests passed: payload authority, aliases, RLS denials, outages and bounded writes.')
