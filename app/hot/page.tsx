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
import { formatCompactNumber, getFreshnessDays } from '@/lib/quality'
import { rankHotSkills, summarizeSkillDailyStats } from '@/lib/seo/growth-directories'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Hot AI Agent Skills | OpenAgentSkill',
  description:
    'Discover hot AI agent skills with recent OpenAgentSkill activity, fresh repositories, install-copy events, and strong quality signals.',
  alternates: {
    canonical: 'https://www.openagentskill.com/hot',
  },
  openGraph: {
    title: 'Hot AI Agent Skills - OpenAgentSkill',
    description: 'A freshness-weighted shortlist for skills that are worth checking right now.',
    url: 'https://www.openagentskill.com/hot',
    type: 'website',
  },
}

export default async function HotSkillsPage() {
  const [skills, eventStatsMap, dailyStatsMap] = await Promise.all([
    getAllSkills('quality').catch(() => []),
    getSkillEventStatsMap().catch((): Record<string, SkillEventStats> => ({})),
    getSkillEventDailyStatsMap(7).catch((): Record<string, SkillEventDailyStats[]> => ({})),
  ])
  const ranked = rankHotSkills(skills, eventStatsMap, dailyStatsMap, 40)
  const dailySummaries = Object.values(dailyStatsMap).map((rows) => summarizeSkillDailyStats(rows))
  const totalRecentEvents = dailySummaries.reduce((sum, stats) => sum + Number(stats.total_events || 0), 0)
  const freshRepoCount = ranked.filter((item) => {
    const days = getFreshnessDays(item.skill.github_last_pushed_at)
    return days !== null && days < 45
  }).length
  const totalStars = ranked.reduce((sum, item) => sum + Number(item.skill.github_stars || 0), 0)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Hot AI Agent Skills',
    description: metadata.description,
    url: 'https://www.openagentskill.com/hot',
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
          <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Hot skills</p>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
                Hot agent skills worth checking now.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
                This list weights recent activity and fresh repository signals more heavily than the all-time leaderboard,
                so new and newly maintained skills can surface faster.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{formatCompactNumber(totalRecentEvents)}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Events / 7d</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{freshRepoCount}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Fresh</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{formatCompactNumber(totalStars)}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Stars</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 border-b border-border py-8 md:grid-cols-4">
          <Link href="/trending" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Trending</p>
            <h2 className="font-display text-xl font-semibold">Broader growth signals</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">Views, install copies, compares, quality, and trust.</p>
          </Link>
          <Link href="/best" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Best</p>
            <h2 className="font-display text-xl font-semibold">Use-case shortlists</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">Ranked by workflow fit instead of only activity.</p>
          </Link>
          <Link href="/audits" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Audits</p>
            <h2 className="font-display text-xl font-semibold">Install confidence</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">Inspect risk, trust, quality, and maintenance signals.</p>
          </Link>
          <Link href="/reports/monthly" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Monthly index</p>
            <h2 className="font-display text-xl font-semibold">Ecosystem shifts</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">Track maintained repos, new skills, and production candidates.</p>
          </Link>
        </section>

        <section className="py-10">
          <div className="mb-6">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Freshness-weighted list</p>
            <h2 className="font-display text-2xl font-semibold">Skills with current momentum</h2>
          </div>
          <GrowthSkillList items={ranked} />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
