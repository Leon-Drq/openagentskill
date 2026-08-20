import type { Metadata } from 'next'
import Link from 'next/link'
import { GrowthSkillList } from '@/components/growth-skill-list'
import { MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
import {
  getAgentOutcomeStatsMap,
  getAllSkills,
  getSkillEventDailyStatsMap,
  getSkillEventStatsMap,
  type SkillEventDailyStats,
  type SkillEventStats,
  type SkillOutcomeStats,
} from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import { getLatestRankingSnapshot, RANKING_METHODOLOGY_VERSION } from '@/lib/ranking-snapshots'
import { rankTrendingSkills, summarizeSkillDailyStats } from '@/lib/seo/growth-directories'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Trending AI Agent Skills | OpenAgentSkill',
  description:
    'Track trending AI agent skills by OpenAgentSkill activity, install-copy signals, GitHub adoption, quality, and trust.',
  alternates: {
    canonical: 'https://www.openagentskill.com/trending',
  },
  openGraph: {
    title: 'Trending AI Agent Skills - OpenAgentSkill',
    description: 'A live shortlist of agent skills gaining attention across the OpenAgentSkill index.',
    url: 'https://www.openagentskill.com/trending',
    type: 'website',
  },
}

export default async function TrendingSkillsPage() {
  const [skills, eventStatsMap, dailyStatsMap, outcomeStatsMap, latestSnapshot] = await Promise.all([
    getAllSkills('quality', undefined, 1200).catch(() => []),
    getSkillEventStatsMap().catch((): Record<string, SkillEventStats> => ({})),
    getSkillEventDailyStatsMap(7).catch((): Record<string, SkillEventDailyStats[]> => ({})),
    getAgentOutcomeStatsMap().catch((): Record<string, SkillOutcomeStats> => ({})),
    getLatestRankingSnapshot('trending'),
  ])
  const ranked = rankTrendingSkills(skills, eventStatsMap, dailyStatsMap, outcomeStatsMap, 40)
  const dailySummaries = Object.values(dailyStatsMap).map((rows) => summarizeSkillDailyStats(rows))
  const hasDailyStats = dailySummaries.some((stats) => stats.total_events > 0)
  const totalEvents = hasDailyStats
    ? dailySummaries.reduce((sum, stats) => sum + Number(stats.total_events || 0), 0)
    : Object.values(eventStatsMap).reduce((sum, stats) => sum + Number(stats.total_events || 0), 0)
  const totalCopies = hasDailyStats
    ? dailySummaries.reduce((sum, stats) => sum + Number(stats.install_copies || 0), 0)
    : Object.values(eventStatsMap).reduce((sum, stats) => sum + Number(stats.install_copies || 0), 0)
  const totalViews = hasDailyStats
    ? dailySummaries.reduce((sum, stats) => sum + Number(stats.views || 0), 0)
    : Object.values(eventStatsMap).reduce((sum, stats) => sum + Number(stats.views || 0), 0)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Trending AI Agent Skills',
    description: metadata.description,
    url: 'https://www.openagentskill.com/trending',
    mainEntity: ranked.slice(0, 10).map((item) => ({
      '@type': 'SoftwareApplication',
      position: item.rank,
      name: item.skill.name,
      url: `https://www.openagentskill.com/skills/${item.skill.slug}`,
      applicationCategory: item.skill.category,
    })),
  }

  return (
    <MarketingPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MarketingHero
        eyebrow="Trending skills"
        title="Trending AI agent skills."
        description="A live growth list based on OpenAgentSkill page activity, install-copy events, compare intent, GitHub adoption, quality, and trust. Use it to spot skills people are actively evaluating."
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: formatCompactNumber(totalEvents), label: hasDailyStats ? 'Events / 7d' : 'Events' },
              { value: formatCompactNumber(totalViews), label: 'Views' },
              { value: formatCompactNumber(totalCopies), label: 'Copies' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
        <section className="grid gap-px border-x border-b border-border bg-border sm:grid-cols-3">
          <div className="bg-background p-5">
            <p className="text-xs uppercase tracking-widest text-secondary">Daily snapshot</p>
            <p className="mt-2 font-mono text-sm">
              {latestSnapshot
                ? new Date(latestSnapshot.generated_at).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC'
                : 'First snapshot pending'}
            </p>
          </div>
          <div className="bg-background p-5">
            <p className="text-xs uppercase tracking-widest text-secondary">Method</p>
            <p className="mt-2 font-mono text-sm">{latestSnapshot?.methodology_version || RANKING_METHODOLOGY_VERSION}</p>
          </div>
          <div className="bg-background p-5">
            <p className="text-xs uppercase tracking-widest text-secondary">Anti-gaming</p>
            <p className="mt-2 text-sm leading-relaxed">Daily event caps, logarithmic weighting, trust, and agent outcomes.</p>
          </div>
        </section>

        <section className="grid gap-3 border-b border-border py-8 md:grid-cols-4">
          <Link href="/hot" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Hot list</p>
            <h2 className="font-display text-xl font-semibold">Skills heating up now</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">Activity and freshness weighted more aggressively.</p>
          </Link>
          <Link href="/official" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Official</p>
            <h2 className="font-display text-xl font-semibold">Technology makers</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">Browse skills from recognized ecosystem creators.</p>
          </Link>
          <Link href="/audits" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Audits</p>
            <h2 className="font-display text-xl font-semibold">Review before install</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">Check trust, quality, maintenance, and install readiness.</p>
          </Link>
          <Link href="/agents" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Agents</p>
            <h2 className="font-display text-xl font-semibold">Fit by agent</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">Claude Code, Codex, Cursor, Copilot, Gemini, and more.</p>
          </Link>
        </section>

        <section className="py-10">
          <div className="mb-6">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Current leaderboard</p>
            <h2 className="font-display text-2xl font-semibold">Skills gaining evaluation intent</h2>
          </div>
          <GrowthSkillList items={ranked} />
        </section>

        <section className="grid gap-8 border-t border-border py-10 md:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs uppercase tracking-widest text-secondary">Transparent ranking</p>
            <h2 className="mt-3 font-display text-2xl font-semibold">Momentum, not raw popularity.</h2>
          </div>
          <div className="grid gap-4 text-sm leading-relaxed text-secondary sm:grid-cols-2">
            <p>Recent views, install copies, comparisons, saves, and repository clicks are capped per skill and day, then dampened logarithmically.</p>
            <p>Quality, Trust Score, repository adoption, activity across multiple days, and verified agent outcomes prevent one noisy signal from deciding the list.</p>
          </div>
        </section>
      </div>
    </MarketingPageShell>
  )
}
