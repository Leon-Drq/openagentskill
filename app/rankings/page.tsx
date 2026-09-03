import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
import {
  getAgentOutcomeStatsMap,
  getAllSkills,
  getSkillStats,
  type SkillAgentStats,
  type SkillOutcomeStats,
} from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import { CORE_RANKINGS, getRankingDefinitions, getUniqueProjectStarTotal, normalizeRankingText, rankSkillsForDefinition, type RankingDefinition } from '@/lib/rankings'
import { getLatestRankingSnapshot, RANKING_METHODOLOGY_VERSION } from '@/lib/ranking-snapshots'
import { GitHubPopularityList } from '@/components/github-popularity-list'

export const revalidate = 300

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

function usesOutcomeStats(ranking: RankingDefinition) {
  return ['highest-quality', 'agent-usage', 'success-rate', 'safe-auto-install', 'agent-platform'].includes(ranking.kind)
}

export default async function RankingsPage() {
  const [skills, statsMap, outcomeStatsMap, latestSnapshot] = await Promise.all([
    getAllSkills('quality', undefined, 1200).catch(() => []),
    getSkillStats().catch((): Record<string, SkillAgentStats> => ({})),
    getAgentOutcomeStatsMap().catch((): Record<string, SkillOutcomeStats> => ({})),
    getLatestRankingSnapshot('trending'),
  ])
  const rankingDefinitions = getRankingDefinitions()
  const useCaseRankings = rankingDefinitions.filter((ranking) => ranking.kind === 'use-case')
  const popularityRanking = CORE_RANKINGS.find((ranking) => ranking.kind === 'most-starred')
  const popularSkills = popularityRanking
    ? rankSkillsForDefinition(skills, popularityRanking, statsMap, 10)
    : []

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Rankings"
        title="Ranked shortlists for choosing agent skills faster."
        description="Use rankings when you already know the decision lens: quality, adoption, freshness, new arrivals, or a specific agent workflow."
        aside={
          <MarketingMetricStrip
            columns="grid-cols-2"
            items={[
              { value: skills.length.toLocaleString(), label: 'Skills' },
              { value: rankingDefinitions.length, label: 'Lists' },
              {
                value: formatNumber(getUniqueProjectStarTotal(skills)),
                label: 'Unique project stars',
              },
              {
                value: formatNumber(Object.values(outcomeStatsMap).reduce((sum, row) => sum + Number(row.total_outcomes || 0), 0)),
                label: 'Outcomes',
              },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
        <section className="grid gap-px border-x border-b border-border bg-border sm:grid-cols-3">
          <div className="bg-background p-5">
            <p className="text-xs uppercase tracking-widest text-secondary">Refresh cadence</p>
            <p className="mt-2 font-mono text-sm">Daily at 02:55 UTC</p>
          </div>
          <div className="bg-background p-5">
            <p className="text-xs uppercase tracking-widest text-secondary">Latest snapshot</p>
            <p className="mt-2 font-mono text-sm">
              {latestSnapshot
                ? new Date(latestSnapshot.generated_at).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC'
                : 'Pending first daily run'}
            </p>
          </div>
          <div className="bg-background p-5">
            <p className="text-xs uppercase tracking-widest text-secondary">Methodology</p>
            <p className="mt-2 font-mono text-sm">{RANKING_METHODOLOGY_VERSION}</p>
          </div>
        </section>

        <section className="border-b border-border py-10">
          <div className="mb-6 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs uppercase tracking-widest text-secondary">Default popularity ranking</p>
              <h2 className="mt-3 font-display text-3xl font-semibold">Most-starred agent skill projects</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                GitHub stars are a project-level popularity signal. Every repository appears once; nested Skills are evaluated separately by task fit, quality, safety, and real outcomes.
              </p>
            </div>
            <Link
              href="/rankings/most-starred-agent-skills"
              className="shrink-0 text-sm text-secondary underline underline-offset-4 hover:text-foreground"
            >
              Open full popularity ranking
            </Link>
          </div>

          <nav className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Ranking views">
            {[
              ['/rankings/most-starred-agent-skills', 'Most starred'],
              ['/trending', 'Trending'],
              ['/rankings/new-agent-skills-this-week', 'New this week'],
              ['/rankings/highest-quality-agent-skills', 'Quality'],
              ['/rankings/agent-proven', 'Agent proven'],
            ].map(([href, label], index) => (
              <Link
                key={href}
                href={href}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  index === 0
                    ? 'border-[#006b4f] bg-[#006b4f] text-white'
                    : 'border-border bg-background text-secondary hover:border-[#006b4f] hover:text-[#006b4f]'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <GitHubPopularityList
            items={popularSkills.map((item) => ({
              rank: item.rank,
              slug: item.skill.slug,
              name: normalizeRankingText(item.skill.name),
              description: normalizeRankingText(item.skill.description),
              githubStars: item.skill.github_stars,
              githubRepo: item.skill.github_repo,
              authorName: item.skill.author_name,
              badge: normalizeRankingText(item.badge),
              reason: normalizeRankingText(item.reason),
              category: normalizeRankingText(item.skill.category),
            }))}
          />
        </section>

        <section className="border-b border-border py-10">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-widest text-secondary">More ranking lenses</p>
            <h2 className="mt-3 font-display text-2xl font-semibold">Popularity is the default, not the only decision signal.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CORE_RANKINGS.map((ranking) => {
            const topSkills = rankSkillsForDefinition(
              skills,
              ranking,
              usesOutcomeStats(ranking) ? outcomeStatsMap : statsMap,
              3
            )

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
                        <span className="truncate">{normalizeRankingText(item.skill.name)}</span>
                        <span className="shrink-0 font-mono text-xs text-secondary">{normalizeRankingText(item.badge)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.65fr_1.35fr]">
          <div>
            <p className="text-xs uppercase tracking-widest text-secondary">How ranking works</p>
            <h2 className="mt-3 font-display text-2xl font-semibold">No pay-to-rank. No single-metric winners.</h2>
          </div>
          <div className="grid gap-4 text-sm leading-relaxed text-secondary sm:grid-cols-2">
            <p><span className="font-semibold text-foreground">Bounded scores</span> normalize every public ranking score to 0–100. Raw stars or timestamps can order their dedicated lists but are never exposed as a score.</p>
            <p><span className="font-semibold text-foreground">Independent dimensions</span> separate popularity, quality, freshness, agent evidence, evidence confidence, install readiness, and task fit.</p>
            <p><span className="font-semibold text-foreground">Evidence-aware ranking</span> prevents one reported success from outranking broader multi-agent evidence and clearly marks skills that still need a first run.</p>
            <p><span className="font-semibold text-foreground">Daily snapshots</span> use a versioned methodology so published leaderboards remain reproducible and auditable.</p>
          </div>
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
                      Leading pick: <span className="text-foreground">{normalizeRankingText(topSkill.skill.name)}</span>
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
