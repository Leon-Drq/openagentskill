import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
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
    getAllSkills('quality', undefined, 1200).catch(() => []),
    getSkillStats().catch((): Record<string, SkillAgentStats> => ({})),
  ])
  const rankingDefinitions = getRankingDefinitions()
  const useCaseRankings = rankingDefinitions.filter((ranking) => ranking.kind === 'use-case')

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Rankings"
        title="Ranked shortlists for choosing agent skills faster."
        description="Use rankings when you already know the decision lens: quality, adoption, freshness, new arrivals, or a specific agent workflow."
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: skills.length.toLocaleString(), label: 'Skills' },
              { value: rankingDefinitions.length, label: 'Lists' },
              {
                value: formatNumber(skills.reduce((sum, skill) => sum + Number(skill.github_stars || 0), 0)),
                label: 'Stars',
              },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
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
      </div>
    </MarketingPageShell>
  )
}
