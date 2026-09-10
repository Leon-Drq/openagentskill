import type { InstallTargetId } from '@/lib/install-targets'

const SITE_URL = 'https://www.openagentskill.com'

export type AgentIntegrationId = Extract<InstallTargetId, 'codex' | 'claude-code' | 'cursor'>

export interface AgentIntegration {
  id: AgentIntegrationId
  name: string
  surface: string
  best_for: string[]
  setup_steps: string[]
  default_task: string
  resolve_url: string
  receipt_url: string
  copy_prompt: string
  expected_output_contract: string[]
}

export interface AgentHandoffTemplateInput {
  task: string
  skillName: string
  skillSlug: string
  skillUrl: string
  auditUrl: string
  evalUrl: string
  installCommand: string
  installApiUrl: string
  autoInstallAllowed: boolean
  humanReviewRequired: boolean
  alternatives?: Array<{
    name: string
    slug: string
    url: string
    installCommand: string
  }>
}

const DEFAULT_TASK = 'scrape pricing pages and extract structured data'
const DEFAULT_MAX_RISK = 'medium'

function resolveUrl(agent: AgentIntegrationId, task = DEFAULT_TASK) {
  return `${SITE_URL}/api/agent/resolve?task=${encodeURIComponent(task)}&agent=${agent}&max_risk=${DEFAULT_MAX_RISK}`
}

function receiptUrl(agent: AgentIntegrationId, task = DEFAULT_TASK) {
  return `${SITE_URL}/api/agent/receipt?task=${encodeURIComponent(task)}&agent=${agent}&max_risk=${DEFAULT_MAX_RISK}&format=text`
}

function setupPrompt(agent: AgentIntegrationId, agentName: string) {
  const placeholderResolveUrl = `${SITE_URL}/api/agent/resolve?task={USER_TASK}&agent=${agent}&max_risk=${DEFAULT_MAX_RISK}`
  const placeholderReceiptUrl = `${SITE_URL}/api/agent/receipt?task={USER_TASK}&agent=${agent}&max_risk=${DEFAULT_MAX_RISK}&format=text`

  return [
    `You are using OpenAgentSkill as the skill resolution layer for ${agentName}.`,
    'Default to this conversation only: do not change project instructions, global configuration, or install packages.',
    `Read ${SITE_URL}/connect-check.mjs and, if Node.js 18+ is available and execution is authorized, run the inspected read-only check. Alternatively perform its documented HTTP/MCP requests with your existing tools.`,
    'Report API accessibility, MCP tool availability, and search success separately. Configuration saved remains not_verified unless you actually saved and reloaded the client configuration with user approval.',
    'For persistent MCP setup, request approval first, add https://www.openagentskill.com/api/mcp using the client supported remote HTTP MCP settings, preserve all existing servers, and verify native tool listing and one read-only search after reloading.',
    'If this client cannot access the network or call tools, explain that limitation; do not claim connected.',
    'Never transmit private task text, source code, credentials or environment values. Use a public, sanitized task description only.',
    'Before building a custom workflow from scratch, call the Resolve API with the user task.',
    'If selected is null or policy_decision reports no_match, explain that no eligible Skill was found. review_candidates are research leads, not installation recommendations; never invent an install command or approval for them.',
    `Resolve endpoint: ${placeholderResolveUrl}`,
    `Install receipt endpoint: ${placeholderReceiptUrl}`,
    'Use install_receipt as the stable pre-install record only after checking risk, safety_gate, and agent_handoff.review_checklist.',
    'If auto_install_allowed is false, ask for human approval before installing.',
    'If blocked is true or risk notes mention secrets, shell, token, or network risk, do not auto-install.',
    'After one narrow run, POST the result to install_receipt.outcome_feedback.endpoint with install_receipt.outcome_feedback.event_id so future rankings learn from real outcomes.',
    'Return the selected skill, install command, receipt id, alternatives, risk summary, outcome event id, and next action before changing files.',
  ].join('\n')
}

