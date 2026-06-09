import type { Metadata } from 'next'
import Link from 'next/link'
import { GrowthSkillList } from '@/components/growth-skill-list'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import {
  getAllSkills,
  getSkillEventDailyStatsMap,
  getSkillEventStatsMap,
  type SkillEventDailyStats,
  type SkillEventStats,
} from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
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
  const [skills, eventStatsMap, dailyStatsMap] = await Promise.all([
    getAllSkills('quality').catch(() => []),
    getSkillEventStatsMap().catch((): Record<string, SkillEventStats> => ({})),
    getSkillEventDailyStatsMap(7).catch((): Record<string, SkillEventDailyStats[]> => ({})),
  ])
  const ranked = rankTrendingSkills(skills, eventStatsMap, dailyStatsMap, 40)
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
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="border-b border-border pb-10">
          <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Trending skills</p>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
                Trending AI agent skills.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
                A live growth list based on OpenAgentSkill page activity, install-copy events, compare intent,
                GitHub adoption, quality, and trust. Use it to spot skills people are actively evaluating.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{formatCompactNumber(totalEvents)}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">
                  {hasDailyStats ? 'Events / 7d' : 'Events'}
                </div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{formatCompactNumber(totalViews)}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Views</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{formatCompactNumber(totalCopies)}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Copies</div>
              </div>
            </div>
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
      </main>

      <SiteFooter />
    </div>
  )
}
