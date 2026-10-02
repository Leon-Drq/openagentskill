import assert from 'node:assert/strict'
import { register } from 'node:module'
import { readFileSync } from 'node:fs'

// Read-only release probe using the same public client and directory projection.
// Never use administrator credentials to assert anonymous access/performance.
register('./test-owner-publication-loader.mjs', import.meta.url)
const { createPublicClient } = await import('../lib/supabase/public.ts')
const source = readFileSync(new URL('../lib/db/skills.ts', import.meta.url), 'utf8')
const fields = [...source.split('const SKILL_DIRECTORY_SELECT = [')[1].split('].join')[0].matchAll(/'([^']+)'/g)].map(x => x[1])
const client = createPublicClient({ requestTimeoutMs: 8000, circuitScope: 'skill-search' })
for (const [functionName, parameters] of [
  ['search_public_skills', { p_query: 'video OR editing OR captions', p_limit: 120 }],
  ['search_public_skills', { p_query: 'database OR sql', p_limit: 120 }],
  ['search_public_skills', { p_query: 'claude OR agent OR skill', p_limit: 120 }],
  ['search_public_skills', { p_query: 'unlikelymissingsearchterm', p_limit: 120 }],
  ['search_public_skills', { p_query: '', p_limit: 120 }],
  ['lookup_public_skill_name', { p_name: 'find-skills' }],
  ['lookup_public_skill_name', { p_name: 'FiNd-SkIlLs' }],
]) {
  const started = performance.now()
  const { data, error } = await client.rpc(functionName, parameters).select(fields.join(','))
  if (error) throw error
  assert.ok(data.length <= (functionName === 'lookup_public_skill_name' ? 8 : 120))
  assert.ok(data.every(row => row.ai_review_approved || ['owner_published', 'static_checked'].includes(row.listing_status)))
  assert.ok(data.every(row => Object.keys(row).every(key => fields.includes(key))))
  if (functionName === 'lookup_public_skill_name') assert.ok(data.length > 0 && data.every(row => row.name.toLowerCase() === 'find-skills'))
  if (parameters.p_query === '' || parameters.p_query === 'unlikelymissingsearchterm') assert.equal(data.length, 0)
  console.log(JSON.stringify({ functionName, query: parameters.p_query ?? parameters.p_name, rows: data.length, elapsedMs: Math.round(performance.now() - started) }))
}
for (const [functionName, parameters] of [
  ['search_public_skills', { p_query: 'video', p_limit: 1 }],
  ['lookup_public_skill_name', { p_name: 'find-skills' }],
]) {
  const { data, error } = await client.rpc(functionName, parameters).select('author_email')
  assert.ok(error, 'A caller cannot widen the RPC into private contact fields')
  assert.equal(data, null)
}
console.log('Anonymous search release checks passed: full projection, public rows, bounded results, mixed case, zero results and private-column rejection. Times include network latency; database plans must be checked separately.')
