import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
import { getAllSkills } from '@/lib/db/skills'
import { SKILL_STACKS } from '@/lib/collections'
import { getSkillTrustProfile } from '@/lib/trust'
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
  const skills = await getAllSkills('quality', undefined, 4000).catch(() => [])

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Use cases"
        title="Find agent skills by the work you need done."
        description="OpenAgentSkill groups the marketplace around practical workflows, so builders can move from a task description to a shortlist of installable, high-signal skills."
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: skills.length.toLocaleString(), label: 'Skills' },
              { value: USE_CASES.length, label: 'Use cases' },
              { value: formatNumber(skills.reduce((sum, skill) => sum + skill.github_stars, 0)), label: 'Stars' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
        <section className="grid gap-5 py-10 md:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((useCase) => {
            const matchedSkills = selectSkillsForUseCase(skills, useCase, 12)
            const topSkills = matchedSkills.slice(0, 3)
            const trustProfiles = matchedSkills.map((skill) => getSkillTrustProfile(skill))
            const strongTrustCount = trustProfiles.filter((profile) => profile.tier === 'production' || profile.tier === 'strong').length
            const installReadyCount = matchedSkills.filter((skill) => skill.install_command || skill.github_repo || skill.repository).length

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
                  <div className="mt-5 grid grid-cols-3 gap-px border border-border bg-border text-center">
                    <div className="bg-background p-3">
                      <div className="font-mono text-lg">{matchedSkills.length}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-widest text-secondary">Matches</div>
                    </div>
                    <div className="bg-background p-3">
                      <div className="font-mono text-lg">{strongTrustCount}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-widest text-secondary">Trust</div>
                    </div>
                    <div className="bg-background p-3">
                      <div className="font-mono text-lg">{installReadyCount}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-widest text-secondary">Install</div>
                    </div>
                  </div>
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
      </div>
    </MarketingPageShell>
  )
}
