import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills } from '@/lib/db/skills'
import { REGISTRY_EVAL_CASES, runRegistryEvals } from '@/lib/registry-evals'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Resolve Quality Evals - OpenAgentSkill',
  description:
    'Regression dashboard for OpenAgentSkill agent resolve quality across coding, research, finance, web scraping, PDF parsing, football analytics, and automation tasks.',
  alternates: {
    canonical: 'https://www.openagentskill.com/evals/resolve',
  },
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export default async function ResolveEvalsPage() {
  const skills = await withTimeout(getAllSkills('quality', undefined, 1800), 2200, 'resolve eval skills query')
    .catch(() => CURATED_SKILL_SNAPSHOT)
  const evals = runRegistryEvals(skills, REGISTRY_EVAL_CASES)
  const failed = evals.results.filter((result) => !result.passed)
  const passed = evals.results.filter((result) => result.passed)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-secondary">
          <Link href="/" className="hover:text-foreground">OpenAgentSkill</Link>
          <span>/</span>
          <span className="text-foreground">Resolve evals</span>
        </nav>

        <section className="border-b border-border pb-10">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-secondary">
            Agent resolve quality
          </p>
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <h1 className="font-display text-4xl font-semibold leading-tight sm:text-6xl">
                Resolve evals for real agent tasks.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
                A regression dashboard for whether OpenAgentSkill recommends the right reusable skill
                for high-intent tasks across coding, research, finance, documents, automation, and sports analytics.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/api/agent/evals"
                  className="rounded-[8px] border border-foreground bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-80"
                >
                  Open JSON
                </Link>
                <Link
                  href="/api/agent/evals?format=text"
                  className="rounded-[8px] border border-border px-5 py-2.5 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                >
                  Text contract
                </Link>
                <Link
                  href="/api/agent/resolve?task=analyze%20stock%20news&live=true"
                  className="rounded-[8px] border border-border px-5 py-2.5 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                >
                  Try resolve API
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px self-end overflow-hidden rounded-[8px] border border-border bg-border text-center">
              <div className="bg-card p-5">
                <div className="font-mono text-4xl font-semibold">{evals.pass_rate}%</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Pass rate</div>
              </div>
              <div className="bg-card p-5">
                <div className="font-mono text-4xl font-semibold">{evals.total}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Cases</div>
              </div>
              <div className="bg-card p-5">
                <div className="font-mono text-4xl font-semibold text-[#006b4f]">{passed.length}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Passed</div>
              </div>
              <div className="bg-card p-5">
                <div className="font-mono text-4xl font-semibold text-amber-700">{failed.length}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Review</div>
              </div>
            </div>
          </div>
        </section>

        {failed.length > 0 && (
          <section className="border-b border-border py-10">
            <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-[0.22em] text-secondary">
                  Needs tuning
                </p>
                <h2 className="font-display text-3xl font-semibold">Failed or weak matches</h2>
              </div>
              <p className="text-sm text-secondary">Use these rows to improve ranking terms and supply coverage.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {failed.slice(0, 12).map((result) => (
                <article key={result.id} className="rounded-[8px] border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-secondary">{result.id}</p>
                      <h3 className="mt-2 font-display text-xl font-semibold">{result.task}</h3>
                    </div>
                    <span className="rounded-[6px] border border-amber-300 px-2 py-1 font-mono text-[11px] text-amber-700">
                      {Math.round(result.top_score)}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {result.top_results.slice(0, 3).map((item) => (
                      <Link
                        key={`${result.id}-${item.slug}`}
                        href={`/skills/${item.slug}`}
                        className="flex items-center justify-between gap-3 rounded-[6px] border border-border bg-background px-3 py-2 text-sm transition-colors hover:border-foreground/40"
                      >
                        <span className="truncate">{item.rank}. {item.name}</span>
                        <span className="shrink-0 font-mono text-xs text-secondary">{Math.round(item.score)}</span>
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="py-10">
          <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.22em] text-secondary">
                Full suite
              </p>
              <h2 className="font-display text-3xl font-semibold">Standard resolve cases</h2>
            </div>
            <p className="text-sm text-secondary">Each case checks expected slugs, terms, and minimum top score.</p>
          </div>

          <div className="overflow-hidden rounded-[8px] border border-border">
            <div className="hidden grid-cols-[120px_1fr_220px_90px] gap-px bg-border font-mono text-[11px] uppercase tracking-[0.18em] text-secondary md:grid">
              <div className="bg-card p-3">Status</div>
              <div className="bg-card p-3">Task</div>
              <div className="bg-card p-3">Top result</div>
              <div className="bg-card p-3 text-right">Score</div>
            </div>
            <div className="divide-y divide-border">
              {evals.results.map((result) => {
                const top = result.top_results[0]
                return (
                  <article key={result.id} className="grid gap-3 p-4 md:grid-cols-[120px_1fr_220px_90px] md:items-center">
                    <div>
                      <span
                        className={`inline-flex rounded-[6px] border px-2 py-1 font-mono text-[11px] ${
                          result.passed
                            ? 'border-[#006b4f] text-[#006b4f]'
                            : 'border-amber-300 text-amber-700'
                        }`}
                      >
                        {result.passed ? 'Pass' : 'Review'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-secondary">{result.id}</p>
                      <p className="mt-1 text-sm leading-relaxed">{result.task}</p>
                    </div>
                    <div className="min-w-0 text-sm">
                      {top ? (
                        <Link href={`/skills/${top.slug}`} className="truncate hover:text-secondary">
                          {top.name}
                        </Link>
                      ) : (
                        <span className="text-secondary">No result</span>
                      )}
                    </div>
                    <div className="font-mono text-sm md:text-right">{Math.round(result.top_score)}</div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
