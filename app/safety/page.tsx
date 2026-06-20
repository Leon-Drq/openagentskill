import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
import { buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile, type SkillSafetyTier } from '@/lib/agent-safety'
import { getAllSkills, getSkillEventStatsMap, type SkillEventStats } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'OpenAgentSkill Safety Gate | Trust Center for AI Agent Skills',
  description:
    'Understand how OpenAgentSkill ranks AI agent skills with Verified, Reviewed, Experimental, and Blocked safety gates before agents install third-party code.',
  alternates: {
    canonical: 'https://www.openagentskill.com/safety',
  },
  openGraph: {
    title: 'OpenAgentSkill Safety Gate',
    description: 'A trust layer for AI agent skill discovery, recommendation, audit, and install decisions.',
    url: 'https://www.openagentskill.com/safety',
    type: 'website',
  },
}

function tierTone(tier: SkillSafetyTier) {
  if (tier === 'verified') return 'border-[#006b4f] text-[#006b4f]'
  if (tier === 'reviewed') return 'border-foreground text-foreground'
  if (tier === 'blocked') return 'border-red-300 text-red-700'
  return 'border-amber-300 text-amber-700'
}

function tierLabel(tier: SkillSafetyTier) {
  if (tier === 'verified') return 'Verified'
  if (tier === 'reviewed') return 'Reviewed'
  if (tier === 'blocked') return 'Blocked'
  return 'Experimental'
}

