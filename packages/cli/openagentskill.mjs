#!/usr/bin/env node

import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'

const DEFAULT_BASE_URL = 'https://www.openagentskill.com'
const CLI_VERSION = '0.2.1'
const SOURCE_COMMAND = 'npx --yes https://github.com/Leon-Drq/openagentskill/releases/download/cli-v0.2.1/openagentskill-0.2.1.tgz'
const KNOWN_AGENTS = new Set(['codex', 'claude-code', 'cursor', 'open-claw'])

function help() {
  console.log(`OpenAgentSkill CLI

Usage:
  openagentskill search "<task>" [--limit 5] [--json]
  openagentskill resolve "<task>" [--agent codex] [--max-risk medium] [--json]
  openagentskill lock "<task>" [--agent codex] [--json]
  openagentskill inspect <slug> [--json]
  openagentskill install <slug> [--agent codex] [--dry-run] [--yes] [--no-telemetry]
  openagentskill receipt "<task>" [--agent codex] [--json]
  openagentskill pack <pack-slug> [--limit 6] [--json]
  openagentskill outcome <event-id> --skill <slug> --task "<task>" [--outcome success]
  openagentskill outcome-contract [--json]
  openagentskill evals [--json]

Safety:
  --dry-run       Print the reviewed installer plan without changing files
  --yes           Confirm a reviewed install; blocked Skills are never executed
  --no-telemetry  Do not report the anonymous install result

Environment:
  OPENAGENTSKILL_API_URL   API origin (default: ${DEFAULT_BASE_URL})
  OPENAGENTSKILL_TELEMETRY Set to 0/false/off to disable outcome reporting
`)
}

function parseArgs(args) {
  const flags = {}
  const rest = []
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]
    if (!value.startsWith('--')) {
      rest.push(value)
      continue
    }
    const key = value.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
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

function jsonEnabled(flags) {
  return Boolean(flags.json || flags.format === 'json')
}

async function request(baseUrl, path, init) {
  const response = await fetch(`${baseUrl}${path}`, init)
  const text = await response.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    payload = { error: text || `HTTP ${response.status}` }
  }
  if (!response.ok) throw new Error(payload.error || payload.message || `HTTP ${response.status}`)
  return payload
}

function print(value, flags) {
  if (jsonEnabled(flags)) console.log(JSON.stringify(value, null, 2))
}

async function search(baseUrl, task, flags) {
  const params = new URLSearchParams({ task, limit: String(flags.limit || 5) })
  const payload = await request(baseUrl, `/api/skills/search?${params}`)
  if (jsonEnabled(flags)) return print(payload, flags)
  console.log(`Search: ${payload.query}`)
  if (!payload.skills?.length) {
    console.log('No direct match. OpenAgentSkill refused to recommend an unrelated Skill.')
    return
  }
  for (const skill of payload.skills) {
    console.log(`\n${skill.rank}. ${skill.name} (${skill.slug})`)
    console.log(`   Match ${skill.match_score}/99 | Trust ${skill.trust.score}/100 | Audit ${skill.audit.audit_score}/100`)
    console.log(`   Verified installs ${skill.stats.verified_installs || 0} | Outcomes ${skill.stats.total_outcomes || 0}`)
    console.log(`   Install: ${SOURCE_COMMAND} install ${skill.slug}`)
  }
}

async function resolve(baseUrl, task, flags) {
  const payload = await request(baseUrl, '/api/agent/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      task,
      agent: flags.agent || 'auto',
      live: true,
      constraints: {
        max_risk: flags.maxRisk || 'medium',
        min_stars: Number(flags.minStars || 0),
        needs_install_command: true,
      },
    }),
  })
  if (jsonEnabled(flags)) return print(payload, flags)
  if (!payload.selected) {
    console.log('No direct match. OpenAgentSkill refused to recommend an unrelated Skill.')
    return
  }
  const selected = payload.selected
  console.log(`${selected.skill.name} (${selected.skill.slug})`)
  console.log(`Match: ${selected.match_score}/99`)
  console.log(`Policy: ${payload.policy_decision.status}`)
  console.log(`Safety: ${selected.safety.score}/100 ${selected.safety.label}`)
  console.log(`Audit: ${selected.audit.audit_score}/100 ${selected.audit.risk_label}`)
  console.log(`Why: ${selected.recommendation_reasons.join('; ')}`)
  console.log(`Install: ${SOURCE_COMMAND} install ${selected.skill.slug} --agent ${flags.agent || 'codex'}`)
}

