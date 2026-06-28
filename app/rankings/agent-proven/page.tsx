import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { InstallCommand } from '@/components/install-command'
import {
  MarketingButtonLink,
  MarketingHero,
  MarketingMetricStrip,
  MarketingPageShell,
} from '@/components/marketing-page'
import {
  convertSkillRecordToManifest,
  getAgentOutcomeStatsMap,
  getAllSkills,
  getSkillEventStatsMap,
  type SkillEventStats,
  type SkillOutcomeStats,
  type SkillRecord,
} from '@/lib/db/skills'
import {
  formatOutcomeSuccessRate,
  getOutcomeReadinessLabel,
  summarizeOutcomeStats,
} from '@/lib/agent-outcome-summary'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import { getRankingCompareHref, getRankingDefinition, rankSkillsForDefinition } from '@/lib/rankings'
import { getSkillTrustProfile } from '@/lib/trust'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Agent-Proven AI Agent Skills',
  description:
    'Rank AI agent skills by real agent outcome reports, install attempts, success rate, risk blocks, setup friction, and Trust Score.',
  alternates: {
    canonical: 'https://www.openagentskill.com/rankings/agent-proven',
  },
  openGraph: {
    title: 'Agent-Proven AI Agent Skills - OpenAgentSkill',
    description:
      'A real-outcome ranking for AI agent skills: success reports, install attempts, risk blocks, setup friction, and Trust Score.',
    url: 'https://www.openagentskill.com/rankings/agent-proven',
    type: 'website',
  },
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'No reports yet'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function totalOutcomeReports(statsMap: Record<string, SkillOutcomeStats>) {
  return Object.values(statsMap).reduce((sum, row) => sum + Number(row.total_outcomes || 0), 0)
}

function totalInstallAttempts(statsMap: Record<string, SkillOutcomeStats>) {
  return Object.values(statsMap).reduce((sum, row) => sum + Number(row.install_attempts || 0), 0)
}

function aggregateSuccessRate(statsMap: Record<string, SkillOutcomeStats>) {
  const rows = Object.values(statsMap)
  const successes = rows.reduce((sum, row) => sum + Number(row.successful_outcomes || 0), 0)
  const total = rows.reduce((sum, row) => sum + Number(row.total_outcomes || 0), 0)
  if (total === 0) return 'No data'
  return `${Math.round((successes / total) * 100)}%`
}

function getStatsForSkill(skill: SkillRecord, statsMap: Record<string, SkillOutcomeStats>) {
  return statsMap[skill.slug] || null
}

function getInstallCommand(skill: SkillRecord) {
  const manifest = convertSkillRecordToManifest(skill)
  return manifest.technical.installCommand || `npx skills add ${skill.github_repo || skill.slug}`
}

function EvidencePill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-[999px] border border-border bg-background px-3 py-1 font-mono text-[11px] text-secondary">
      {children}
    </span>
  )
}

