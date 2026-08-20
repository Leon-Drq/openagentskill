import assert from 'node:assert/strict'
import { OpenAgentSkill } from '../packages/sdk/openagentskill.mjs'

const calls = []
const client = new OpenAgentSkill({
  baseUrl: 'https://registry.test/',
  fetch: async (url, init = {}) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  },
})

await client.search('browser automation', { limit: 4 })
await client.resolve('audit a repository', { agent: 'codex', maxRisk: 'low' })
await client.skill('test-skill')
await client.installPlan('test-skill')
await client.rankings('agent-proven', 5)
await client.rankingHistory('agent-proven', 14)
await client.reportOutcome({ event_id: 'test', skill_slug: 'test-skill', task: 'test', dry_run: true })

assert.equal(calls.length, 7)
assert.match(calls[0].url, /\/api\/agent\/skills\?q=browser\+automation&limit=4$/)
assert.equal(calls[1].init.method, 'POST')
assert.match(calls[5].url, /\/api\/agent\/rankings\/agent-proven\/history\?days=14$/)
assert.equal(calls[6].init.method, 'POST')
console.log('SDK contract OK')
