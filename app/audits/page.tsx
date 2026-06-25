import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
import { auditRiskLabel, buildSkillAudit, normalizeAuditRecord, type ComputedSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile, type AgentSafetyProfile } from '@/lib/agent-safety'
import {
  getAllSkills,
  getSkillAuditsMap,
  getSkillEventStatsMap,
  type SkillAuditRecord,
  type SkillEventStats,
  type SkillRecord,
} from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Agent Skill Audit Reports | OpenAgentSkill',
  description:
    'Browse OpenAgentSkill audit reports for AI agent skills, including quality, trust, maintenance, install readiness, and review warnings.',
  alternates: {
    canonical: 'https://www.openagentskill.com/audits',
  },
  openGraph: {
    title: 'AI Agent Skill Audit Reports - OpenAgentSkill',
    description: 'Heuristic adoption audits for the OpenAgentSkill index.',
    url: 'https://www.openagentskill.com/audits',
    type: 'website',
  },
}

interface AuditRow {
  skill: SkillRecord
  audit: ComputedSkillAudit
  safety: AgentSafetyProfile
  rank: number
}

function riskTone(risk: ComputedSkillAudit['risk_level']) {
  if (risk === 'safe_to_try') return 'border-foreground text-foreground'
  if (risk === 'needs_review') return 'border-amber-300 text-amber-700'
  return 'border-red-300 text-red-700'
}

