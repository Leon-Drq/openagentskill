import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const modules = new Map()
let calls = [], reservation = { status: 'reserved', id: 'test-reservation' }, reserveError = false, saveError = false
let providerFailure = false, bindingMissing = false
const valid = { choices: [{ finish_reason: 'stop', message: { content: 'reviewed text' } }], usage: { prompt_tokens: 12, completion_tokens: 3 } }
let providerOutput = valid
const binding = { async run(model, input, options) {
  calls.push({ kind: 'inference', model, input })
  assert.equal(options.returnRawResponse, true)
  assert.ok(options.signal instanceof AbortSignal)
  if (providerFailure) throw new Error('untrusted provider detail must not escape')
  return Response.json(providerOutput)
} }
const db = { async rpc(name, args) {
  calls.push({ kind: name, args })
  if (name === 'reserve_skill_analysis') return { data: reservation, error: reserveError ? new Error('db') : null }
  return { error: saveError ? new Error('save') : null }
} }
function load(path) {
  if (modules.has(path)) return modules.get(path)
  const output = {}; modules.set(path, output)
  const source = ts.transpileModule(readFileSync(new URL(`../${path}.ts`, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  new Function('exports', 'require', source)(output, name => {
    if (name === 'server-only') return {}
    if (name === 'ai') return { generateText: () => assert.fail('Cloudflare must never fall back to Vercel AI Gateway') }
    if (name === '@/lib/supabase/admin') return { createAdminClient: () => db }
    if (name === '@opennextjs/cloudflare') return { getCloudflareContext: () => ({ env: bindingMissing ? {} : { AI: binding } }) }
    if (name.startsWith('@/')) return load(name.slice(2))
    return require(name)
  })
  return output
}
const { controlledGeneration } = load('lib/ai/controlled-generation')
const { generateWithWorkersAI, CLOUDFLARE_REVIEW_MODEL } = load('lib/ai/cloudflare-generation')
const input = { model: 'deepseek/deepseek-v4-flash', prompt: 'test-only bounded input', feature: 'test-review', fingerprint: 'a' }
process.env.HOSTING_PROVIDER = 'cloudflare'
delete process.env.WORKERS_AI_ENABLED
await assert.rejects(controlledGeneration(input), /not enabled/)
process.env.WORKERS_AI_ENABLED = '1'; process.env.MIGRATION_READ_ONLY = '1'
await assert.rejects(controlledGeneration(input), /not enabled/)
delete process.env.MIGRATION_READ_ONLY
await assert.rejects(controlledGeneration({ ...input, model: 'unpriced/model' }), /price envelope/)
await assert.rejects(controlledGeneration({ ...input, prompt: 'x'.repeat(30_001) }), /bounded context/)
assert.equal(calls.length, 0)

reserveError = true
await assert.rejects(controlledGeneration(input), /ledger unavailable/)
assert.equal(calls.filter(c => c.kind === 'inference').length, 0)
reserveError = false
for (const status of ['budget_exhausted', 'cooldown', 'in_progress']) {
  reservation = { status }
  await assert.rejects(controlledGeneration(input), /Analysis deferred/)
}
assert.equal(calls.filter(c => c.kind === 'inference').length, 0)
reservation = { status: 'cached', response: JSON.stringify({ text: 'cached', reviewedAt: '2026-11-01T00:00:00Z' }) }
assert.equal((await controlledGeneration(input)).text, 'cached')
assert.equal(calls.filter(c => c.kind === 'inference').length, 0)

calls = []; reservation = { status: 'reserved', id: 'test-reservation' }
assert.equal((await controlledGeneration(input)).text, 'reviewed text')
assert.deepEqual(calls.map(c => c.kind), ['reserve_skill_analysis', 'inference', 'finish_skill_analysis'])
assert.equal(calls[0].args.p_model, CLOUDFLARE_REVIEW_MODEL)
assert.equal(calls[1].model, CLOUDFLARE_REVIEW_MODEL)
assert.equal(calls[1].input.max_completion_tokens, 2048)
assert.equal(calls[1].input.reasoning_effort, 'none')
assert.equal(calls[1].input.stream, false)
assert.equal(calls[1].input.store, false)
assert.equal(calls[2].args.p_output_tokens, 3)

calls = []; saveError = true
await assert.rejects(controlledGeneration(input), /persist analysis/)
assert.equal(calls.filter(c => c.kind === 'finish_skill_analysis').length, 1, 'uncertain successful write cannot be overwritten')
saveError = false
for (const mode of ['error', 'missing-binding']) {
  calls = []; providerFailure = mode === 'error'; bindingMissing = mode === 'missing-binding'
  await assert.rejects(controlledGeneration(input), error => error.code === 'provider_unavailable' && !error.message.includes('untrusted'))
  assert.ok(calls.filter(c => c.kind === 'inference').length <= 1, 'no inference retries')
  assert.equal(calls.at(-1).args.p_error, 'provider_unavailable')
}
providerFailure = bindingMissing = false
for (const output of [null, {}, { choices: [] }, { choices: [{ finish_reason: 'length', message: { content: 'truncated' } }] },
  { ...valid, usage: { completion_tokens: 2049 } }, { choices: [{ finish_reason: 'stop', message: { content: '', tool_calls: [{}] } }] }]) {
  providerOutput = output
  await assert.rejects(generateWithWorkersAI(binding, 'test', new AbortController().signal), /provider_response/)
}
let canceled = false
await assert.rejects(generateWithWorkersAI({ run: async () => new Response(new ReadableStream({
  pull(controller) { controller.enqueue(new Uint8Array(65_537)) }, cancel() { canceled = true },
})) }, 'test', new AbortController().signal), /provider_response_limit/)
assert.equal(canceled, true)
const aborted = new AbortController(); aborted.abort()
await assert.rejects(generateWithWorkersAI({ run() { assert.fail('aborted request reached provider') } }, 'test', aborted.signal))
console.log('Workers AI: no fallback, durable reservation before inference, budget/cooldown/cache, fixed model and limits, bounded responses, errors, abort and persistence uncertainty passed. No paid API calls.')
