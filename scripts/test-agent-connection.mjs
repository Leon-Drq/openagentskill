import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { checkConnection } from '../public/connect-check.mjs'
import { getSkillSourceEvidence } from '../lib/skills/source-evidence.ts'
import { isInstallRecommendationEligible } from '../lib/resolve-eligibility.ts'

function mockFetch({ missingTool = false, empty = false, rpcError = false, httpError = false, malformed = false } = {}) {
  const calls = []
  const fetch = async (url, options) => {
    assert.ok(url.startsWith('https://www.openagentskill.com/'))
    assert.equal(options.redirect, 'error')
    assert.ok(options.signal)
    calls.push({ url, options })
    if (httpError) return new Response('{}', { status: 503 })
    if (!options.body) return Response.json({ supported_agents: [{ id: 'codex', copy_prompt: 'Public template' }] })
    const body = JSON.parse(options.body)
    assert.ok(['initialize', 'notifications/initialized', 'tools/list', 'tools/call'].includes(body.method))
    if (body.method === 'notifications/initialized') return new Response(null, { status: 202 })
    let result
    if (body.method === 'initialize') result = { serverInfo: { name: 'openagentskill' }, protocolVersion: '2025-06-18' }
    else if (body.method === 'tools/list') result = { tools: (missingTool ? [] : ['search_skills', 'resolve_task']).map(name => ({ name })) }
    else {
      assert.deepEqual(body.params, { name: 'search_skills', arguments: { query: 'mono-color', limit: 3 } })
      result = { isError: rpcError, content: [{ type: 'text', text: malformed ? 'invalid' : JSON.stringify({ skills: empty ? [] : [{ slug: 'yanliudesign-mono-color-skill' }] }) }] }
    }
    return Response.json({ jsonrpc: '2.0', id: body.id, result })
  }
  return { fetch, calls }
}

const good = mockFetch()
const success = await checkConnection(good.fetch)
assert.equal(success.ok, true)
assert.equal(good.calls.length, 5)
assert.equal(success.checks.configuration_saved, 'not_verified')
assert.equal(success.checks.installation, 'not_attempted')
for (const [options, stage] of [[{ missingTool: true }, 'tools_available'], [{ empty: true }, 'search_working'], [{ rpcError: true }, 'search_working'], [{ malformed: true }, 'search_working'], [{ httpError: true }, 'api_accessible']]) {
  const result = await checkConnection(mockFetch(options).fetch)
  assert.equal(result.ok, false)
  assert.equal(result.failed_stage, stage)
  assert.equal(result.checks.configuration_saved, 'not_verified')
}
assert.equal((await checkConnection(async () => { throw new Error('timeout') })).ok, false)

for (const [record, blocked, expected] of [
  [{ source_path: 'SKILL.md', install_command: 'example' }, false, true],
  [{ source_path: 'SKILL.md', install_command: 'example' }, true, false],
  [{ install_command: 'example' }, false, false],
  [{ source_path: 'README.md', install_command: 'example' }, false, false],
  [{ source_path: 'SKILL.md', install_command: 'example', source_sync_status: 'changed' }, false, false],
  [{ source_path: 'SKILL.md', install_command: 'example', source_sync_status: 'error' }, false, false],
  [{ source_path: 'SKILL.md' }, false, false],
]) {
  assert.equal(isInstallRecommendationEligible({ source_evidence: getSkillSourceEvidence(record), safety: { blocked } }), expected)
}
const resolver = readFileSync('lib/agent-resolve.ts', 'utf8')
assert.match(resolver, /candidates.filter\(isInstallRecommendationEligible\)/)
assert.match(resolver, /review_candidates: reviewCandidates/)
assert.doesNotMatch(resolver, /eligibleCandidates\[0\] \|\|\s*candidates\[0\]/)
assert.match(readFileSync('app/api/agent/integration-kit/route.ts', 'utf8'), /agent.copy_prompt/)
assert.match(readFileSync('lib/agent-integration-kit.ts', 'utf8'), /configuration_saved: 'not_verified'/)
console.log('Agent connection: read-only success/failure, RPC/HTTP/schema failures, private-data-free probes, source eligibility and complete text templates passed.')
