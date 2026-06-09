import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills, getSkillEventStatsMap, type SkillEventStats, type SkillRecord } from '@/lib/db/skills'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Monthly Agent Skills Index',
  description:
    'OpenAgentSkill monthly index report: production-ready agent skills, new indexed skills, maintained repositories, and ecosystem engagement signals.',
  alternates: {
    canonical: 'https://www.openagentskill.com/reports/monthly',
  },
  openGraph: {
    title: 'Monthly Agent Skills Index - OpenAgentSkill',
    description: 'A monthly data report for the AI agent skills ecosystem.',
    url: 'https://www.openagentskill.com/reports/monthly',
    type: 'website',
  },
}

function dateValue(value: string | null | undefined) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function withinDays(value: string | null | undefined, days: number) {
  const timestamp = dateValue(value)
  return timestamp > 0 && Date.now() - timestamp <= days * 86_400_000
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function SkillRows({ skills, metric }: { skills: SkillRecord[]; metric: 'trust' | 'stars' | 'fresh' }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {skills.map((skill) => {
        const quality = getSkillQualityProfile(skill)
        const trust = getSkillTrustProfile(skill)
        const metricValue =
          metric === 'trust'
            ? `${trust.score} trust`
            : metric === 'fresh'
              ? `${formatDate(skill.github_last_pushed_at || skill.updated_at)} push`
              : `${formatCompactNumber(skill.github_stars || 0)} stars`

        return (
          <Link
            key={skill.slug}
            href={`/skills/${skill.slug}`}
            className="grid gap-3 py-4 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-semibold">{skill.name}</h3>
                <span className="border border-border px-2 py-0.5 text-xs text-secondary">
                  {quality.label} {quality.score}
                </span>
                <span className="border border-border px-2 py-0.5 text-xs text-secondary">
                  {trust.label}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-secondary">{skill.description}</p>
            </div>
            <div className="font-mono text-xs text-secondary">{metricValue}</div>
          </Link>
        )
      })}
    </div>
  )
}

function EventRows({ rows }: { rows: Array<{ skill: SkillRecord; stats: SkillEventStats }> }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {rows.map(({ skill, stats }) => (
        <Link
          key={skill.slug}
          href={`/skills/${skill.slug}`}
          className="grid gap-3 py-4 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold">{skill.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-secondary">{skill.description}</p>
          </div>
          <div className="font-mono text-xs text-secondary">
            {formatCompactNumber(stats.views || 0)} views · {formatCompactNumber(stats.install_copies || 0)} copies
          </div>
        </Link>
      ))}
    </div>
  )
}

export default async function MonthlyReportPage() {
  const [skills, eventStatsMap] = await Promise.all([
    getAllSkills('quality').catch(() => []),
    getSkillEventStatsMap().catch(() => ({})),
  ])

  const monthWindow = 30
  const newSkills = skills
    .filter((skill) => withinDays(skill.created_at, monthWindow))
    .sort((a, b) => dateValue(b.created_at) - dateValue(a.created_at))
    .slice(0, 12)

  const recentlyUpdated = skills
    .filter((skill) => withinDays(skill.github_last_pushed_at || skill.updated_at, monthWindow))
    .sort((a, b) => dateValue(b.github_last_pushed_at || b.updated_at) - dateValue(a.github_last_pushed_at || a.updated_at))
    .slice(0, 12)

  const productionCandidates = skills
    .filter((skill) => getSkillTrustProfile(skill).tier === 'production')
    .sort((a, b) => getSkillTrustProfile(b).score - getSkillTrustProfile(a).score || b.github_stars - a.github_stars)
    .slice(0, 12)

  const topStarred = [...skills]
    .sort((a, b) => Number(b.github_stars || 0) - Number(a.github_stars || 0))
    .slice(0, 12)

  const statsRows = Object.values(eventStatsMap)
    .map((stats) => ({
      stats,
      skill: skills.find((skill) => skill.slug === stats.skill_slug),
    }))
    .filter((item): item is { stats: SkillEventStats; skill: SkillRecord } => Boolean(item.skill))
    .sort((a, b) => b.stats.views + b.stats.install_copies * 4 - (a.stats.views + a.stats.install_copies * 4))
    .slice(0, 12)

  const totalStars = skills.reduce((sum, skill) => sum + Number(skill.github_stars || 0), 0)
  const totalEvents = Object.values(eventStatsMap).reduce((sum, stats) => sum + Number(stats.total_events || 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="border-b border-border pb-10">
          <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Monthly report</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
            Monthly Agent Skills Index.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
            A data-backed snapshot of the agent skills ecosystem: trusted candidates, new indexed skills,
            maintained repositories, GitHub adoption, and OpenAgentSkill engagement.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-px border border-border bg-border text-center md:grid-cols-4">
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{skills.length.toLocaleString()}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Skills</div>
            </div>
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{formatCompactNumber(totalStars)}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">GitHub stars</div>
            </div>
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{productionCandidates.length}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Production</div>
            </div>
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{formatCompactNumber(totalEvents)}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Events</div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Production candidates</p>
            <h2 className="font-display text-2xl font-semibold">Highest trust skills this month</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Skills with strong trust profiles across install path, repository, license, adoption, and maintenance.
            </p>
          </div>
          <SkillRows skills={productionCandidates} metric="trust" />
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Newly indexed</p>
            <h2 className="font-display text-2xl font-semibold">Fresh skills added in the last 30 days</h2>
          </div>
          {newSkills.length > 0 ? <SkillRows skills={newSkills} metric="stars" /> : (
            <p className="text-sm text-secondary">No newly indexed skills in the current monthly window yet.</p>
          )}
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Maintained</p>
            <h2 className="font-display text-2xl font-semibold">Recently pushed repositories</h2>
          </div>
          {recentlyUpdated.length > 0 ? <SkillRows skills={recentlyUpdated} metric="fresh" /> : (
            <p className="text-sm text-secondary">No recent GitHub push data in this monthly window yet.</p>
          )}
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">GitHub adoption</p>
            <h2 className="font-display text-2xl font-semibold">Most starred skills in the index</h2>
          </div>
          <SkillRows skills={topStarred} metric="stars" />
        </section>

        <section className="grid gap-8 py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Engagement</p>
            <h2 className="font-display text-2xl font-semibold">Most active OpenAgentSkill pages</h2>
          </div>
          {statsRows.length > 0 ? <EventRows rows={statsRows} /> : (
            <p className="text-sm text-secondary">Engagement rows will appear as users view, save, compare, and copy install commands.</p>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
