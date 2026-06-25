import type { Metadata } from 'next'
import Link from 'next/link'
import {
  MarketingButtonLink,
  MarketingHero,
  MarketingMetricStrip,
  MarketingPageShell,
} from '@/components/marketing-page'
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
  const skills = await getAllSkills('quality', undefined, 1200).catch(() => [])
  const totalStars = skills.reduce((sum, skill) => sum + Number(skill.github_stars || 0), 0)

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Agent tasks"
        title="Start from the job your agent needs to do."
        description="Each task page turns a real agent workflow into a ranked skill shortlist, install prompts, safety notes, and a Resolve API call."
        actions={
          <>
            <MarketingButtonLink href="/agent" variant="primary">
              Agent entry
            </MarketingButtonLink>
            <MarketingButtonLink href="/api/agent/tasks?format=text" prefetch={false}>
              Text API
            </MarketingButtonLink>
          </>
        }
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: AGENT_TASKS.length, label: 'Tasks' },
              { value: skills.length.toLocaleString(), label: 'Skills' },
              { value: formatNumber(totalStars), label: 'Stars' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
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
      </div>
    </MarketingPageShell>
  )
}