export const AGENT_INTEGRATIONS: AgentIntegration[] = [
  {
    id: 'codex',
    name: 'Codex',
    surface: 'Coding agent / local workspace',
    best_for: ['repo-aware implementation', 'code review', 'debugging', 'web automation setup'],
    setup_steps: [
      'Paste the copy prompt into this conversation first. Save project instructions or MCP settings only after explicit user approval.',
      'Call the Resolve API with the current task and agent=codex.',
      'Read agent_handoff.review_checklist before installing a third-party skill.',
      'Install only in the active workspace after reporting files and commands that will be touched.',
    ],
    default_task: DEFAULT_TASK,
    resolve_url: resolveUrl('codex'),
    receipt_url: receiptUrl('codex'),
    copy_prompt: setupPrompt('codex', 'Codex'),
    expected_output_contract: [
      'selected_skill',
      'install_command',
      'risk_summary',
      'outcome_event_id',
      'alternatives',
      'files_or_commands_to_touch',
      'next_action',
    ],
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    surface: 'Claude Code skill workflow',
    best_for: ['local skill instructions', 'project workflows', 'documentation-heavy tasks'],
    setup_steps: [
      'Paste the copy prompt at the start of a task. Persistent custom instructions or MCP setup require explicit user approval.',
      'Call the Resolve API with agent=claude-code.',
      'Use install targets only after audit and eval checks are acceptable.',
      'Keep the skill scoped to the project and summarize activation steps.',
    ],
    default_task: DEFAULT_TASK,
    resolve_url: resolveUrl('claude-code'),
    receipt_url: receiptUrl('claude-code'),
    copy_prompt: setupPrompt('claude-code', 'Claude Code'),
    expected_output_contract: [
      'selected_skill',
      'skill_files_or_instructions',
      'install_prompt',
      'risk_summary',
      'outcome_event_id',
      'activation_steps',
      'fallback_skill',
    ],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    surface: 'Cursor rules / agent instructions',
    best_for: ['project rules', 'repeatable coding workflows', 'IDE assistant guidance'],
    setup_steps: [
      'Paste the copy prompt into agent chat. Persistent rules or MCP settings require explicit user approval.',
      'Call the Resolve API with agent=cursor.',
      'Turn the selected skill into a narrow project rule only when the safety gate allows it.',
      'Keep generated rules task-scoped and avoid broad always-on instructions.',
    ],
    default_task: DEFAULT_TASK,
    resolve_url: resolveUrl('cursor'),
    receipt_url: receiptUrl('cursor'),
    copy_prompt: setupPrompt('cursor', 'Cursor'),
    expected_output_contract: [
      'selected_skill',
      'cursor_rule_or_prompt',
      'install_command',
      'risk_summary',
      'outcome_event_id',
      'when_to_use',
      'when_not_to_use',
    ],
  },
]

