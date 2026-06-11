import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { AGENT_TASKS } from '@/lib/agent-tasks'
import { getAllSkills } from '@/lib/db/skills'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Agent Tasks - OpenAgentSkill',
  description:
    'Find the right AI agent skill by task: scrape pricing pages, review pull requests, convert PDFs, build RAG, analyze CSVs, automate browsers, and more.',
  alternates: {
    canonical: 'https://www.openagentskill.com/tasks',
  },
  openGraph: {
    title: 'AI Agent Tasks - OpenAgentSkill',
    description: 'Task-first skill discovery for agents and builders.',
    url: 'https://www.openagentskill.com/tasks',
    type: 'website',
  },
}

function formatNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`
  return value.toLocaleString()
}

export default async function TasksPage() {
  const skills = await getAllSkills('quality').catch(() => [])
  const totalStars = skills.reduce((sum, skill) => sum + Number(skill.github_stars || 0), 0)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="relative -mx-4 overflow-hidden border-b border-border px-4 pb-10 pt-2 sm:-mx-6 sm:px-6">
          <div className="brand-grain pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="mb-5 font-mono text-xs uppercase text-secondary">Agent tasks</p>
              <h1 className="font-display text-4xl font-normal leading-[0.98] text-balance md:text-6xl">
                Start from the job your agent needs to do.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
                Each task page turns a real agent workflow into a ranked skill shortlist, install prompts, safety notes, and a Resolve API call.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/agent"
                  className="border border-foreground bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
                >
                  Agent entry
                </Link>
                <Link
                  href="/api/agent/tasks?format=text"
                  prefetch={false}
                  className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                >
                  Text API
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{AGENT_TASKS.length}</div>
                <div className="mt-1 text-xs uppercase text-secondary">Tasks</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{skills.length.toLocaleString()}</div>
                <div className="mt-1 text-xs uppercase text-secondary">Skills</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{formatNumber(totalStars)}</div>
                <div className="mt-1 text-xs uppercase text-secondary">Stars</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 py-10 md:grid-cols-2 lg:grid-cols-3">
          {AGENT_TASKS.map((task, index) => (
            <Link
              key={task.slug}
              href={`/tasks/${task.slug}`}
              className="group flex min-h-[280px] flex-col justify-between border border-border bg-card p-5 transition-colors hover:border-foreground"
            >
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-secondary">{String(index + 1).padStart(2, '0')}</p>
                  <span className="border border-border px-2 py-1 font-mono text-[11px] text-secondary">
                    {task.useCaseSlug}
                  </span>
                </div>
                <h2 className="font-display text-2xl font-semibold leading-tight group-hover:text-secondary">
                  {task.shortTitle}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-secondary">{task.intent}</p>
              </div>
              <div className="mt-8 border-t border-border pt-4">
                <p className="line-clamp-2 text-sm leading-relaxed text-secondary">{task.agentPrompt}</p>
              </div>
            </Link>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
