export type OpenAgentSkillAgent = 'auto' | 'codex' | 'claude-code' | 'cursor' | 'openagentskill-cli'
export type OpenAgentSkillRisk = 'low' | 'medium' | 'high'
export type OpenAgentSkillOutcome = 'success' | 'failed' | 'not_relevant' | 'blocked_by_risk' | 'setup_required'
export type OpenAgentSkillWorkspace = 'sandbox' | 'local' | 'ci' | 'production' | 'unknown'

export interface OpenAgentSkillClientOptions {
  baseUrl?: string
  fetchImpl?: typeof fetch
  defaultAgent?: OpenAgentSkillAgent
  defaultMaxRisk?: OpenAgentSkillRisk
}

export interface ResolveOptions {
  agent?: OpenAgentSkillAgent
  maxRisk?: OpenAgentSkillRisk
  minStars?: number
  limit?: number
  live?: boolean
}

export interface OutcomePayload {
  event_id: string
  skill_slug: string
  task: string
  agent?: OpenAgentSkillAgent | string
  outcome: OpenAgentSkillOutcome
  install_used?: boolean
  risk_blocked?: boolean
  setup_required?: boolean
  task_success?: boolean | null
  output_quality?: 1 | 2 | 3 | 4 | 5 | null
  error_type?: string | null
  human_review_required?: boolean
  used_in_production?: boolean
  workspace?: OpenAgentSkillWorkspace
  evidence_url?: string | null
  time_to_useful_ms?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
  dry_run?: boolean
}

export class OpenAgentSkillError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'OpenAgentSkillError'
    this.status = status
    this.payload = payload
  }
}

const DEFAULT_BASE_URL = 'https://www.openagentskill.com'

function normalizeBaseUrl(baseUrl?: string) {
  return (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `OpenAgentSkill request failed with ${response.status}`
    throw new OpenAgentSkillError(message, response.status, payload)
  }

  return payload as T
}

function appendResolveParams(url: URL, task: string, options: Required<Pick<ResolveOptions, 'agent' | 'maxRisk'>> & ResolveOptions) {
  url.searchParams.set('task', task)
  url.searchParams.set('agent', options.agent)
  url.searchParams.set('max_risk', options.maxRisk)
  if (options.minStars) url.searchParams.set('min_stars', String(options.minStars))
  if (options.limit) url.searchParams.set('limit', String(options.limit))
  if (options.live) url.searchParams.set('live', 'true')
}

export class OpenAgentSkillClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly defaultAgent: OpenAgentSkillAgent
  private readonly defaultMaxRisk: OpenAgentSkillRisk

  constructor(options: OpenAgentSkillClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl)
    this.fetchImpl = options.fetchImpl || fetch
    this.defaultAgent = options.defaultAgent || 'auto'
    this.defaultMaxRisk = options.defaultMaxRisk || 'medium'
  }

  async resolve<T = unknown>(task: string, options: ResolveOptions = {}): Promise<T> {
    const url = new URL('/api/agent/resolve', this.baseUrl)
    appendResolveParams(url, task, {
      ...options,
      agent: options.agent || this.defaultAgent,
      maxRisk: options.maxRisk || this.defaultMaxRisk,
    })
    return readJsonResponse<T>(await this.fetchImpl(url))
  }

  async resolveLockfile<T = unknown>(task: string, options: ResolveOptions = {}): Promise<T> {
    const url = new URL('/api/agent/resolve', this.baseUrl)
    appendResolveParams(url, task, {
      ...options,
      agent: options.agent || this.defaultAgent,
      maxRisk: options.maxRisk || this.defaultMaxRisk,
    })
    url.searchParams.set('format', 'lockfile')
    return readJsonResponse<T>(await this.fetchImpl(url))
  }

  async receipt<T = unknown>(task: string, options: ResolveOptions = {}): Promise<T> {
    const url = new URL('/api/agent/receipt', this.baseUrl)
    appendResolveParams(url, task, {
      ...options,
      agent: options.agent || this.defaultAgent,
      maxRisk: options.maxRisk || this.defaultMaxRisk,
    })
    return readJsonResponse<T>(await this.fetchImpl(url))
  }

  async skill<T = unknown>(slug: string, options: { maxRisk?: OpenAgentSkillRisk } = {}): Promise<T> {
    const url = new URL(`/api/agent/skills/${encodeURIComponent(slug)}`, this.baseUrl)
    if (options.maxRisk) url.searchParams.set('max_risk', options.maxRisk)
    return readJsonResponse<T>(await this.fetchImpl(url))
  }

  async outcomeContract<T = unknown>(): Promise<T> {
    const url = new URL('/api/agent/outcome', this.baseUrl)
    url.searchParams.set('contract', 'true')
    return readJsonResponse<T>(await this.fetchImpl(url))
  }

  async reportOutcome<T = unknown>(payload: OutcomePayload): Promise<T> {
    const url = new URL('/api/agent/outcome', this.baseUrl)
    return readJsonResponse<T>(
      await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    )
  }
}

export function createOpenAgentSkillClient(options: OpenAgentSkillClientOptions = {}) {
  return new OpenAgentSkillClient(options)
}