function safetyTierTone(tier: string) {
  if (tier === 'verified') return 'border-[#006b4f] text-[#006b4f]'
  if (tier === 'reviewed') return 'border-foreground text-foreground'
  if (tier === 'blocked') return 'border-red-300 text-red-700'
  return 'border-amber-300 text-amber-700'
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildRows(
  skills: SkillRecord[],
  eventStatsMap: Record<string, SkillEventStats>
): AuditRow[] {
  return skills
    .map((skill) => {
      const audit = buildSkillAudit(skill, eventStatsMap[skill.slug])
      return {
        skill,
        audit,
        safety: getAgentSafetyProfile(skill, audit, { max_risk: 'medium', needs_install_command: true }),
        rank: 0,
      }
    })
    .sort((a, b) => b.audit.audit_score - a.audit.audit_score || b.skill.github_stars - a.skill.github_stars)
    .map((row, index) => ({ ...row, rank: index + 1 }))
}

export default async function AuditsPage() {
  const [skills, auditsMap, eventStatsMap] = await Promise.all([
    getAllSkills('quality', undefined, 1200).catch(() => []),
    getSkillAuditsMap().catch((): Record<string, SkillAuditRecord> => ({})),
    getSkillEventStatsMap().catch((): Record<string, SkillEventStats> => ({})),
  ])

  const rows = buildRows(skills, eventStatsMap)
    .map((row) => {
      const stored = auditsMap[row.skill.slug]
      if (!stored) return row
      const audit = normalizeAuditRecord(stored)
      return {
        ...row,
        audit,
        safety: getAgentSafetyProfile(row.skill, audit, { max_risk: 'medium', needs_install_command: true }),
      }
    })
    .sort((a, b) => b.audit.audit_score - a.audit.audit_score || b.skill.github_stars - a.skill.github_stars)
    .map((row, index) => ({ ...row, rank: index + 1 }))

  const safeCount = rows.filter((row) => row.audit.risk_level === 'safe_to_try').length
  const reviewCount = rows.filter((row) => row.audit.risk_level === 'needs_review').length
  const riskyCount = rows.filter((row) => row.audit.risk_level === 'risky').length
  const blockedCount = rows.filter((row) => row.safety.blocked).length
  const reviewedCount = rows.filter((row) => row.safety.safety_tier.tier === 'reviewed' || row.safety.safety_tier.tier === 'verified').length
  const averageAudit = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.audit.audit_score, 0) / rows.length)
    : 0

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'AI Agent Skill Audit Reports',
    description: metadata.description,
    url: 'https://www.openagentskill.com/audits',
    mainEntity: rows.slice(0, 20).map((row) => ({
      '@type': 'SoftwareApplication',
      position: row.rank,
      name: row.skill.name,
      url: `https://www.openagentskill.com/skills/${row.skill.slug}/audit`,
      applicationCategory: row.skill.category,
    })),
  }

  return (
    <MarketingPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MarketingHero
        eyebrow="Audit reports"
        title="Skill audit reports for agent builders."
        description="A practical review layer for install readiness, trust, quality, maintenance, and adoption risk. These reports are heuristic metadata audits, not full source-code security reviews."
        aside={
          <MarketingMetricStrip
            columns="grid-cols-2 sm:grid-cols-5"
            items={[
              { value: averageAudit, label: 'Avg audit' },
              { value: safeCount, label: 'Safe' },
              { value: reviewCount, label: 'Review' },
              { value: riskyCount, label: 'Risky' },
              { value: blockedCount, label: 'Blocked' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
        <section className="grid gap-3 border-b border-border py-8 md:grid-cols-3">
          <Link href="/trending" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Momentum</p>
            <h2 className="font-display text-xl font-semibold">Trending skills</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              Pair audit confidence with recent install-copy and page activity.
            </p>
          </Link>
          <Link href="/api-docs#skill-badges" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Badges</p>
            <h2 className="font-display text-xl font-semibold">Show audit score</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              Add an OpenAgentSkill audit badge to GitHub READMEs.
            </p>
          </Link>
          <Link href="/compare" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Decision support</p>
            <h2 className="font-display text-xl font-semibold">Compare candidates</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              Review audit, trust, quality, and freshness before installing.
            </p>
          </Link>
        </section>

        <section className="py-10">
          <div className="mb-6">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Highest confidence</p>
            <h2 className="font-display text-2xl font-semibold">Audited skill shortlist</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              {reviewedCount.toLocaleString()} skills are verified or reviewed by the safety gate; blocked candidates are excluded from autonomous install recommendations.
            </p>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {rows.slice(0, 80).map((row) => {
              const passCount = row.audit.checks.filter((check) => check.status === 'pass').length
              const reviewCount =
                row.audit.checks.filter((check) => check.status === 'warn' || check.status === 'fail').length +
                row.audit.warnings.length
              return (
                <article key={row.skill.slug} className="grid gap-5 py-7 lg:grid-cols-[auto_1fr_260px]">
                  <div className="font-mono text-2xl text-secondary tabular-nums">#{row.rank}</div>
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Link href={`/skills/${row.skill.slug}/audit`} className="min-w-0">
                        <h3 className="font-display text-2xl font-semibold leading-tight hover:text-secondary">
                          {row.skill.name}
                        </h3>
                      </Link>
                      <span className={`border px-2 py-0.5 font-mono text-xs ${riskTone(row.audit.risk_level)}`}>
                        {auditRiskLabel(row.audit.risk_level)}
                      </span>
                      <span className="border border-border px-2 py-0.5 font-mono text-xs text-secondary">
                        Audit {row.audit.audit_score}
                      </span>
                      <span className="border border-border px-2 py-0.5 font-mono text-xs text-secondary">
                        Trust {row.audit.trust_score}
                      </span>
                      <span className={`border px-2 py-0.5 font-mono text-xs ${safetyTierTone(row.safety.safety_tier.tier)}`}>
                        {row.safety.safety_tier.badge}
                      </span>
                    </div>
                    <p className="max-w-3xl text-sm leading-relaxed text-secondary">{row.skill.description}</p>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed">
                      {passCount} checks passed, {reviewCount} review items. {row.audit.warnings[0] || 'No major metadata warnings detected.'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-4 font-mono text-xs text-secondary">
                      <span>{formatCompactNumber(row.skill.github_stars || 0)} stars</span>
                      <span>{formatDate(row.skill.github_last_pushed_at || row.skill.updated_at)} push</span>
                      <span>Quality {row.audit.quality_score}</span>
                      <span>Maintenance {row.audit.maintenance_score}</span>
                      <span>{row.safety.safety_tier.auto_install_policy} policy</span>
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <Link
                      href={`/skills/${row.skill.slug}/audit`}
                      className="border border-foreground bg-foreground px-4 py-2.5 text-center font-semibold text-background transition-opacity hover:opacity-80"
                    >
                      View audit
                    </Link>
                    <Link
                      href={`/skills/${row.skill.slug}`}
                      className="border border-border px-4 py-2.5 text-center text-secondary transition-colors hover:border-foreground hover:text-foreground"
                    >
                      Skill page
                    </Link>
                    <Link
                      href={`/api/badge/${row.skill.slug}?metric=audit&label=Audit`}
                      className="border border-border px-4 py-2.5 text-center text-secondary transition-colors hover:border-foreground hover:text-foreground"
                    >
                      Audit badge
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </MarketingPageShell>
  )
}
