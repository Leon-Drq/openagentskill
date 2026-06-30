'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Copy, Loader2, Search, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'

type ResolveSkillSummary = {
  slug: string
  name: string
  description: string
  category?: string
  url?: string
  audit_url?: string
  repository?: string
}

type AgentProvenSummary = {
  score: number
  label: string
  summary: string
  metrics: {
    totalOutcomes: number
    successfulOutcomes?: number
    failedOutcomes?: number
    installAttempts?: number
    successRate: number | null
    recentSuccessRate: number | null
    recentFailureRate: number | null
    installSuccessRate: number | null
    avgOutputQuality: number | null
    productionOutcomes: number
    riskBlocked?: number
    setupRequired?: number
    uniqueAgents?: number
  }
  signals?: string[]
  penalties?: string[]
}

type ResolvePayload = {
  task: string
  agent: string
  recommendation?: {
    best_skill: ResolveSkillSummary
    install: {
      command: string
      target: string
      label: string
      ready: boolean
      review_required: boolean
      auto_install_allowed: boolean
      policy: string
    }
    why_recommended: string[]
    trust_score_v4?: {
      score: number
      label: string
      version?: string
      install_policy: string
      evidence?: Record<string, string> | Array<{ label: string; value: string | number | boolean }>
      agent_compatibility?: string[]
      risk?: unknown
    }
    trust_score_v3?: {
      score: number
      label: string
      version?: string
      install_policy: string
      evidence?: Record<string, string> | Array<{ label: string; value: string | number | boolean }>
      agent_compatibility?: string[]
      risk?: unknown
    }
    trust_score_v2: {
      score: number
      label: string
      version?: string
      install_policy: string
      evidence?: Record<string, string> | Array<{ label: string; value: string | number | boolean }>
      agent_compatibility?: string[]
      risk?: unknown
    }
    risk: {
      level: string
      safety_tier: string
      safety: string
      trust: string
      notes: string[]
    }
    safety_gate: {
      label: string
      auto_install_policy: string
      auto_install_allowed: boolean
      human_review_required: boolean
      blocked: boolean
      recommended_action: string
      reasons: string[]
    }
    supply_asset: {
      track: { label: string; shortLabel: string }
      scenario: { label: string; description: string }
      maintenance: { label: string; status: string }
      github_quality: { label: string; score: number }
      coverage_tags: string[]
    }
    alternatives: Array<{
      slug: string
      name: string
      url: string
      install_command: string
      trust_score: number
      audit_score: number
      safety_score: number
      why_consider: string
      risk: {
        level: string
        safety_tier: string
        notes: string[]
      }
    }>
    agent_instruction: string
  } | null
  feedback?: {
    event_id: string
    outcome_api: string
    cli_example: string
    expected_outcomes: string[]
  }
  install_receipt?: {
    receipt_id: string
    urls: {
      json: string
      text: string
      web: string
    }
    install: {
      command: string
      policy: string
      auto_install_allowed: boolean
      human_review_required: boolean
      sandbox_first: boolean
    }
    outcome_feedback: {
      event_id: string
      endpoint: string
      cli_example: string
    }
    agent_proven?: AgentProvenSummary | null
    next_steps: string[]
  } | null
  selected?: {
    match_score: number
    supply_profile: {
      track: { label: string; shortLabel: string }
      scenario: { label: string; description: string }
      applicableAgents: string[]
      install: { targetCount: number; ready: boolean }
      maintenance: { label: string }
      risk: { label: string; notes: string[] }
    }
    safety: {
      score: number
      label: string
      policy_warnings: string[]
    }
    audit: {
      audit_score: number
      risk_label: string
      warnings: string[]
    }
    trust: {
      score: number
      label: string
    }
    agent_proven?: AgentProvenSummary | null
  } | null
  policy_decision: {
    status: string
    summary: string
  }
  meta?: {
    total_skills_searched: number
    total_candidates: number
    generated_at: string
  }
}

const exampleTasks = [
  'Analyze stock news and summarize market risks',
  'Scrape competitor pricing pages into a table',
  'Parse PDFs and extract tables for a report',
  'Build a World Cup analytics dashboard',
  'Review a pull request and generate tests',
]

function compactStatus(value: string) {
  return value.replace(/_/g, ' ')
}

