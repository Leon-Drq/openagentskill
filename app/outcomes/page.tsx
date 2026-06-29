import type { Metadata } from 'next'
import Link from 'next/link'
import {
  MarketingButtonLink,
  MarketingFeatureGrid,
  MarketingHero,
  MarketingMetricStrip,
  MarketingPageShell,
} from '@/components/marketing-page'
import {
  createEmptyOutcomeStats,
  formatOutcomeSuccessRate,
  summarizeOutcomeStats,
} from '@/lib/agent-outcome-summary'
import { getAgentProvenProfile } from '@/lib/agent-proven'
import { getAgentOutcomeStatsMap, getAllSkills, type SkillOutcomeStats, type SkillRecord } from '@/lib/db/skills'
import { getSkillTrustProfile } from '@/lib/trust'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Agent Outcome Loop',
  description:
    'OpenAgentSkill agent outcome feedback tracks whether resolved skills actually worked, needed setup, failed, or were blocked by risk.',
  alternates: {
    canonical: 'https://www.openagentskill.com/outcomes',
  },
  openGraph: {
    title: 'Agent Outcome Loop — OpenAgentSkill',
    description:
      'Report real agent outcomes after a skill run so Trust Score, rankings, and install recommendations learn from use.',
    url: 'https://www.openagentskill.com/outcomes',
    type: 'website',
  },
}

function formatNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`
  return value.toLocaleString()
}

function scoreOutcomeRow(skill: SkillRecord, stats: SkillOutcomeStats) {
  const trust = getSkillTrustProfile(skill, false, null, stats)
  const proven = getAgentProvenProfile(stats)

  return (
    proven.score * 2.6 +
    Number(stats.total_outcomes || 0) * 8 +
    Number(stats.install_attempts || 0) * 3 +
    trust.score * 0.24 +
    Math.min(Number(skill.github_stars || 0), 50_000) / 2500
  )
}

function getRows(skills: SkillRecord[], statsMap: Record<string, SkillOutcomeStats>) {
  return skills
    .map((skill) => {
      const stats = statsMap[skill.slug] || createEmptyOutcomeStats(skill.slug)
      const trust = getSkillTrustProfile(skill, false, null, stats)

      return {
        skill,
        stats,
        trust,
        proven: getAgentProvenProfile(stats),
        score: scoreOutcomeRow(skill, stats),
      }
    })
    .sort((a, b) => b.score - a.score || b.skill.github_stars - a.skill.github_stars)
}

export default async function OutcomesPage() {
  const [skills, outcomeStatsMap] = await Promise.all([
    getAllSkills('quality', undefined, 1200).catch(() => []),
    getAgentOutcomeStatsMap().catch(() => ({})),
  ])
  const rows = getRows(skills, outcomeStatsMap).slice(0, 12)
  const statsRows = Object.values(outcomeStatsMap)
  const totalOutcomes = statsRows.reduce((sum, row) => sum + Number(row.total_outcomes || 0), 0)
  const successfulOutcomes = statsRows.reduce((sum, row) => sum + Number(row.successful_outcomes || 0), 0)
  const installAttempts = statsRows.reduce((sum, row) => sum + Number(row.install_attempts || 0), 0)
  const riskBlocked = statsRows.reduce((sum, row) => sum + Number(row.risk_blocked_outcomes || 0), 0)
  const productionOutcomes = statsRows.reduce((sum, row) => sum + Number(row.production_outcomes || 0), 0)
  const averageProvenScore = statsRows.length
    ? Math.round(statsRows.reduce((sum, row) => sum + getAgentProvenProfile(row).score, 0) / statsRows.length)
    : 0
  const successRate = totalOutcomes > 0 ? Math.round((successfulOutcomes / totalOutcomes) * 100) : null
  const skillsWithOutcomes = statsRows.filter((row) => Number(row.total_outcomes || 0) > 0).length

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'OpenAgentSkill Agent Outcome Stats',
    description:
      'Aggregate agent outcome feedback for reusable AI agent skills, including success rate, install attempts, setup friction, and risk blocks.',
    url: 'https://www.openagentskill.com/outcomes',
  }

  return (
    <MarketingPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MarketingHero
        eyebrow="Agent outcome loop"
        title="Let rankings learn from real agent runs."
        description="Every resolved skill should report what happened after one narrow task: success, failure, setup friction, or risk block. Those aggregate signals feed Trust Score, rankings, skill pages, and install recommendations."
        actions={
          <>
            <MarketingButtonLink href="/api-docs#agent-outcome" variant="primary">
              View outcome API
            </MarketingButtonLink>
            <MarketingButtonLink href="/api/agent/outcome?format=text" prefetch={false}>
              Read machine summary
            </MarketingButtonLink>
          </>
        }
        aside={
          <MarketingMetricStrip
            columns="grid-cols-2"
            items={[
              { value: formatNumber(totalOutcomes), label: 'Outcomes' },
              { value: successRate === null ? 'No data' : `${successRate}%`, label: 'Success' },
              { value: formatNumber(installAttempts), label: 'Installs' },
              { value: formatNumber(riskBlocked), label: 'Risk blocks' },
              { value: formatNumber(productionOutcomes), label: 'Production' },
              { value: averageProvenScore ? `${averageProvenScore}/100` : 'No data', label: 'Avg proven' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        <MarketingFeatureGrid
          items={[
            {
              label: 'Resolve',
              title: 'The agent gets one recommended skill.',
              copy: 'Resolve returns the selected skill, alternatives, install plan, Trust Score, safety policy, and a unique feedback event id.',
            },
            {
              label: 'Run',
              title: 'The agent tries one narrow task.',
              copy: 'Use a sandbox workflow first. Record whether install was used, whether setup was required, and whether risk blocked execution.',
            },
            {
              label: 'Learn',
              title: 'The registry updates trust signals.',
              copy: 'Aggregate outcomes improve rankings without exposing raw agent notes or per-user identifiers publicly.',
            },
          ]}
        />

        <section className="mt-10 border border-border bg-card">
          <div className="border-b border-border p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Outcome leaderboard</p>
                <h2 className="mt-3 font-display text-2xl font-normal">Skills with the strongest adoption evidence</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-secondary">
                {skillsWithOutcomes > 0
                  ? `${skillsWithOutcomes.toLocaleString()} skills currently have reported agent outcomes.`
                  : 'No public outcome reports yet; this page is ready for the first Resolve-powered runs.'}
              </p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {rows.map(({ skill, stats, trust, proven }, index) => (
              <Link
                key={skill.slug}
                href={`/skills/${skill.slug}`}
                className="grid gap-5 p-5 transition-colors hover:bg-muted/40 sm:grid-cols-[3rem_1.4fr_1fr] sm:p-6"
              >
                <div className="font-mono text-xl text-secondary">{String(index + 1).padStart(2, '0')}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-display text-xl font-normal">{skill.name}</h3>
                    <span className="rounded-full border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-secondary">
                      {proven.label}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-secondary">{skill.description}</p>
                  <p className="mt-3 text-xs leading-5 text-secondary">{summarizeOutcomeStats(stats)}</p>
                </div>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[8px] border border-border bg-border text-center text-xs">
                  {[
                    ['Success', formatOutcomeSuccessRate(stats)],
                    ['Proven', `${proven.score}/100`],
                    ['Outcomes', formatNumber(stats.total_outcomes)],
                    ['Recent fail', proven.metrics.recentFailureRate === null ? '—' : `${Math.round(proven.metrics.recentFailureRate)}%`],
                    ['Quality', proven.metrics.avgOutputQuality === null ? '—' : `${proven.metrics.avgOutputQuality.toFixed(1)}/5`],
                    ['Trust', `${trust.score}/100`],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-background p-3">
                      <div className="font-mono text-base">{value}</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">{label}</div>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="border border-border bg-card p-5 sm:p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">POST /api/agent/outcome</p>
            <h2 className="mt-3 font-display text-2xl font-normal">Report after one narrow run.</h2>
            <p className="mt-3 text-sm leading-6 text-secondary">
              Resolve responses include a unique <code className="font-mono text-foreground">feedback.event_id</code>.
              Agents should reuse it when reporting the result so retries stay idempotent.
            </p>
            <pre className="mt-5 overflow-x-auto rounded-[8px] border border-border bg-background p-4 text-xs leading-6 text-secondary"><code>{`{
  "event_id": "resolve_...",
  "skill_slug": "crawl4ai",
  "task": "scrape pricing pages",
  "agent": "codex",
  "outcome": "success",
  "install_used": true,
  "time_to_useful_ms": 120000
}`}</code></pre>
          </div>

          <div className="border border-border bg-card p-5 sm:p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Outcome meanings</p>
            <h2 className="mt-3 font-display text-2xl font-normal">Use the smallest honest label.</h2>
            <div className="mt-5 grid gap-px overflow-hidden rounded-[8px] border border-border bg-border text-sm">
              {[
                ['success', 'The skill helped complete the task.'],
                ['failed', 'The skill was attempted but did not work.'],
                ['not_relevant', 'The selected skill did not fit the task.'],
                ['blocked_by_risk', 'Audit, license, token, shell, or network risk stopped execution.'],
                ['setup_required', 'The skill looked relevant but needed missing keys, data, or configuration.'],
              ].map(([label, copy]) => (
                <div key={label} className="grid gap-2 bg-background p-3 sm:grid-cols-[10rem_1fr]">
                  <code className="font-mono text-xs text-foreground">{label}</code>
                  <span className="text-secondary">{copy}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </MarketingPageShell>
  )
}
