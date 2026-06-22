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
