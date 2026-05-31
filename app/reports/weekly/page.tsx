import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills, getSkillEventStatsMap, type SkillRecord } from '@/lib/db/skills'
import { buildWeeklySkillReport } from '@/lib/reports'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Weekly AI Agent Skill Report',
  description:
    'OpenAgentSkill weekly report: new AI agent skills, recently updated projects, most viewed skills, and best shortlist candidates.',
  alternates: {
    canonical: 'https://www.openagentskill.com/reports/weekly',
  },
}

function SkillList({ skills }: { skills: SkillRecord[] }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {skills.map((skill) => {
        const quality = getSkillQualityProfile(skill)
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
                  {quality.label} · {quality.score}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-secondary">{skill.description}</p>
            </div>
            <div className="font-mono text-xs text-secondary">{formatCompactNumber(skill.github_stars || 0)} stars</div>
          </Link>
        )
      })}
    </div>
  )
}

export default async function WeeklyReportPage() {
  const [skills, eventStatsMap] = await Promise.all([
    getAllSkills('quality').catch(() => []),
    getSkillEventStatsMap().catch(() => ({})),
  ])
  const report = buildWeeklySkillReport(skills, eventStatsMap)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="border-b border-border pb-10">
          <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Weekly report</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
            What changed in agent skills this week.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
            A compact operating report for builders: new skills, recently maintained projects, engagement signals,
            and high-confidence picks to evaluate.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-px border border-border bg-border text-center md:grid-cols-4">
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{report.newSkills.length}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">New</div>
            </div>
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{report.recentlyUpdated.length}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Updated</div>
            </div>
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{report.mostViewed.length}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Viewed</div>
            </div>
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{report.editorPicks.length}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Picks</div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Editor picks</p>
            <h2 className="font-display text-2xl font-semibold">Start here if you only have 10 minutes.</h2>
          </div>
          <SkillList skills={report.editorPicks} />
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">New this week</p>
            <h2 className="font-display text-2xl font-semibold">Freshly indexed skills</h2>
          </div>
          {report.newSkills.length > 0 ? <SkillList skills={report.newSkills} /> : (
            <p className="text-sm text-secondary">No new skills indexed in the current weekly window yet.</p>
          )}
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Maintained</p>
            <h2 className="font-display text-2xl font-semibold">Recently updated repositories</h2>
          </div>
          {report.recentlyUpdated.length > 0 ? <SkillList skills={report.recentlyUpdated} /> : (
            <p className="text-sm text-secondary">No recent GitHub push data in this weekly window yet.</p>
          )}
        </section>

        <section className="py-10">
          <div className="mb-6">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Engagement</p>
            <h2 className="font-display text-2xl font-semibold">Most copied install commands</h2>
          </div>
          {report.mostInstalled.length > 0 ? (
            <div className="divide-y divide-border border-y border-border">
              {report.mostInstalled.map(({ skill, stats }) => (
                <Link key={skill.slug} href={`/skills/${skill.slug}`} className="flex items-center justify-between gap-4 py-4 hover:bg-muted/30">
                  <span className="font-display text-lg font-semibold">{skill.name}</span>
                  <span className="font-mono text-xs text-secondary">{stats.install_copies} copies</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-secondary">Install-copy engagement will appear here as users interact with skill pages.</p>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
