import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingButtonLink, MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
import { SubscribeCard } from '@/components/subscribe-card'
import { getAllSkills } from '@/lib/db/skills'
import { SKILL_STACKS, selectSkillsForStack } from '@/lib/collections'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Agent Workflow Recipes | OpenAgentSkill',
  description:
    'Step-by-step AI agent workflow recipes for web data pipelines, coding review, RAG, browser QA, research, video creation, and content growth.',
  alternates: {
    canonical: 'https://www.openagentskill.com/collections',
  },
  openGraph: {
    title: 'AI Agent Workflow Recipes — OpenAgentSkill',
    description: 'Choose a proven workflow, then discover the skills that make each step reliable.',
    url: 'https://www.openagentskill.com/collections',
    type: 'website',
  },
}

export default async function CollectionsPage() {
  const skills = await getAllSkills('quality', undefined, 1200).catch(() => [])

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Workflow recipes"
        title="Start with the work. Then choose the right skills."
        description="Recipes map the sequence an agent should follow for a real task: what to do first, what to verify next, and which skills best support each step. They are decision guides, not install bundles."
        actions={
          <>
            <MarketingButtonLink href="/resolve" variant="primary">Describe a task</MarketingButtonLink>
            <MarketingButtonLink href="/skill-packs">Browse installable packs</MarketingButtonLink>
          </>
        }
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: SKILL_STACKS.length, label: 'Recipes' },
              { value: '4', label: 'Typical steps' },
              { value: skills.length.toLocaleString(), label: 'Skill options' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
        <section className="grid gap-px border-x border-b border-border bg-border md:grid-cols-3">
          {[
            ['01', 'Frame the task', 'Turn a vague job into a clear sequence of agent decisions.'],
            ['02', 'Choose each capability', 'See the skills that fit a specific stage instead of a generic category.'],
            ['03', 'Review the result', 'Know what evidence or human approval is needed before moving on.'],
          ].map(([number, title, copy]) => (
            <div key={number} className="bg-background p-5">
              <p className="font-mono text-xs text-secondary">{number}</p>
              <h2 className="mt-3 font-display text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-secondary">{copy}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 py-10 md:grid-cols-2">
          {SKILL_STACKS.map((stack) => {
            const picks = selectSkillsForStack(skills, stack, 4)
            return (
              <Link
                key={stack.slug}
                href={`/collections/${stack.slug}`}
                className="group flex min-h-[330px] flex-col border border-border bg-card p-5 transition-colors hover:border-foreground"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-secondary">Workflow recipe</p>
                    <h2 className="mt-2 font-display text-2xl font-semibold group-hover:text-secondary">
                      {stack.shortTitle}
                    </h2>
                  </div>
                  <span className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-secondary">
                    {stack.workflowSteps.length} steps
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-secondary">{stack.description}</p>
                <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {stack.workflowSteps.map((step, index) => (
                    <li key={step.title} className="min-w-0 border border-border bg-background p-3">
                      <span className="font-mono text-[10px] text-secondary">0{index + 1}</span>
                      <span className="mt-1 block truncate text-sm font-medium">{step.title}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-auto flex items-end justify-between gap-4 pt-5">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">Suggested skills</p>
                    <p className="mt-1 truncate text-sm text-secondary">
                      {picks.length > 0 ? picks.slice(0, 3).map((skill) => skill.name).join(' · ') : 'Curating recommendations'}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[#006b4f]">Open recipe →</span>
                </div>
              </Link>
            )
          })}
        </section>

        <section className="border-t border-border py-10">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-secondary">Ready to install instead?</p>
              <h2 className="mt-3 font-display text-2xl font-semibold">Use an installable skill pack.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
                Packs are role- or toolchain-specific bundles with a machine-readable install order, audit links, and an Agent API.
              </p>
            </div>
            <MarketingButtonLink href="/skill-packs" className="w-full md:w-auto">Open skill packs</MarketingButtonLink>
          </div>
        </section>

        <section className="border-t border-border py-10">
          <SubscribeCard
            source="collections"
            topics={['workflow-recipes', 'workflow-guides']}
            title="Get new workflow ideas"
            description="A short digest of agent workflow recipes, recommended skills, and quality signals for builders."
          />
        </section>
      </div>
    </MarketingPageShell>
  )
}