async function lock(baseUrl, task, flags) {
  const payload = await request(baseUrl, '/api/agent/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      task,
      agent: flags.agent || 'auto',
      live: true,
      format: 'lockfile',
      constraints: { max_risk: flags.maxRisk || 'medium', needs_install_command: true },
    }),
  })
  console.log(JSON.stringify(payload, null, 2))
}

async function inspect(baseUrl, slug, flags) {
  const payload = await request(baseUrl, `/api/skills/${encodeURIComponent(slug)}/install`)
  if (jsonEnabled(flags)) return print(payload, flags)
  console.log(`${payload.skill.name} (${payload.skill.slug})`)
  console.log(payload.skill.description)
  console.log(`Repository: ${payload.skill.repository}`)
  console.log(`Safety: ${payload.safety_gate.label} (${payload.safety_gate.auto_install_policy})`)
  console.log(`Auto install: ${payload.safety_gate.auto_install_allowed ? 'allowed' : 'not allowed'}`)
  for (const item of payload.safety_checklist || []) console.log(`- ${item}`)
}

function parseSafeSkillsCommand(command) {
  const normalized = String(command || '').trim()
  const match = normalized.match(
    /^npx(?:\s+-y)?\s+skills\s+add\s+([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)(?:\s+--skill\s+([A-Za-z0-9_.-]+))?$/
  )
  if (!match) throw new Error('Registry install command is not a safe standard skills command')
  return { repository: match[1], skill: match[2] || null }
}

function runInstaller({ repository, skill, agent }) {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const args = ['-y', 'skills', 'add', repository, '--yes']
  if (skill) args.push('--skill', skill)
  if (agent && KNOWN_AGENTS.has(agent)) args.push('--agent', agent)

  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, { stdio: 'inherit', shell: false })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`skills installer exited with ${code ?? signal ?? 'unknown status'}`))
    })
  })
}

function telemetryEnabled(flags) {
  if (flags.noTelemetry) return false
  const value = String(process.env.OPENAGENTSKILL_TELEMETRY || '1').toLowerCase()
  return !['0', 'false', 'off', 'no'].includes(value)
}

async function reportInstall(baseUrl, payload, eventId, agent, outcome, notes, flags) {
  if (!telemetryEnabled(flags)) return null
  return request(baseUrl, '/api/agent/outcome', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      event_id: eventId,
      skill_slug: payload.skill.slug,
      task: `Install ${payload.skill.name}`,
      agent: agent || 'openagentskill-cli',
      outcome,
      install_used: true,
      task_success: outcome === 'success',
      error_type: outcome === 'success' ? null : 'install_failed',
      workspace: 'local',
      notes,
      metadata: { source: 'openagentskill-cli', cli_version: CLI_VERSION },
    }),
  }).catch(() => null)
}

async function install(baseUrl, slug, flags) {
  const payload = await request(baseUrl, `/api/skills/${encodeURIComponent(slug)}/install`)
  if (payload.safety_gate?.blocked) {
    throw new Error(`Install blocked by safety policy: ${payload.safety_gate.recommended_action}`)
  }
  const plan = parseSafeSkillsCommand(payload.recommended_command)
  const agent = flags.agent || 'codex'
  if (flags.agent && !KNOWN_AGENTS.has(flags.agent)) {
    throw new Error(`Unsupported --agent. Use one of: ${[...KNOWN_AGENTS].join(', ')}`)
  }

  console.log(`${payload.skill.name} (${payload.skill.slug})`)
  console.log(`Repository: ${payload.skill.repository}`)
  console.log(`Policy: ${payload.safety_gate.label} (${payload.safety_gate.auto_install_policy})`)
  console.log(`Installer: npx -y skills add ${plan.repository}${plan.skill ? ` --skill ${plan.skill}` : ''} --agent ${agent}`)

  if (flags.dryRun) {
    console.log('Dry run complete. No files changed and no install outcome was reported.')
    return
  }
  if (payload.safety_gate.human_review_required && !flags.yes) {
    throw new Error('Human review is required. Inspect the repository and rerun with --yes, or use --dry-run.')
  }

  const eventId = `install_${randomUUID()}`
  try {
    await runInstaller({ ...plan, agent })
    await reportInstall(baseUrl, payload, eventId, agent, 'success', 'Installer completed successfully.', flags)
    console.log(`Verified install completed. Receipt: ${eventId}`)
  } catch (error) {
    await reportInstall(baseUrl, payload, eventId, agent, 'failed', error.message, flags)
    throw error
  }
}

