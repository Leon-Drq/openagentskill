import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
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
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Skill stacks"
        title="Build agents from complete workflow stacks."
        description="A single skill rarely solves the whole job. These stacks group high-signal skills into repeatable workflows for crawling, coding, RAG, QA, research, and growth."
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: SKILL_STACKS.length, label: 'Stacks' },
              { value: skills.length.toLocaleString(), label: 'Skills' },
              { value: '4', label: 'Steps' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
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
      </div>
    </MarketingPageShell>
  )
}