function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? 'No data' : `${Math.round(value)}%`
}

function formatQuality(value: number | null | undefined) {
  return value === null || value === undefined ? 'No data' : `${Number(value).toFixed(1)}/5`
}

function copyText(value: string) {
  void navigator.clipboard?.writeText(value)
}

export function AgentResolveWorkbench({ initialTask = '' }: { initialTask?: string }) {
  const [task, setTask] = useState(initialTask || exampleTasks[0])
  const [agent, setAgent] = useState('codex')
  const [maxRisk, setMaxRisk] = useState('medium')
  const [minStars, setMinStars] = useState('0')
  const [live, setLive] = useState(false)
  const [payload, setPayload] = useState<ResolvePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      task,
      agent,
      max_risk: maxRisk,
      min_stars: minStars || '0',
    })
    if (live) params.set('live', 'true')
    return `/api/agent/resolve?${params.toString()}`
  }, [agent, live, maxRisk, minStars, task])

  const receiptUrl = useMemo(() => {
    const params = new URLSearchParams({
      task,
      agent,
      max_risk: maxRisk,
      min_stars: minStars || '0',
      format: 'text',
    })
    if (live) params.set('live', 'true')
    return `/api/agent/receipt?${params.toString()}`
  }, [agent, live, maxRisk, minStars, task])

  async function resolveTask(nextTask = task) {
    const trimmedTask = nextTask.trim()
    if (!trimmedTask) return

    setTask(trimmedTask)
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        task: trimmedTask,
        agent,
        max_risk: maxRisk,
        min_stars: minStars || '0',
      })
      if (live) params.set('live', 'true')

      const response = await fetch(`/api/agent/resolve?${params.toString()}`)
      if (!response.ok) throw new Error(`Resolve failed with status ${response.status}`)
      setPayload((await response.json()) as ResolvePayload)
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : 'Failed to resolve this task')
      setPayload(null)
    } finally {
      setIsLoading(false)
    }
  }

  const recommendation = payload?.recommendation
  const selected = payload?.selected
  const trustScore =
    recommendation?.trust_score_v4 || recommendation?.trust_score_v3 || recommendation?.trust_score_v2
  const agentProven = selected?.agent_proven || payload?.install_receipt?.agent_proven || null

  return (
    <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <section className="border border-border bg-card/85 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Agent Resolve</p>
            <h2 className="mt-3 font-display text-2xl font-normal">Describe the task. Get one skill plan.</h2>
          </div>
          <span className="hidden rounded-[8px] border border-border px-2.5 py-1 font-mono text-xs text-secondary sm:inline-flex">
            API ready
          </span>
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void resolveTask()
          }}
        >
          <label className="block">
            <span className="mb-2 block font-mono text-xs uppercase tracking-[0.18em] text-secondary">Task</span>
            <textarea
              value={task}
              onChange={(event) => setTask(event.target.value)}
              className="min-h-32 w-full resize-none border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-foreground"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.18em] text-secondary">Agent</span>
              <select
                value={agent}
                onChange={(event) => setAgent(event.target.value)}
                className="h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
              >
                <option value="codex">Codex</option>
                <option value="claude-code">Claude Code</option>
                <option value="cursor">Cursor</option>
                <option value="openagentskill-cli">OpenAgentSkill CLI</option>
                <option value="auto">Auto</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.18em] text-secondary">Max risk</span>
              <select
                value={maxRisk}
                onChange={(event) => setMaxRisk(event.target.value)}
                className="h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block font-mono text-xs uppercase tracking-[0.18em] text-secondary">Min stars</span>
              <input
                value={minStars}
                onChange={(event) => setMinStars(event.target.value.replace(/[^\d]/g, ''))}
                inputMode="numeric"
                className="h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
              />
            </label>
          </div>

          <label className="flex items-start gap-3 border border-border bg-background p-3 text-sm text-secondary">
            <input
              type="checkbox"
              checked={live}
              onChange={(event) => setLive(event.target.checked)}
              className="mt-1"
            />
            <span>
              Use live registry data. Faster default mode uses the curated low-latency candidate pool for agent calls.
            </span>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isLoading || task.trim().length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#006b4f] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
              Resolve skill
            </button>
            <button
              type="button"
              onClick={() => copyText(apiUrl)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy API URL
            </button>
            <button
              type="button"
              onClick={() => copyText(receiptUrl)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy receipt
            </button>
            <button
              type="button"
              onClick={() => copyText(recommendation?.agent_instruction || apiUrl)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy agent prompt
            </button>
          </div>
        </form>

        <div className="mt-5">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-secondary">Try one</p>
          <div className="grid gap-2">
            {exampleTasks.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => void resolveTask(example)}
                className="flex items-center justify-between gap-3 border border-border bg-background px-3 py-2 text-left text-sm text-secondary transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <span>{example}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="min-w-0 border border-border bg-background">
        <div className="border-b border-border p-4 sm:p-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Recommendation</p>
          <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <h2 className="font-display text-2xl font-normal">
              {recommendation?.best_skill.name || 'Resolve output will appear here'}
            </h2>
            {payload?.policy_decision && (
              <span className="w-fit border border-border px-2.5 py-1 font-mono text-xs uppercase tracking-[0.14em] text-secondary">
                {compactStatus(payload.policy_decision.status)}
              </span>
            )}
          </div>
          {error && (
            <div className="mt-4 flex gap-3 border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}
        </div>

        {!payload && !error && (
          <div className="grid min-h-[520px] place-items-center p-8 text-center">
            <div className="max-w-md">
              <ShieldCheck className="mx-auto h-8 w-8 text-[#006b4f]" aria-hidden="true" />
              <h3 className="mt-4 font-display text-2xl font-normal">The registry returns a decision, not just links.</h3>
              <p className="mt-3 text-sm leading-6 text-secondary">
                Your agent gets one recommended skill, alternatives, install command, Trust Score, audit summary, and a safety policy before it acts.
              </p>
            </div>
          </div>
        )}

        {payload && recommendation && (
          <div className="divide-y divide-border">
            <div className="grid gap-px bg-border sm:grid-cols-5">
              {[
                ['Match', selected?.match_score ?? '-'],
                ['Proven', agentProven ? agentProven.score : '-'],
                ['Trust', trustScore?.score ?? '-'],
                ['Audit', selected?.audit.audit_score ?? '-'],
                ['Safety', selected?.safety.score ?? '-'],
              ].map(([label, value]) => (
                <div key={label} className="bg-card p-4 text-center">
                  <div className="font-mono text-2xl">{value}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">{label}</div>
                </div>
              ))}
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-sm leading-6 text-secondary">{recommendation.best_skill.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={recommendation.best_skill.url || `/skills/${recommendation.best_skill.slug}`}
                  className="rounded-[8px] bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-85"
                >
                  Open skill
                </Link>
                <Link
                  href={recommendation.best_skill.audit_url || `/skills/${recommendation.best_skill.slug}/audit`}
                  className="rounded-[8px] border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40"
                >
                  Audit page
                </Link>
                {recommendation.best_skill.repository && (
                  <a
                    href={recommendation.best_skill.repository}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[8px] border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40"
                  >
                    GitHub
                  </a>
                )}
              </div>
            </div>

            <div className="grid gap-px bg-border md:grid-cols-2">
              <div className="bg-background p-4 sm:p-5">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Install plan</p>
                <code className="mt-3 block break-words border border-border bg-card p-3 font-mono text-xs leading-5 [overflow-wrap:anywhere]">
                  {recommendation.install.command}
                </code>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-secondary">
                  <span className="border border-border px-2 py-1">{recommendation.install.label}</span>
                  <span className="border border-border px-2 py-1">{recommendation.install.policy}</span>
                  <span className="border border-border px-2 py-1">{recommendation.install.ready ? 'Ready' : 'Review needed'}</span>
                </div>
              </div>

              <div className="bg-background p-4 sm:p-5">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Structured fields</p>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3 border-b border-border pb-2">
                    <span className="text-secondary">Scenario</span>
                    <span className="text-right">{recommendation.supply_asset.scenario.label}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-border pb-2">
                    <span className="text-secondary">Agent surface</span>
                    <span className="text-right">{selected?.supply_profile.applicableAgents.slice(0, 3).join(' + ') || agent}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-border pb-2">
                    <span className="text-secondary">Maintenance</span>
                    <span className="text-right">{recommendation.supply_asset.maintenance.label}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-secondary">GitHub quality</span>
                    <span className="text-right">{recommendation.supply_asset.github_quality.label}</span>
                  </div>
                </div>
              </div>
            </div>

            {agentProven && (
              <div className="bg-[#fbfaf7] p-4 sm:p-5">
                <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Agent Proven evidence</p>
                    <h3 className="mt-3 font-display text-2xl font-normal">
                      {agentProven.score}/100 · {agentProven.label}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-secondary">{agentProven.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(agentProven.signals?.length ? agentProven.signals : ['No real agent outcome reports yet']).slice(0, 4).map((signal) => (
                        <span key={signal} className="rounded-[999px] border border-border bg-background px-3 py-1 font-mono text-[11px] text-secondary">
                          {signal}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[8px] border border-border bg-border text-center sm:grid-cols-3">
                    {[
                      ['Outcomes', agentProven.metrics.totalOutcomes.toLocaleString()],
                      ['Success', formatPercent(agentProven.metrics.successRate)],
                      ['Recent fail', formatPercent(agentProven.metrics.recentFailureRate)],
                      ['Install', formatPercent(agentProven.metrics.installSuccessRate)],
                      ['Quality', formatQuality(agentProven.metrics.avgOutputQuality)],
                      ['Production', agentProven.metrics.productionOutcomes.toLocaleString()],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-background p-3">
                        <div className="font-mono text-lg leading-none">{value}</div>
                        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {payload.feedback && (
              <div className="bg-[#fbfaf7] p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Outcome feedback</p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
                      After one narrow run, report whether this skill worked so future agent rankings learn from real outcomes.
                    </p>
                  </div>
                  <span className="w-fit border border-border bg-background px-2.5 py-1 font-mono text-xs text-secondary">
                    {payload.feedback.event_id}
                  </span>
                </div>
                <code className="mt-4 block break-words border border-border bg-background p-3 font-mono text-xs leading-5 [overflow-wrap:anywhere]">
                  {payload.feedback.cli_example}
                </code>
              </div>
            )}

            {payload.install_receipt && (
              <div className="grid gap-px bg-border md:grid-cols-[0.92fr_1.08fr]">
                <div className="bg-background p-4 sm:p-5">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Install receipt</p>
                  <h3 className="mt-3 font-display text-xl font-normal">Stable agent handoff</h3>
                  <p className="mt-2 text-sm leading-6 text-secondary">
                    Receipt ID {payload.install_receipt.receipt_id}. Use this as the durable record before install, sandbox run, and outcome reporting.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={payload.install_receipt.urls.text}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[8px] bg-[#006b4f] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      Text receipt
                    </a>
                    <a
                      href={payload.install_receipt.urls.json}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[8px] border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-foreground/40"
                    >
                      JSON
                    </a>
                  </div>
                </div>
                <div className="bg-background p-4 sm:p-5">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Agent next steps</p>
                  <ol className="mt-3 space-y-2">
                    {payload.install_receipt.next_steps.slice(0, 4).map((step, index) => (
                      <li key={step} className="flex gap-3 text-sm leading-6 text-secondary">
                        <span className="font-mono text-xs text-foreground">{String(index + 1).padStart(2, '0')}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-2">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Why this skill</p>
                <ul className="mt-3 space-y-2">
                  {recommendation.why_recommended.slice(0, 5).map((reason) => (
                    <li key={reason} className="flex gap-2 text-sm leading-6 text-secondary">
                      <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-[#006b4f]" aria-hidden="true" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Risk notes</p>
                <ul className="mt-3 space-y-2">
                  {(recommendation.risk.notes.length ? recommendation.risk.notes : [payload.policy_decision.summary]).slice(0, 5).map((note) => (
                    <li key={note} className="flex gap-2 text-sm leading-6 text-secondary">
                      <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0 text-[#b7791f]" aria-hidden="true" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {recommendation.alternatives.length > 0 && (
              <div className="p-4 sm:p-5">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Alternatives</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {recommendation.alternatives.slice(0, 4).map((item) => (
                    <Link
                      key={item.slug}
                      href={item.url}
                      className="border border-border bg-card p-4 transition-colors hover:border-foreground/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-lg font-normal">{item.name}</h3>
                        <span className="font-mono text-xs text-secondary">Trust {item.trust_score}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-secondary">{item.why_consider}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
