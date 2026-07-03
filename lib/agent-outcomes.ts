import type { InstallTargetId } from '@/lib/install-targets'

const SITE_URL = 'https://www.openagentskill.com'

export const AGENT_OUTCOMES = [
  'success',
  'failed',
  'not_relevant',
  'blocked_by_risk',
  'setup_required',
] as const

export type AgentOutcome = (typeof AGENT_OUTCOMES)[number]

export const AGENT_OUTCOME_ERROR_TYPES = [
  'install_failed',
  'runtime_error',
  'not_relevant',
  'permission_blocked',
  'risk_blocked',
  'setup_required',
  'low_quality_output',
  'missing_dependency',
  'timeout',
  'other',
] as const

export type AgentOutcomeErrorType = (typeof AGENT_OUTCOME_ERROR_TYPES)[number]

export const AGENT_OUTCOME_WORKSPACES = [
  'sandbox',
  'local',
  'ci',
  'production',
  'unknown',
] as const

export type AgentOutcomeWorkspace = (typeof AGENT_OUTCOME_WORKSPACES)[number]
export const AGENT_OUTCOME_PROTOCOL_VERSION = 'openagentskill-agent-outcome-v3'

export interface AgentOutcomeQualityFields {
  task_success?: boolean | null
  output_quality?: number | null
  error_type?: AgentOutcomeErrorType | null
  human_review_required?: boolean
  used_in_production?: boolean
  workspace?: AgentOutcomeWorkspace
  evidence_url?: string | null
}

export interface ResolveFeedbackInput {
  task: string
  agent: InstallTargetId | 'auto'
  selectedSlug?: string | null
  selectedName?: string | null
  alternativeSlugs?: string[]
}

function shellQuote(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export function createResolveEventId() {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return `resolve_${randomId}`
}

export function buildOutcomeCommand(input: {
  eventId: string
  skillSlug: string
  task: string
  agent: string
  outcome?: AgentOutcome
}) {
  return [
    'npx openagentskill outcome',
    shellQuote(input.eventId),
    '--skill',
    shellQuote(input.skillSlug),
    '--task',
    shellQuote(input.task),
    '--agent',
    shellQuote(input.agent || 'auto'),
    '--outcome',
    input.outcome || 'success',
  ].join(' ')
}

export function buildOutcomeMetadata(input: AgentOutcomeQualityFields & {
  outcome: AgentOutcome
  metadata?: Record<string, unknown>
}) {
  const taskSuccess = input.task_success ?? input.outcome === 'success'

  return {
    ...(input.metadata || {}),
    outcome_protocol: AGENT_OUTCOME_PROTOCOL_VERSION,
    task_success: taskSuccess,
    output_quality: input.output_quality ?? null,
    error_type: input.error_type ?? null,
    human_review_required: Boolean(input.human_review_required),
    used_in_production: Boolean(input.used_in_production),
    workspace: input.workspace || 'unknown',
    evidence_url: input.evidence_url || null,
  }
}

export function buildOutcomeTrustImpact(input: {
  outcome: AgentOutcome
  installUsed?: boolean
  riskBlocked?: boolean
  setupRequired?: boolean
  outputQuality?: number | null
}) {
  const positive: string[] = []
  const negative: string[] = []

  if (input.outcome === 'success') positive.push('adds successful agent outcome evidence')
  if (input.installUsed) positive.push('adds install-attempt evidence')
  if (input.outputQuality && input.outputQuality >= 4) positive.push('adds high output-quality signal')

  if (input.outcome === 'failed') negative.push('adds failed run evidence')
  if (input.outcome === 'not_relevant') negative.push('adds task-fit penalty')
  if (input.outcome === 'blocked_by_risk' || input.riskBlocked) negative.push('adds risk-block penalty')
  if (input.outcome === 'setup_required' || input.setupRequired) negative.push('adds setup-friction penalty')
  if (input.outputQuality && input.outputQuality <= 2) negative.push('adds low output-quality signal')

  return {
    trust_score_version: 'trust-score-v5',
    affects: [
      'Trust Score v5 outcome confidence',
      'Real agent outcomes dimension',
      'Resolve ranking adoption evidence',
      'Skill detail outcome signals',
      'Outcome leaderboard',
    ],
    positive,
    negative,
    note:
      'Raw notes stay private. Public pages use aggregate outcome counts, success rate, install attempts, risk blocks, and setup-required counts.',
  }
}

export function buildResolveFeedback(input: ResolveFeedbackInput) {
  const eventId = createResolveEventId()
  const skillSlug = input.selectedSlug || '<selected-skill-slug>'

  return {
    event_id: eventId,
    outcome_api: `${SITE_URL}/api/agent/outcome`,
    method: 'POST',
    selected_skill_slug: input.selectedSlug || null,
    selected_skill_name: input.selectedName || null,
    alternative_skill_slugs: input.alternativeSlugs || [],
    expected_outcomes: AGENT_OUTCOMES,
    report_after: [
      'After trying the selected skill, report whether it solved the task.',
      'Mark blocked_by_risk when audit, license, credentials, shell, or network risk prevents safe use.',
      'Mark setup_required when the skill looks relevant but needs missing keys, data, or manual configuration.',
      'Mark not_relevant when the selected skill does not match the task after inspection.',
      'Include output_quality, error_type, workspace, human_review_required, evidence_url, and time_to_useful_ms when available.',
    ],
    json_example: {
      event_id: eventId,
      skill_slug: skillSlug,
      task: input.task,
      agent: input.agent || 'auto',
      outcome: 'success' as AgentOutcome,
      install_used: true,
      risk_blocked: false,
      setup_required: false,
      task_success: true,
      output_quality: 4,
      error_type: null,
      human_review_required: false,
      workspace: 'sandbox',
      time_to_useful_ms: 120000,
      notes: 'Solved the task in a sandbox workflow.',
    },
    cli_example: buildOutcomeCommand({
      eventId,
      skillSlug,
      task: input.task,
      agent: input.agent || 'auto',
      outcome: 'success',
    }),
  }
}
