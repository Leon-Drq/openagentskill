import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { SubscribeCard } from '@/components/subscribe-card'
import { getAllSkills } from '@/lib/db/skills'
import { SKILL_STACKS, selectSkillsForStack } from '@/lib/collections'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Agent Skill Stacks | OpenAgentSkill',
  description:
    'Curated AI agent skill stacks for web data pipelines, coding review agents, RAG knowledge bases, browser QA, research reports, and content workflows.',
  alternates: {
    canonical: 'https://www.openagentskill.com/collections',
  },
  openGraph: {
    title: 'AI Agent Skill Stacks — OpenAgentSkill',
    description: 'Choose complete skill stacks for real AI agent workflows.',
    url: 'https://www.openagentskill.com/collections',
    type: 'website',
  },
}

export default async function CollectionsPage() {
  const skills = await getAllSkills('quality').catch(() => [])

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="border-b border-border pb-12">
          <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Skill stacks</p>
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <h1 className="font-display text-4xl font-bold leading-tight text-balance sm:text-6xl">
                Build agents from complete workflow stacks.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
                A single skill rarely solves the whole job. These stacks group high-signal skills into repeatable
                workflows for crawling, coding, RAG, QA, research, and growth.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{SKILL_STACKS.length}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Stacks</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{skills.length.toLocaleString()}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Skills</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">4</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Steps</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 py-10 md:grid-cols-2">
          {SKILL_STACKS.map((stack) => {
            const picks = selectSkillsForStack(skills, stack, 4)
            const bestScore = picks[0] ? getSkillQualityProfile(picks[0]).score : 0
            return (
              <Link
                key={stack.slug}
                href={`/collections/${stack.slug}`}
                className="group border border-border bg-card p-5 transition-colors hover:border-foreground"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-secondary">{stack.eyebrow}</p>
                    <h2 className="mt-2 font-display text-2xl font-semibold group-hover:text-secondary">
                      {stack.shortTitle}
                    </h2>
                  </div>
                  <span className="border border-border px-2 py-1 text-xs font-mono text-secondary">
                    {picks.length} picks
                  </span>
                </div>
                <p className="min-h-16 text-sm leading-relaxed text-secondary">{stack.description}</p>
                <div className="mt-5 grid grid-cols-3 gap-px border border-border bg-border text-xs">
                  <div className="bg-background p-3">
                    <div className="font-mono text-foreground">{bestScore || '—'}</div>
                    <div className="mt-1 text-secondary">Top score</div>
                  </div>
                  <div className="bg-background p-3">
                    <div className="font-mono text-foreground">{formatCompactNumber(picks[0]?.github_stars || 0)}</div>
                    <div className="mt-1 text-secondary">Top stars</div>
                  </div>
                  <div className="bg-background p-3">
                    <div className="font-mono text-foreground">{stack.workflowSteps.length}</div>
                    <div className="mt-1 text-secondary">Workflow</div>
                  </div>
                </div>
              </Link>
            )
          })}
        </section>

        <section className="border-t border-border py-10">
          <SubscribeCard
            source="collections"
            topics={['skill-stacks', 'workflow-guides']}
            title="Get new stack ideas"
            description="A short digest of agent workflows, recommended skills, and quality signals for builders."
          />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