export function getAgentIntegrationKit() {
  return {
    version: 'openagentskill-agent-integration-kit-v2',
    connection_modes: {
      session: 'Default. Use the API in this conversation without saving configuration or installing anything.',
      persistent: 'Optional, only with explicit user approval. Add the remote HTTP MCP endpoint through the client supported settings, preserve existing servers, reload, then test tools in that client.',
    },
    self_check: {
      script_url: `${SITE_URL}/connect-check.mjs`,
      requirements: 'A network-capable agent with HTTP tools, or Node.js 18+ to run the inspected dependency-free script.',
      command: 'node connect-check.mjs',
      instructions: 'Download and inspect the script before authorizing execution. It reads public registry data only; it does not save configuration, install Skills, call a model API, or report installation outcomes.',
      expected_checks: ['api_accessible', 'tools_available', 'search_working'],
      configuration_saved: 'not_verified',
      client_verification: 'After any approved persistent setup, use the actual client MCP tool list and search_skills with query mono-color. A standalone script passing does not verify native client configuration.',
      failure_action: 'Report the failed stage and error. Do not claim connected, bypass safety checks, or install a Skill to make the test pass.',
    },
    purpose: 'Let an AI agent resolve a task into the right reusable skill, compare alternatives, review trust signals, and install with a safe handoff.',
    canonical_page: `${SITE_URL}/agent/integration-kit`,
    api: `${SITE_URL}/api/agent/integration-kit`,
    resolve_api: `${SITE_URL}/api/agent/resolve`,
    receipt_api: `${SITE_URL}/api/agent/receipt`,
    outcome_api: `${SITE_URL}/api/agent/outcome`,
    mcp: `${SITE_URL}/api/mcp`,
    sdk: '@openagentskill/sdk',
    manifest: `${SITE_URL}/.well-known/agent-manifest.json`,
    llms: `${SITE_URL}/llms.txt`,
    supported_agents: AGENT_INTEGRATIONS,
    recommended_flow: [
      'Read /llms.txt or /.well-known/agent-manifest.json.',
      'Default to session-only HTTP calls. Configure /api/mcp for native tool calls only with explicit user approval.',
      'Choose the Codex, Claude Code, or Cursor template for the active agent surface.',
      'Call /api/agent/resolve with task, agent, max_risk, and optional min_stars.',
      'Read install_receipt, recommendation.best_skill, recommendation.install, recommendation.risk, and agent_handoff.',
      'Fetch /api/agent/receipt?task=...&agent=...&format=text when a compact pre-install execution record is easier for the agent runtime.',
      'If auto_install_allowed is false, ask for human approval before installing.',
      'Fetch /api/agent/evals and /api/agent/skills/{slug} before production use.',
      'Install in a sandbox or low-risk workspace first.',
      'Report success, failed, not_relevant, blocked_by_risk, or setup_required to /api/agent/outcome with output_quality, workspace, and error_type when available.',
    ],
    stable_response_fields: [
      'feedback.event_id',
      'feedback.outcome_api',
      'feedback.cli_example',
      'install_receipt.receipt_id',
      'install_receipt.selected_skill',
      'install_receipt.install',
      'install_receipt.risk',
      'install_receipt.outcome_feedback',
      'agent_feedback_loop',
      'recommendation.best_skill',
      'recommendation.install',
      'recommendation.why_recommended',
      'recommendation.risk',
      'recommendation.alternatives',
      'recommendation_lanes.best_match',
      'recommendation_lanes.safer_alternative',
      'recommendation_lanes.popular_alternative',
      'recommendation_lanes.new_contender',
      'recommendation_lanes.no_skill_option',
      'agent_handoff.platform_templates',
      'agent_handoff.review_checklist',
      'agent_handoff.api_sequence',
      'policy_decision',
      'review_candidates',
    ],
    safety_rules: [
      'Do not auto-install when safety_gate.blocked is true.',
      'Do not auto-install when recommendation.install.auto_install_allowed is false.',
      'Escalate for human approval when shell, env, token, network, license, or unclear maintenance risk appears.',
      'Prefer a lower-risk alternative when the selected skill has high risk notes.',
    ],
  }
}

export function buildAgentHandoffTemplates(input: AgentHandoffTemplateInput) {
  const alternatives = input.alternatives?.slice(0, 3) || []
  const alternativeText = alternatives.length
    ? alternatives.map((item) => `- ${item.name} (${item.slug}): ${item.url}`).join('\n')
    : '- No safer alternative returned by the resolver.'
  const installPolicy = input.autoInstallAllowed
    ? 'Auto-install is allowed after normal workspace review.'
    : input.humanReviewRequired
      ? 'Human review is required before install.'
      : 'Manual review is recommended before install.'

  return AGENT_INTEGRATIONS.map((integration) => ({
    id: integration.id,
    name: integration.name,
    surface: integration.surface,
    copy_prompt: [
      `Task: ${input.task}`,
      `Selected skill: ${input.skillName} (${input.skillSlug})`,
      `Skill URL: ${input.skillUrl}`,
      `Audit URL: ${input.auditUrl}`,
      `Eval URL: ${input.evalUrl}`,
      `Install handoff: ${input.installApiUrl}`,
      `Install command: ${input.installCommand}`,
      `Install policy: ${installPolicy}`,
      'Outcome feedback: use install_receipt.outcome_feedback.event_id or feedback.event_id from the Resolve API and report the result to /api/agent/outcome after one narrow run. Include outcome, install_used, task_success, output_quality, workspace, error_type, and human_review_required when known.',
      '',
      'Before installing:',
      '1. Read the audit and eval result.',
      '2. Report risk notes and files or commands that will be touched.',
      '3. Install only in a sandbox or low-risk workspace first.',
      '4. If risk is unacceptable, use an alternative.',
      '',
      'Alternatives:',
      alternativeText,
      '',
      `Expected ${integration.name} output:`,
      integration.expected_output_contract.map((field) => `- ${field}`).join('\n'),
    ].join('\n'),
  }))
}
