// Read-only connection check. Requires Node.js 18+. No packages, files, or configuration are installed.
// Run after inspecting this file: node connect-check.mjs
import { pathToFileURL } from 'node:url'

export async function checkConnection(fetchImpl = fetch) {
  const origin = 'https://www.openagentskill.com'
  const checks = { api_accessible: false, tools_available: false, search_working: false, configuration_saved: 'not_verified', installation: 'not_attempted' }
  let stage = 'api_accessible'
  async function request(path, body) {
    const response = await fetchImpl(`${origin}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  }
  async function rpc(id, method, params) {
    const data = await request('/api/mcp', { jsonrpc: '2.0', id, method, params })
    if (data.jsonrpc !== '2.0' || data.id !== id || data.error || !data.result || data.result.isError) throw new Error('Invalid or failed MCP response')
    return data.result
  }
  try {
    const kit = await request('/api/agent/integration-kit')
    if (!Array.isArray(kit.supported_agents) || !kit.supported_agents.some(agent => agent.id === 'codex' && agent.copy_prompt)) throw new Error('Missing platform templates')
    checks.api_accessible = true
    stage = 'tools_available'
    const initialized = await rpc(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'openagentskill-readonly-check', version: '1.0' } })
    if (initialized.serverInfo?.name !== 'openagentskill' || initialized.protocolVersion !== '2025-06-18') throw new Error('Unexpected MCP server or protocol')
    const notification = await fetchImpl(`${origin}/api/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), signal: AbortSignal.timeout(15000), redirect: 'error' })
    if (!notification.ok) throw new Error('MCP initialization notification failed')
    const tools = await rpc(2, 'tools/list', {})
    if (!['search_skills', 'resolve_task'].every(name => tools.tools?.some(tool => tool.name === name))) throw new Error('Required MCP tools missing')
    checks.tools_available = true
    stage = 'search_working'
    const search = await rpc(3, 'tools/call', { name: 'search_skills', arguments: { query: 'mono-color', limit: 3 } })
    const data = JSON.parse(search.content?.find(item => item.type === 'text')?.text || '{}')
    if (!Array.isArray(data.skills) || !data.skills.some(skill => skill.slug === 'yanliudesign-mono-color-skill')) throw new Error('Expected public search fixture was not returned; registry may be unavailable or the fixture may have changed')
    checks.search_working = true
    return { ok: true, checks, note: 'HTTP API and MCP wire protocol work from this process. This does not prove that an AI client saved its configuration or installed a Skill.' }
  } catch (error) {
    return { ok: false, checks, failed_stage: stage, error: error instanceof Error ? error.message : 'Connection check failed' }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkConnection()
  console.log(JSON.stringify(result, null, 2))
  if (!result.ok) process.exitCode = 1
}
