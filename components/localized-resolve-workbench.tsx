'use client'

import Link from 'next/link'
import { CheckCircle2, Copy, Loader2, Search, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { trackAnalyticsEvent } from '@/lib/analytics'
import type { MarketCoreContent } from '@/lib/i18n/market-core-pages'
import type { MarketLocale } from '@/lib/i18n/market-routing'

type ResolvePayload = {
  policy_decision?: {
    summary?: string
  }
  recommendation?: {
    best_skill: {
      slug: string
      name: string
      description: string
      url?: string
      audit_url?: string
      repository?: string
    }
    install: {
      command: string
      label: string
      ready: boolean
    }
    why_recommended: string[]
    risk: {
      notes: string[]
    }
    alternatives: Array<{
      slug: string
      name: string
      url: string
      trust_score: number
      audit_score: number
      why_consider: string
    }>
    trust_score_v5?: { score: number }
    trust_score_v4?: { score: number }
    trust_score_v3?: { score: number }
    trust_score_v2?: { score: number }
  } | null
  selected?: {
    match_score: number
    audit: { audit_score: number }
    safety: { score: number }
  } | null
}

function copyText(value: string) {
  void navigator.clipboard?.writeText(value)
}

export function LocalizedResolveWorkbench({
  locale,
  copy,
  labels,
}: {
  locale: MarketLocale
  copy: MarketCoreContent['resolve']
  labels: MarketCoreContent['labels']
}) {
  const [task, setTask] = useState(copy.examples[0] || '')
  const [payload, setPayload] = useState<ResolvePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const resolveTask = async (nextTask = task, source: 'manual' | 'example' = 'manual') => {
    const normalizedTask = nextTask.trim()
    if (!normalizedTask) return

    setTask(normalizedTask)
    setError(null)
    setIsLoading(true)
    setCopied(false)

    trackAnalyticsEvent('localized_resolve_request', { locale, source })

    try {
      const params = new URLSearchParams({
        task: normalizedTask,
        agent: 'auto',
        max_risk: 'medium',
      })
      const response = await fetch(`/api/agent/resolve?${params.toString()}`)
      if (!response.ok) throw new Error(`Resolve failed with status ${response.status}`)

      const nextPayload = (await response.json()) as ResolvePayload
      setPayload(nextPayload)
      trackAnalyticsEvent(nextPayload.recommendation ? 'localized_resolve_success' : 'localized_resolve_no_match', {
        locale,
        source,
        skill_slug: nextPayload.recommendation?.best_skill.slug,
      })
    } catch (resolveError) {
      setPayload(null)
      setError(resolveError instanceof Error ? resolveError.message : 'Resolve failed')
      trackAnalyticsEvent('localized_resolve_error', { locale, source })
    } finally {
      setIsLoading(false)
    }
  }

  const recommendation = payload?.recommendation || null
  const trust = recommendation?.trust_score_v5 || recommendation?.trust_score_v4 || recommendation?.trust_score_v3 || recommendation?.trust_score_v2
  const riskNotes = recommendation?.risk.notes.length
    ? recommendation.risk.notes
    : payload?.policy_decision?.summary
      ? [payload.policy_decision.summary]
      : []

  return (
    <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <section className="border border-border bg-card/85 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Agent Resolve</p>
            <h2 className="mt-3 font-display text-2xl font-normal leading-tight">{copy.title}</h2>
          </div>
          <span className="hidden rounded-[8px] border border-border px-2.5 py-1 font-mono text-xs text-secondary sm:inline-flex">
            API
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
            <span className="mb-2 block font-mono text-xs uppercase tracking-[0.18em] text-secondary">{copy.taskLabel}</span>
            <textarea
              value={task}
              onChange={(event) => setTask(event.target.value)}
              placeholder={copy.taskPlaceholder}
              className="min-h-32 w-full resize-none border border-border bg-background p-3 text-sm leading-6 outline-none transition-colors focus:border-[#006b4f]"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading || task.trim().length === 0}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#006b4f] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
            {isLoading ? copy.resolving : copy.submit}
          </button>
        </form>

        <div className="mt-5">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-secondary">{labels.tryExample}</p>
          <div className="grid gap-2">
            {copy.examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => void resolveTask(example, 'example')}
                className="w-full border border-border bg-background px-3 py-2 text-left text-sm leading-5 text-secondary transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="min-w-0 border border-border bg-background">
        {!recommendation && !error ? (
          <div className="grid min-h-[438px] place-items-center p-7 text-center sm:p-10">
            <div className="max-w-md">
              <ShieldCheck className="mx-auto h-8 w-8 text-[#006b4f]" aria-hidden="true" />
              <h2 className="mt-4 font-display text-2xl font-normal leading-tight">{copy.emptyTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-secondary">{copy.emptyDescription}</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="m-5 flex gap-3 border border-red-300 bg-red-50 p-3 text-sm leading-6 text-red-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        {recommendation ? (
          <div>
            <div className="border-b border-border p-4 sm:p-5">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">{copy.resultLabel}</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h2 className="break-words font-display text-2xl font-normal [overflow-wrap:anywhere]">{recommendation.best_skill.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-secondary">{recommendation.best_skill.description}</p>
                </div>
                <span className="w-fit shrink-0 rounded-[999px] border border-border px-3 py-1 font-mono text-xs text-secondary">
                  {labels.agentReady}
                </span>
              </div>
            </div>

            <div className="grid gap-px bg-border sm:grid-cols-4">
              {[
                [copy.features[0]?.title || labels.match, payload?.selected?.match_score ?? '—'],
                [labels.trust, trust?.score ?? '—'],
                [labels.audit, payload?.selected?.audit.audit_score ?? '—'],
                [labels.safety, payload?.selected?.safety.score ?? '—'],
              ].map(([label, value]) => (
                <div key={String(label)} className="bg-card p-3 text-center">
                  <div className="font-mono text-xl leading-none">{value}</div>
                  <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-secondary">{label}</div>
                </div>
              ))}
            </div>

            <div className="grid gap-px bg-border md:grid-cols-2">
              <div className="bg-background p-4 sm:p-5">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">{copy.copyInstall}</p>
                <code className="mt-3 block break-words border border-border bg-card p-3 font-mono text-xs leading-5 [overflow-wrap:anywhere]">
                  {recommendation.install.command}
                </code>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      copyText(recommendation.install.command)
                      setCopied(true)
                      trackAnalyticsEvent('localized_resolve_copy_install', {
                        locale,
                        skill_slug: recommendation.best_skill.slug,
                      })
                    }}
                    className="inline-flex min-h-10 items-center gap-2 rounded-[8px] bg-foreground px-3.5 py-2 text-sm font-semibold text-background"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    {copied ? copy.copiedInstall : copy.copyInstall}
                  </button>
                  <span className="inline-flex items-center rounded-[8px] border border-border px-3 text-xs text-secondary">
                    {recommendation.install.ready ? labels.agentReady : recommendation.install.label}
                  </span>
                </div>
              </div>

              <div className="bg-background p-4 sm:p-5">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">{copy.whyLabel}</p>
                <ul className="mt-3 space-y-2">
                  {recommendation.why_recommended.slice(0, 4).map((reason) => (
                    <li key={reason} className="flex gap-2 text-sm leading-6 text-secondary">
                      <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-[#006b4f]" aria-hidden="true" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">{copy.riskLabel}</p>
                <ul className="mt-3 space-y-2">
                  {riskNotes.slice(0, 3).map((note) => (
                    <li key={note} className="flex gap-2 text-sm leading-6 text-secondary">
                      <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0 text-[#b7791f]" aria-hidden="true" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap content-start gap-2">
                <Link
                  href={recommendation.best_skill.url || `/skills/${recommendation.best_skill.slug}`}
                  className="inline-flex min-h-10 items-center rounded-[8px] border border-border px-3.5 py-2 text-sm font-semibold transition-colors hover:border-foreground/40"
                >
                  {labels.openSkill}
                </Link>
                <Link
                  href={recommendation.best_skill.audit_url || `/skills/${recommendation.best_skill.slug}/audit`}
                  className="inline-flex min-h-10 items-center rounded-[8px] border border-border px-3.5 py-2 text-sm font-semibold transition-colors hover:border-foreground/40"
                >
                  {labels.viewAudit}
                </Link>
                {recommendation.best_skill.repository ? (
                  <a
                    href={recommendation.best_skill.repository}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center rounded-[8px] border border-border px-3.5 py-2 text-sm font-semibold transition-colors hover:border-foreground/40"
                  >
                    GitHub
                  </a>
                ) : null}
              </div>
            </div>

            {recommendation.alternatives.length > 0 ? (
              <div className="border-t border-border p-4 sm:p-5">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">{copy.alternativesLabel}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {recommendation.alternatives.slice(0, 2).map((alternative) => (
                    <Link key={alternative.slug} href={alternative.url} className="border border-border bg-card p-3 transition-colors hover:border-foreground/40">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="min-w-0 break-words font-semibold [overflow-wrap:anywhere]">{alternative.name}</h3>
                        <span className="shrink-0 font-mono text-xs text-secondary">{alternative.trust_score}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-secondary">{alternative.why_consider}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}
