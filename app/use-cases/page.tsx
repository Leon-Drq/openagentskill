import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills } from '@/lib/db/skills'
import { SKILL_STACKS } from '@/lib/collections'
import { USE_CASES, selectSkillsForUseCase } from '@/lib/use-cases'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Agent Skill Use Cases',
  description:
    'Explore OpenAgentSkill use-case guides for web scraping, coding agents, RAG, browser automation, document processing, data analysis, testing, security, and more.',
  alternates: {
    canonical: 'https://www.openagentskill.com/use-cases',
  },
  openGraph: {
    title: 'AI Agent Skill Use Cases — OpenAgentSkill',
    description: 'Find the right AI agent skills by practical workflow and job-to-be-done.',
    url: 'https://www.openagentskill.com/use-cases',
    type: 'website',
  },
}

function formatNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`
  return value.toLocaleString()
}

export default async function UseCasesPage() {
  const skills = await getAllSkills('quality').catch(() => [])

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="border-b border-border pb-10">
          <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Use cases</p>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
                Find agent skills by the work you need done.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
                OpenAgentSkill now groups the marketplace around practical workflows, so builders can move from a task
                description to a shortlist of installable, high-signal skills.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{skills.length.toLocaleString()}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Skills</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{USE_CASES.length}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Use cases</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{formatNumber(skills.reduce((sum, skill) => sum + skill.github_stars, 0))}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Stars</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 py-10 md:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((useCase) => {
            const topSkills = selectSkillsForUseCase(skills, useCase, 3)

            return (
              <Link
                key={useCase.slug}
                href={`/use-cases/${useCase.slug}`}
                className="group flex min-h-[300px] flex-col justify-between border border-border bg-card p-5 transition-colors hover:border-foreground"
              >
                <div>
                  <p className="mb-3 text-xs uppercase tracking-widest text-secondary">{useCase.eyebrow}</p>
                  <h2 className="font-display text-2xl font-semibold leading-tight group-hover:text-secondary">
                    {useCase.shortTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{useCase.description}</p>
                </div>

                <div className="mt-8">
                  <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Top matches</p>
                  <div className="space-y-2">
                    {topSkills.length > 0 ? (
                      topSkills.map((skill) => (
                        <div key={skill.slug} className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate">{skill.name}</span>
                          <span className="shrink-0 font-mono text-xs text-secondary">{formatNumber(skill.github_stars)} stars</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-secondary">Curating matches now.</p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </section>

        <section className="border-t border-border py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">From use case to stack</p>
              <h2 className="font-display text-2xl font-semibold">Ready-made workflows</h2>
            </div>
            <Link href="/collections" className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
              Browse all stacks
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {SKILL_STACKS.slice(0, 3).map((stack) => (
              <Link
                key={stack.slug}
                href={`/collections/${stack.slug}`}
                className="border border-border bg-card p-5 transition-colors hover:border-foreground"
              >
                <p className="text-xs uppercase tracking-widest text-secondary">{stack.eyebrow}</p>
                <h3 className="mt-2 font-display text-xl font-semibold">{stack.shortTitle}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-secondary">{stack.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
