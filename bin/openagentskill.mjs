#!/usr/bin/env node

const DEFAULT_BASE_URL = 'https://www.openagentskill.com'

function printHelp() {
  console.log(`OpenAgentSkill CLI

Usage:
  openagentskill resolve "<task>" [--agent codex] [--max-risk medium] [--min-stars 500]
  openagentskill install <slug> [--agent codex]
  openagentskill outcome <event_id> --skill <slug> --task "<task>" [--outcome success] [--agent codex]
  openagentskill evals

Environment:
  OPENAGENTSKILL_API_URL  Override API origin. Defaults to ${DEFAULT_BASE_URL}
`)
}

function parseFlags(args) {
  const flags = {}
  const rest = []

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (!arg.startsWith('--')) {
      rest.push(arg)
      continue
    }

    const key = arg.replace(/^--/, '').replace(/-([a-z])/g, (_, char) => char.toUpperCase())
    const next = args[index + 1]
    if (!next || next.startsWith('--')) {
      flags[key] = true
      continue
    }

    flags[key] = next
    index += 1
  }

  return { flags, rest }
}

async function readJson(response) {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(text || `Request failed with ${response.status}`)
  }
}

async function resolveSkill(baseUrl, task, flags) {
  const response = await fetch(`${baseUrl}/api/agent/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task,
      agent: flags.agent || 'auto',
      constraints: {
        max_risk: flags.maxRisk || 'medium',
        needs_install_command: flags.needsInstallCommand !== 'false',
        min_stars: Number(flags.minStars || 0),
      },
    }),
  })
  const payload = await readJson(response)
  if (!response.ok) throw new Error(payload.error || `Request failed with ${response.status}`)

  const selected = payload.selected
  console.log(`Task: ${payload.task}`)
  console.log(`Policy: ${payload.policy_decision.status}`)
  if (!selected) {
    console.log('No matching skill found.')
    return
  }

  console.log(`\nSelected: ${selected.skill.name} (${selected.skill.slug})`)
  console.log(`Match: ${selected.match_score}`)
  console.log(`Safety: ${selected.safety.score}/100 ${selected.safety.label}`)
  console.log(`Audit: ${selected.audit.audit_score}/100 ${selected.audit.risk_label}`)
  console.log(`Install: ${selected.install_plan.value}`)
  console.log(`URL: ${selected.urls.web}`)

  if (payload.feedback) {
    console.log(`\nFeedback event: ${payload.feedback.event_id}`)
    console.log(`Report outcome: ${payload.feedback.cli_example}`)
  }

  if (selected.safety.policy_warnings.length > 0) {
    console.log('\nPolicy warnings:')
    for (const warning of selected.safety.policy_warnings) console.log(`- ${warning}`)
  }

  if (payload.alternatives.length > 0) {
    console.log('\nAlternatives:')
    for (const item of payload.alternatives) {
      console.log(`- ${item.skill.name} (${item.skill.slug}) safety ${item.safety.score}/100`)
    }
  }
}

async function reportOutcome(baseUrl, eventId, flags) {
  if (!eventId) throw new Error('Missing event id. Example: openagentskill outcome resolve_123 --skill crawl4ai --task "scrape pricing"')
  if (!flags.skill) throw new Error('Missing --skill <slug>')
  if (!flags.task) throw new Error('Missing --task "<task>"')

  const response = await fetch(`${baseUrl}/api/agent/outcome`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: eventId,
      skill_slug: flags.skill,
      task: flags.task,
      agent: flags.agent || 'openagentskill-cli',
      outcome: flags.outcome || 'success',
      install_used: Boolean(flags.installUsed),
      risk_blocked: Boolean(flags.riskBlocked),
      setup_required: Boolean(flags.setupRequired),
      time_to_useful_ms: flags.timeToUsefulMs ? Number(flags.timeToUsefulMs) : null,
      notes: flags.notes || null,
      metadata: {
        source: 'openagentskill-cli',
      },
    }),
  })
  const payload = await readJson(response)
  if (!response.ok) throw new Error(payload.error || `Request failed with ${response.status}`)

  console.log(`Outcome recorded: ${payload.data?.outcome || flags.outcome || 'success'}`)
  console.log(`Skill: ${payload.data?.skill_slug || flags.skill}`)
  console.log(`Event: ${payload.data?.event_id || eventId}`)
}

async function installSkill(baseUrl, slug, flags) {
  const response = await fetch(`${baseUrl}/api/skills/${encodeURIComponent(slug)}/install`)
  const payload = await readJson(response)
  if (!response.ok) throw new Error(payload.error || `Request failed with ${response.status}`)

  const targets = payload.install_targets || []
  const target = targets.find((item) => item.id === flags.agent) || targets[0]
  const skillUrl = payload.urls?.web || `${baseUrl}/skills/${slug}`
  const auditUrl = payload.urls?.audit || `${skillUrl}/audit`

  console.log(`${payload.skill.name} (${payload.skill.slug})`)
  console.log(`Install: ${target?.value || payload.recommended_command}`)
  console.log(`Audit: ${auditUrl}`)
  console.log(`Skill: ${skillUrl}`)
}

async function runEvals(baseUrl) {
  const response = await fetch(`${baseUrl}/api/agent/evals`)
  const payload = await readJson(response)
  if (!response.ok) throw new Error(payload.error || `Request failed with ${response.status}`)

  const total = payload.total_cases || payload.total || 0
  console.log(`OpenAgentSkill evals: ${payload.passed}/${total} passed (${payload.pass_rate}%)`)
  for (const result of payload.results || []) {
    const mark = result.passed ? 'PASS' : 'FAIL'
    console.log(`${mark} ${result.id}: top score ${result.top_score}`)
  }
}

async function main() {
  const [, , command, ...args] = process.argv
  const baseUrl = (process.env.OPENAGENTSKILL_API_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
  const { flags, rest } = parseFlags(args)

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp()
    return
  }

  if (command === 'resolve') {
    const task = rest.join(' ').trim()
    if (!task) throw new Error('Missing task. Example: openagentskill resolve "scrape pricing pages"')
    await resolveSkill(baseUrl, task, flags)
    return
  }

  if (command === 'install') {
    const slug = rest[0]
    if (!slug) throw new Error('Missing slug. Example: openagentskill install crawl4ai')
    await installSkill(baseUrl, slug, flags)
    return
  }

  if (command === 'outcome') {
    await reportOutcome(baseUrl, rest[0], flags)
    return
  }

  if (command === 'evals') {
    await runEvals(baseUrl)
    return
  }

  throw new Error(`Unknown command: ${command}`)
}

main().catch((error) => {
  console.error(`Error: ${error.message}`)
  process.exit(1)
})
