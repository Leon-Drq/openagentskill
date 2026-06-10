import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills, getSkillStats, type SkillAgentStats } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import { CORE_RANKINGS, getRankingDefinitions, rankSkillsForDefinition } from '@/lib/rankings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Agent Skill Rankings',
  description:
    'Browse OpenAgentSkill rankings for highest quality skills, most starred repos, fresh updates, new arrivals, and best skills by agent workflow.',
  alternates: {
    canonical: 'https://www.openagentskill.com/rankings',
  },
  openGraph: {
    title: 'AI Agent Skill Rankings — OpenAgentSkill',
    description: 'Ranked skill shortlists for builders choosing AI agent tools by quality, stars, freshness, and use case.',
    url: 'https://www.openagentskill.com/rankings',
    type: 'website',
  },
}

function formatNumber(value: number) {
  return formatCompactNumber(value || 0)
}

export default async function RankingsPage() {
  const [skills, statsMap] = await Promise.all([
    getAllSkills('quality').catch(() => []),
    getSkillStats().catch((): Record<string, SkillAgentStats> => ({})),
  ])
  const rankingDefinitions = getRankingDefinitions()
  const useCaseRankings = rankingDefinitions.filter((ranking) => ranking.kind === 'use-case')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="relative -mx-4 overflow-hidden border-b border-border px-4 pb-10 pt-2 sm:-mx-6 sm:px-6">
          <div className="brand-grain pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="mb-5 font-mono text-xs uppercase tracking-[0.24em] text-secondary">Rankings</p>
              <h1 className="font-display text-4xl font-normal leading-[0.98] text-balance md:text-6xl">
                Ranked shortlists for choosing agent skills faster.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
                Use rankings when you already know the decision lens: quality, adoption, freshness, new arrivals, or
                a specific agent workflow.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{skills.length.toLocaleString()}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Skills</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{rankingDefinitions.length}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Lists</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">
                  {formatNumber(skills.reduce((sum, skill) => sum + Number(skill.github_stars || 0), 0))}
                </div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Stars</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 border-b border-border py-10 md:grid-cols-2 lg:grid-cols-3">
          {CORE_RANKINGS.map((ranking) => {
            const topSkills = rankSkillsForDefinition(skills, ranking, statsMap, 3)

            return (
              <Link
                key={ranking.slug}
                href={`/rankings/${ranking.slug}`}
                className="group flex min-h-[300px] flex-col justify-between border border-border bg-card p-5 transition-colors hover:border-foreground"
              >
                <div>
                  <p className="mb-3 text-xs uppercase tracking-widest text-secondary">{ranking.eyebrow}</p>
                  <h2 className="font-display text-2xl font-semibold leading-tight group-hover:text-secondary">
                    {ranking.shortTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{ranking.description}</p>
                </div>

                <div className="mt-8">
                  <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Top skills</p>
                  <div className="space-y-2">
                    {topSkills.map((item) => (
                      <div key={item.skill.slug} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate">{item.skill.name}</span>
                        <span className="shrink-0 font-mono text-xs text-secondary">{item.badge}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
        </section>

        <section className="py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Workflow rankings</p>
              <h2 className="font-display text-2xl font-semibold">Best skills by use case</h2>
            </div>
            <Link href="/use-cases" className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
              Browse use cases
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {useCaseRankings.map((ranking) => {
              const topSkill = rankSkillsForDefinition(skills, ranking, statsMap, 1)[0]

              return (
                <Link
                  key={ranking.slug}
                  href={`/rankings/${ranking.slug}`}
                  className="border border-border bg-card p-5 transition-colors hover:border-foreground"
                >
                  <p className="text-xs uppercase tracking-widest text-secondary">{ranking.eyebrow}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold">{ranking.shortTitle}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-secondary">{ranking.description}</p>
                  {topSkill && (
                    <p className="mt-5 border-t border-border pt-4 text-xs text-secondary">
                      Leading pick: <span className="text-foreground">{topSkill.skill.name}</span>
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
