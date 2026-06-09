'use client'

import { Loader2, Search } from 'lucide-react'
import { useState } from 'react'

interface RecommendationItem {
  rank: number
  skill: string
  slug: string
  description: string
  match_label: string
  confidence: string
  install: string
  trust?: {
    score: number
    label: string
  }
  audit?: {
    audit_score: number
    risk_label: string
  }
  urls?: {
    web: string
  }
}

interface RecommendationResponse {
  task: string
  recommendations: RecommendationItem[]
}

const DEFAULT_TASK = 'Scrape public websites, extract tables, and prepare a research report'

export function AgentRecommendationDemo() {
  const [task, setTask] = useState(DEFAULT_TASK)
  const [result, setResult] = useState<RecommendationResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runRecommendation() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/agent/recommend?task=${encodeURIComponent(task)}&limit=3`)
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
      const data = (await response.json()) as RecommendationResponse
      setResult(data)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Recommendation failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Live registry API</p>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Recommend skills from a task description.</h2>
          <p className="mt-4 text-sm leading-relaxed text-secondary">
            The API returns ranked skills with trust score, audit score, install command, agent prompts, and detail URLs.
          </p>
        </div>

        <div className="border border-border bg-card">
          <div className="border-b border-border p-4">
            <label htmlFor="recommend-task" className="mb-2 block text-xs uppercase tracking-widest text-secondary">
              Task
            </label>
            <textarea
              id="recommend-task"
              value={task}
              onChange={(event) => setTask(event.target.value)}
              className="min-h-28 w-full resize-none border border-border bg-background p-3 text-sm leading-relaxed outline-none focus:border-foreground"
            />
            <button
              type="button"
              onClick={runRecommendation}
              disabled={isLoading || task.trim().length === 0}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
              Recommend
            </button>
          </div>

          <div className="min-h-56 p-4">
            {error && (
              <div className="border border-red-300 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!error && !result && (
              <div className="grid min-h-48 place-items-center border border-dashed border-border p-6 text-center text-sm text-secondary">
                Run the task through the registry API.
              </div>
            )}

            {result && (
              <div className="space-y-3">
                {result.recommendations.map((item) => (
                  <article key={item.slug} className="border border-border bg-background p-4">
                    <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div>
                        <p className="font-mono text-xs text-secondary">#{item.rank} {item.match_label}</p>
                        <h3 className="mt-1 font-display text-xl font-semibold">{item.skill}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="border border-border px-2 py-0.5 font-mono text-xs text-secondary">
                          Trust {item.trust?.score ?? '-'}
                        </span>
                        <span className="border border-border px-2 py-0.5 font-mono text-xs text-secondary">
                          Audit {item.audit?.audit_score ?? '-'}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-secondary">{item.description}</p>
                    <code className="mt-3 block break-words border border-border bg-card p-3 font-mono text-xs [overflow-wrap:anywhere]">
                      {item.install}
                    </code>
                    {item.urls?.web && (
                      <a
                        href={item.urls.web}
                        className="mt-3 inline-flex text-sm text-secondary underline underline-offset-2 hover:text-foreground"
                      >
                        Open skill
                      </a>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