function SkillEvidenceRow({
  skill,
  rank,
  badge,
  reason,
  stats,
  eventStats,
}: {
  skill: SkillRecord
  rank: number
  badge: string
  reason: string
  stats: SkillOutcomeStats | null
  eventStats: SkillEventStats | null
}) {
  const quality = getSkillQualityProfile(skill)
  const trust = getSkillTrustProfile(skill, false, eventStats, stats)
  const hasOutcomeReports = Number(stats?.total_outcomes || 0) > 0

  return (
    <article className="grid gap-5 border-t border-border py-6 first:border-t-0 lg:grid-cols-[72px_1fr_290px]">
      <div className="font-mono text-2xl text-secondary tabular-nums">#{rank}</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/skills/${skill.slug}`} className="min-w-0">
            <h2 className="font-display text-2xl font-normal leading-tight hover:text-[#006b4f]">
              {skill.name}
            </h2>
          </Link>
          <EvidencePill>{badge}</EvidencePill>
          <EvidencePill>{trust.score}/100 Trust</EvidencePill>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary">{skill.description}</p>
        <p className="mt-3 max-w-3xl text-sm leading-6">{reason}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <EvidencePill>{formatCompactNumber(skill.github_stars || 0)} stars</EvidencePill>
          <EvidencePill>{quality.label} · {quality.score}</EvidencePill>
          <EvidencePill>{getOutcomeReadinessLabel(stats)}</EvidencePill>
          <EvidencePill>Last outcome: {formatDate(stats?.last_outcome_at)}</EvidencePill>
        </div>
        <div className="mt-5 grid gap-px overflow-hidden rounded-[8px] border border-border bg-border text-sm sm:grid-cols-5">
          {[
            ['Success', formatOutcomeSuccessRate(stats)],
            ['Outcomes', formatCompactNumber(stats?.total_outcomes || 0)],
            ['Installs', formatCompactNumber(stats?.install_attempts || 0)],
            ['Risk blocked', formatCompactNumber(stats?.risk_blocked_outcomes || 0)],
            ['Setup needed', formatCompactNumber(stats?.setup_required_outcomes || 0)],
          ].map(([label, value]) => (
            <div key={label} className="bg-card p-3">
              <div className="font-mono text-lg leading-none">{value}</div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-secondary">
          {hasOutcomeReports
            ? summarizeOutcomeStats(stats)
            : 'This skill has enough public quality signals to test, but still needs its first reported agent outcome.'}
        </p>
      </div>
      <div className="space-y-3">
        <InstallCommand command={getInstallCommand(skill)} skillSlug={skill.slug} compact />
        <div className="grid gap-2 text-sm">
          <Link
            href={`/skills/${skill.slug}`}
            className="rounded-[8px] border border-border px-3 py-2 text-center text-secondary transition-colors hover:border-foreground hover:text-foreground"
          >
            Open skill page
          </Link>
          <Link
            href={`/skills/${skill.slug}/audit`}
            className="rounded-[8px] border border-border px-3 py-2 text-center text-secondary transition-colors hover:border-foreground hover:text-foreground"
          >
            Open audit
          </Link>
          <Link
            href={`/api/agent/resolve?task=${encodeURIComponent(`Use ${skill.name} in an agent workflow`)}&agent=codex&max_risk=medium&format=text`}
            prefetch={false}
            className="rounded-[8px] border border-[#006b4f] bg-[#006b4f] px-3 py-2 text-center font-semibold text-white transition-opacity hover:opacity-90"
          >
            Resolve plan
          </Link>
        </div>
      </div>
    </article>
  )
}

export default async function AgentProvenRankingsPage() {
  const ranking = getRankingDefinition('agent-proven')
  const [skills, outcomeStatsMap, eventStatsMap] = await Promise.all([
    getAllSkills('quality', undefined, 1600).catch(() => []),
    getAgentOutcomeStatsMap().catch((): Record<string, SkillOutcomeStats> => ({})),
    getSkillEventStatsMap().catch((): Record<string, SkillEventStats> => ({})),
  ])

  const rankedSkills = ranking
    ? rankSkillsForDefinition(skills, ranking, outcomeStatsMap, 36)
    : []
  const provenSkills = rankedSkills.filter((item) => Number(getStatsForSkill(item.skill, outcomeStatsMap)?.total_outcomes || 0) > 0)
  const firstOutcomeCandidates = rankedSkills.filter((item) => Number(getStatsForSkill(item.skill, outcomeStatsMap)?.total_outcomes || 0) === 0)
  const displayedSkills = provenSkills.length > 0 ? [...provenSkills, ...firstOutcomeCandidates.slice(0, 8)] : rankedSkills.slice(0, 24)
  const compareHref = getRankingCompareHref(displayedSkills)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Agent-proven AI agent skills',
    description:
      'Skills ranked by real agent outcome reports, install attempts, success rate, risk blocks, setup friction, and Trust Score.',
    itemListElement: displayedSkills.slice(0, 20).map((item) => ({
      '@type': 'ListItem',
      position: item.rank,
      url: `https://www.openagentskill.com/skills/${item.skill.slug}`,
      name: item.skill.name,
    })),
  }

  return (
    <MarketingPageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <MarketingHero
        eyebrow="Agent-proven ranking"
        title="Skills ranked by real agent outcome evidence."
        description="Agent-Proven favors skills that agents actually tried: success reports, install attempts, risk blocks, setup friction, and Trust Score. High-star projects still matter, but they do not fake real adoption."
        actions={
          <>
            <MarketingButtonLink href="/api/agent/outcome?format=text" variant="primary" prefetch={false}>
              Read outcome feed
            </MarketingButtonLink>
            <MarketingButtonLink href={compareHref}>
              Compare top picks
            </MarketingButtonLink>
          </>
        }
        aside={
          <MarketingMetricStrip
            columns="grid-cols-2"
            items={[
              { value: formatCompactNumber(totalOutcomeReports(outcomeStatsMap)), label: 'Outcome reports' },
              { value: aggregateSuccessRate(outcomeStatsMap), label: 'Success rate' },
              { value: formatCompactNumber(totalInstallAttempts(outcomeStatsMap)), label: 'Install attempts' },
              { value: Object.keys(outcomeStatsMap).length.toLocaleString(), label: 'Skills with signals' },
            ]}
          />
        }
      />

      <section className="border-b border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-px px-6 py-8 md:grid-cols-3">
          {[
            ['1. Resolve', 'Call /api/agent/resolve before installing a third-party skill.'],
            ['2. Run narrowly', 'Install in a sandbox or low-risk workspace and complete one concrete task.'],
            ['3. Report outcome', 'POST success, failure, not_relevant, blocked_by_risk, or setup_required back to /api/agent/outcome.'],
          ].map(([title, copy]) => (
            <div key={title} className="border border-border bg-background p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">{title}</p>
              <p className="mt-3 text-sm leading-6 text-secondary">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Ranked skills</p>
            <h2 className="mt-3 font-display text-3xl font-normal">Outcome-backed shortlist</h2>
          </div>
          <Link href="/rankings" className="text-sm text-secondary underline underline-offset-4 hover:text-foreground">
            Browse all rankings
          </Link>
        </div>

        <div className="rounded-[8px] border border-border bg-background px-5 sm:px-6">
          {displayedSkills.length > 0 ? (
            displayedSkills.map((item, index) => (
              <SkillEvidenceRow
                key={item.skill.slug}
                skill={item.skill}
                rank={index + 1}
                badge={item.badge}
                reason={item.reason}
                stats={getStatsForSkill(item.skill, outcomeStatsMap)}
                eventStats={eventStatsMap[item.skill.slug] || null}
              />
            ))
          ) : (
            <div className="py-12">
              <h2 className="font-display text-2xl font-normal">No skills are ready for this ranking yet.</h2>
              <p className="mt-3 text-sm leading-6 text-secondary">
                The outcome loop is active. Once agents report resolved runs, this page will rank them by real adoption evidence.
              </p>
            </div>
          )}
        </div>
      </section>
    </MarketingPageShell>
  )
}
