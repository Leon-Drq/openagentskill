export class OpenAgentSkill {
  constructor({ baseUrl = 'https://www.openagentskill.com', fetch: fetchImpl = globalThis.fetch } = {}) {
    if (!fetchImpl) throw new Error('A fetch implementation is required')
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.fetch = fetchImpl
  }

  async request(path, init) {
    const response = await this.fetch(`${this.baseUrl}${path}`, init)
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || `OpenAgentSkill request failed (${response.status})`)
    return payload
  }

  search(query, options = {}) {
    const params = new URLSearchParams({ q: query, limit: String(options.limit || 10) })
    return this.request(`/api/agent/skills?${params}`)
  }

  resolve(task, options = {}) {
    return this.request('/api/agent/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, agent: options.agent || 'auto', limit: options.limit || 6, constraints: { max_risk: options.maxRisk || 'medium', needs_install_command: true } }) })
  }

  skill(slug) { return this.request(`/api/agent/skills/${encodeURIComponent(slug)}`) }
  installPlan(slug) { return this.request(`/api/skills/${encodeURIComponent(slug)}/install`) }
  rankings(slug = 'highest-quality-agent-skills', limit = 10) { return this.request(`/api/agent/rankings?slug=${encodeURIComponent(slug)}&limit=${limit}`) }
  rankingHistory(slug = 'highest-quality-agent-skills', days = 30) { return this.request(`/api/agent/rankings/${encodeURIComponent(slug)}/history?days=${days}`) }
  reportOutcome(outcome) { return this.request('/api/agent/outcome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(outcome) }) }
}

export function createOpenAgentSkill(options) { return new OpenAgentSkill(options) }