async function receipt(baseUrl, task, flags) {
  const params = new URLSearchParams({
    task,
    agent: flags.agent || 'auto',
    max_risk: flags.maxRisk || 'medium',
    format: jsonEnabled(flags) ? 'json' : 'text',
  })
  const response = await fetch(`${baseUrl}/api/agent/receipt?${params}`)
  const text = await response.text()
  if (!response.ok) throw new Error(text || `HTTP ${response.status}`)
  console.log(jsonEnabled(flags) ? JSON.stringify(JSON.parse(text), null, 2) : text)
}

async function pack(baseUrl, slug, flags) {
  const params = new URLSearchParams({
    limit: String(flags.limit || 6),
    format: jsonEnabled(flags) ? 'json' : 'text',
  })
  const response = await fetch(`${baseUrl}/api/agent/packs/${encodeURIComponent(slug)}?${params}`)
  const text = await response.text()
  if (!response.ok) throw new Error(text || `HTTP ${response.status}`)
  console.log(jsonEnabled(flags) ? JSON.stringify(JSON.parse(text), null, 2) : text)
}

async function outcome(baseUrl, eventId, flags) {
  if (!eventId || !flags.skill || !flags.task) {
    throw new Error('Outcome requires <event-id>, --skill <slug>, and --task "<task>"')
  }
  const payload = await request(baseUrl, '/api/agent/outcome', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      event_id: eventId,
      skill_slug: flags.skill,
      task: flags.task,
      agent: flags.agent || 'openagentskill-cli',
      outcome: flags.outcome || 'success',
      install_used: Boolean(flags.installUsed),
      task_success: flags.outcome ? flags.outcome === 'success' : true,
      output_quality: flags.outputQuality ? Number(flags.outputQuality) : null,
      used_in_production: Boolean(flags.usedInProduction),
      workspace: flags.workspace || 'unknown',
      evidence_url: flags.evidenceUrl || null,
      notes: flags.notes || null,
      dry_run: Boolean(flags.dryRun),
      metadata: { source: 'openagentskill-cli', cli_version: CLI_VERSION },
    }),
  })
  if (jsonEnabled(flags)) return print(payload, flags)
  console.log(`${payload.dry_run ? 'Validated' : 'Recorded'}: ${flags.outcome || 'success'} for ${flags.skill}`)
}

async function evals(baseUrl, flags) {
  const payload = await request(baseUrl, '/api/agent/evals')
  if (jsonEnabled(flags)) return print(payload, flags)
  console.log(`Registry evals: ${payload.passed}/${payload.total_cases || payload.total} passed (${payload.pass_rate}%)`)
  for (const result of payload.results || []) {
    if (!result.passed) console.log(`FAIL ${result.id}: ${result.task}`)
  }
}

async function outcomeContract(baseUrl, flags) {
  const payload = await request(baseUrl, '/api/agent/outcome?contract=true')
  if (jsonEnabled(flags)) return print(payload, flags)
  console.log(`Outcome contract: ${payload.version}`)
  console.log(`Required: ${(payload.required_fields || []).join(', ')}`)
  console.log(`Outcomes: ${(payload.outcomes || []).join(', ')}`)
  console.log(`Endpoint: ${payload.endpoint}`)
}

async function main() {
  const [, , command, ...args] = process.argv
  const baseUrl = String(process.env.OPENAGENTSKILL_API_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
  const { flags, rest } = parseArgs(args)
  if (!command || ['help', '--help', '-h'].includes(command)) return help()

  if (command === 'search') return search(baseUrl, rest.join(' ').trim(), flags)
  if (command === 'resolve') return resolve(baseUrl, rest.join(' ').trim(), flags)
  if (command === 'lock') return lock(baseUrl, rest.join(' ').trim(), flags)
  if (command === 'inspect') return inspect(baseUrl, rest[0], flags)
  if (command === 'install') return install(baseUrl, rest[0], flags)
  if (command === 'receipt') return receipt(baseUrl, rest.join(' ').trim(), flags)
  if (command === 'pack') return pack(baseUrl, rest[0], flags)
  if (command === 'outcome') return outcome(baseUrl, rest[0], flags)
  if (command === 'outcome-contract') return outcomeContract(baseUrl, flags)
  if (command === 'evals') return evals(baseUrl, flags)
  throw new Error(`Unknown command: ${command}`)
}

main().catch((error) => {
  console.error(`Error: ${error.message}`)
  process.exitCode = 1
})