export default async function SafetyPage() {
  const [skills, eventStatsMap] = await Promise.all([
    getAllSkills('quality').catch(() => []),
    getSkillEventStatsMap().catch((): Record<string, SkillEventStats> => ({})),
  ])

  const rows = skills
    .map((skill) => {
      const eventStats = eventStatsMap[skill.slug] || null
      const audit = buildSkillAudit(skill, eventStats)
      const safety = getAgentSafetyProfile(skill, audit, { max_risk: 'medium', needs_install_command: true })
      const trust = getSkillTrustProfile(skill, false, eventStats)

      return { skill, audit, safety, trust }
    })
    .sort((a, b) =>
      b.safety.score - a.safety.score ||
      b.trust.score - a.trust.score ||
      Number(b.skill.github_stars || 0) - Number(a.skill.github_stars || 0)
    )

  const counts = {
    verified: rows.filter((row) => row.safety.safety_tier.tier === 'verified').length,
    reviewed: rows.filter((row) => row.safety.safety_tier.tier === 'reviewed').length,
    experimental: rows.filter((row) => row.safety.safety_tier.tier === 'experimental').length,
    blocked: rows.filter((row) => row.safety.safety_tier.tier === 'blocked').length,
  }
  const installAllowed = rows.filter((row) => row.safety.auto_install_allowed).length
  const topSafeRows = rows
    .filter((row) => row.safety.safety_tier.tier === 'verified' || row.safety.safety_tier.tier === 'reviewed')
    .slice(0, 12)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'OpenAgentSkill Safety Gate',
    description: metadata.description,
    url: 'https://www.openagentskill.com/safety',
    about: ['AI agent skills', 'software supply chain', 'agent safety', 'skill registry'],
  }

  return (
    <MarketingPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MarketingHero
        eyebrow="Trust center"
        title="Safety gates for reusable AI agent skills."
        description="OpenAgentSkill does not treat every GitHub repository as equally safe. Each skill gets a safety gate before it can enter agent recommendations, install handoffs, and audit workflows."
        aside={
          <MarketingMetricStrip
            items={[
              { label: 'Indexed', value: rows.length.toLocaleString() },
              { label: 'Auto allow', value: installAllowed.toLocaleString() },
              { label: 'Reviewed+', value: (counts.verified + counts.reviewed).toLocaleString() },
              { label: 'Blocked', value: counts.blocked.toLocaleString() },
            ]}
          />
        }
      />

        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-px border-x border-border bg-border md:grid-cols-4">
            {([
              ['verified', counts.verified, 'Strong audit, verified listing, install path, and no policy warnings.'],
              ['reviewed', counts.reviewed, 'Good audit signals. The agent can shortlist it, but may still require review.'],
              ['experimental', counts.experimental, 'Useful for discovery, but not for autonomous installation.'],
              ['blocked', counts.blocked, 'Excluded from default recommendations until a human reviews the risks.'],
            ] as Array<[SkillSafetyTier, number, string]>).map(([tier, count, description]) => (
              <Link
                key={tier}
                href={`/skills?safety=${tier}`}
                className="group min-w-0 bg-background p-5 transition-colors hover:bg-card"
              >
                <span className={`inline-flex border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${tierTone(tier)}`}>
                  {tierLabel(tier)}
                </span>
                <div className="mt-5 font-mono text-3xl">{count.toLocaleString()}</div>
                <p className="mt-3 text-sm leading-relaxed text-secondary">{description}</p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-secondary group-hover:text-foreground">
                  View skills
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[0.88fr_1.12fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Agent policy</p>
            <h2 className="mt-3 font-display text-3xl font-normal leading-tight md:text-4xl">
              Default to the safest useful skill, not the loudest repository.
            </h2>
            <p className="mt-5 text-sm leading-7 text-secondary">
              The Resolve API ranks task fit, Trust Score, audit score, installability, permission hints, and policy
              limits together. Blocked candidates are returned only as audit context; they are not selected for agent
              installation.
            </p>
            <div className="mt-6 grid gap-3 text-sm">
              <Link href="/api/agent/resolve?task=analyze%20stock%20news&agent=codex" prefetch={false} className="border border-foreground bg-foreground px-4 py-3 font-semibold text-background transition-opacity hover:opacity-80">
                Try Resolve API
              </Link>
              <Link href="/audits" className="border border-border px-4 py-3 font-semibold text-secondary transition-colors hover:border-foreground hover:text-foreground">
                Browse audit reports
              </Link>
            </div>
          </div>

          <div className="overflow-hidden border border-border bg-card">
            <div className="border-b border-border p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Policy contract</p>
              <h3 className="mt-2 font-display text-2xl font-semibold">What an agent should do.</h3>
            </div>
            <div className="grid gap-px bg-border text-sm">
              {[
                ['Verified', 'May install in a sandbox or low-risk workspace after normal review.'],
                ['Reviewed', 'Can be shortlisted; require human approval if permission notes exist.'],
                ['Experimental', 'Manual test only. Compare against safer alternatives first.'],
                ['Blocked', 'Do not auto-install. Use only for explicit human audit workflows.'],
              ].map(([label, detail]) => (
                <div key={label} className="grid gap-2 bg-background p-4 sm:grid-cols-[150px_1fr]">
                  <div className="font-mono text-xs uppercase tracking-widest text-secondary">{label}</div>
                  <div className="text-secondary">{detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card/35">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Safe shortlist</p>
                <h2 className="mt-2 font-display text-3xl font-normal">High-confidence skills to inspect first.</h2>
              </div>
              <Link href="/skills?safety=verified" className="self-start border border-border px-3 py-2 text-xs font-semibold text-secondary transition-colors hover:border-foreground hover:text-foreground sm:self-auto">
                View verified
              </Link>
            </div>

            <div className="divide-y divide-border border-y border-border">
              {topSafeRows.map((row, index) => (
                <article key={row.skill.slug} className="grid gap-4 py-5 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className="font-mono text-lg text-secondary tabular-nums">#{index + 1}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/skills/${row.skill.slug}`} className="min-w-0">
                        <h3 className="truncate font-display text-xl font-semibold hover:text-secondary">{row.skill.name}</h3>
                      </Link>
                      <span className={`border px-2 py-0.5 font-mono text-[10px] ${tierTone(row.safety.safety_tier.tier)}`}>
                        {row.safety.safety_tier.badge}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-secondary">{row.skill.description}</p>
                  </div>
                  <div className="grid gap-1 font-mono text-xs text-secondary md:text-right">
                    <span>{row.safety.score}/100 safety</span>
                    <span>{row.trust.score}/100 trust</span>
                    <span>{formatCompactNumber(row.skill.github_stars || 0)} stars</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
    </MarketingPageShell>
  )
}
