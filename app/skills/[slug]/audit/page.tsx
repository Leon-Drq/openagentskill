import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InstallCommand } from '@/components/install-command'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { buildAgentReadableSkillMetadata } from '@/lib/agent-readable'
import {
  auditRiskLabel,
  buildSkillAudit,
  normalizeAuditRecord,
  type ComputedSkillAudit,
  type SkillAuditCheck,
} from '@/lib/audits'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import { withTimeout } from '@/lib/async'
import { getRelatedSkills, getSkillAuditBySlug, getSkillEventStats } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import { getSkillBySlugOrFallback, isCuratedSkillFallback } from '@/lib/skill-fallbacks'
import { getSkillTrustProfile, type TrustCheckStatus } from '@/lib/trust'

export const dynamic = 'force-dynamic'
const SKILL_AUDIT_SUPPORT_TIMEOUT_MS = 1200

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const skill = await getSkillBySlugOrFallback(slug)
  if (!skill) return { title: 'Skill Audit Not Found' }

  const pageUrl = `https://www.openagentskill.com/skills/${skill.slug}/audit`
  return {
    title: `${skill.name} Audit Report | OpenAgentSkill`,
    description: `Audit report for ${skill.name}: quality, trust, maintenance, install readiness, and adoption risk.`,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${skill.name} Audit Report - OpenAgentSkill`,
      description: `Review ${skill.name} before installing it in an AI agent workflow.`,
      url: pageUrl,
      type: 'article',
    },
  }
}

function riskTone(risk: ComputedSkillAudit['risk_level']) {
  if (risk === 'safe_to_try') return 'border-foreground text-foreground'
  if (risk === 'needs_review') return 'border-amber-300 text-amber-700'
  return 'border-red-300 text-red-700'
}

function checkTone(status: SkillAuditCheck['status']) {
  if (status === 'pass') return 'border-foreground text-foreground'
  if (status === 'fail') return 'border-red-300 text-red-700'
  if (status === 'warn') return 'border-amber-300 text-amber-700'
  return 'border-border text-secondary'
}

function statusLabel(status: SkillAuditCheck['status']) {
  if (status === 'pass') return 'PASS'
  if (status === 'fail') return 'FIX'
  if (status === 'warn') return 'CHECK'
  return 'INFO'
}

function trustStatusTone(status: TrustCheckStatus) {
  if (status === 'pass') return 'border-foreground text-foreground'
  if (status === 'fail') return 'border-red-300 text-red-700'
  if (status === 'warn') return 'border-amber-300 text-amber-700'
  return 'border-border text-secondary'
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

export default async function SkillAuditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const skill = await getSkillBySlugOrFallback(slug)
  if (!skill) notFound()

  const [storedAudit, eventStats, relatedSkills] = isCuratedSkillFallback(skill)
    ? [null, null, []]
    : await Promise.all([
        withTimeout(getSkillAuditBySlug(skill.slug), SKILL_AUDIT_SUPPORT_TIMEOUT_MS, 'stored audit query').catch(() => null),
        withTimeout(getSkillEventStats(skill.slug), SKILL_AUDIT_SUPPORT_TIMEOUT_MS, 'audit event stats query').catch(() => null),
        withTimeout(getRelatedSkills(skill.id, skill.category, 3), SKILL_AUDIT_SUPPORT_TIMEOUT_MS, 'audit related skills query').catch(() => []),
      ])
  const audit = storedAudit ? normalizeAuditRecord(storedAudit) : buildSkillAudit(skill, eventStats)
  const trust = getSkillTrustProfile(skill, false, eventStats)
  const safety = getAgentSafetyProfile(skill, audit, { max_risk: 'medium', needs_install_command: true })
  const installCommand = skill.install_command || `npx skills add ${skill.github_repo || skill.slug}`
  const agentReadableMetadata = buildAgentReadableSkillMetadata(skill, {
    eventStats,
    alternatives: relatedSkills,
    task: `Audit ${skill.name} before installing it into an agent workflow`,
  })
  const passCount = audit.checks.filter((check) => check.status === 'pass').length
  const reviewCount = audit.checks.filter((check) => check.status === 'warn' || check.status === 'fail').length + audit.warnings.length
  const generatedAt = formatDate(audit.generated_at)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'SoftwareApplication',
      name: skill.name,
      applicationCategory: skill.category,
      url: `https://www.openagentskill.com/skills/${skill.slug}`,
      codeRepository: skill.repository || skill.github_repo,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: audit.audit_score,
      bestRating: 100,
      worstRating: 0,
    },
    author: {
      '@type': 'Organization',
      name: 'OpenAgentSkill',
    },
    datePublished: audit.generated_at,
  }

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script
        id="openagentskill-agent-metadata"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agentReadableMetadata) }}
      />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-secondary sm:text-sm">
          <Link href="/skills" className="hover:text-foreground">Skills</Link>
          <span>/</span>
          <Link href={`/skills/${skill.slug}`} className="hover:text-foreground">{skill.name}</Link>
          <span>/</span>
          <span className="text-foreground">Audit</span>
        </nav>

        <section className="border-b border-border pb-10">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="mb-4 text-xs uppercase text-secondary">Skill audit report</p>
              <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
                {skill.name} audit report.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{skill.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className={`border px-3 py-1 font-mono text-xs ${safetyTierTone(safety.safety_tier.tier)}`}>
                  {safety.safety_tier.badge} · {safety.safety_tier.auto_install_policy.toUpperCase()}
                </span>
                <span className={`border px-3 py-1 font-mono text-xs ${riskTone(audit.risk_level)}`}>
                  {auditRiskLabel(audit.risk_level)}
                </span>
                <span className="border border-border px-3 py-1 font-mono text-xs text-secondary">
                  Generated {generatedAt}
                </span>
                <span className="border border-border px-3 py-1 font-mono text-xs text-secondary">
                  Heuristic metadata audit
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px border border-border bg-border text-center sm:grid-cols-3">
              {[
                { label: 'Audit', value: audit.audit_score },
                { label: 'Trust', value: audit.trust_score },
                { label: 'Quality', value: audit.quality_score },
                { label: 'Security', value: audit.security_score },
                { label: 'Maintain', value: audit.maintenance_score },
                { label: 'Install', value: audit.install_score },
              ].map((item) => (
                <div key={item.label} className="bg-background p-4">
                  <div className="font-mono text-3xl font-semibold">{item.value}</div>
                  <div className="mt-1 text-xs uppercase text-secondary">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <div className="mb-10 overflow-hidden border border-border bg-card">
              <div className="border-b border-border p-5">
                <p className="mb-2 text-xs uppercase tracking-widest text-secondary">OpenAgentSkill Trust Score</p>
                <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-end">
                  <div>
                    <div className="font-mono text-6xl font-semibold leading-none">{trust.score}</div>
                    <div className="mt-2 text-sm font-semibold">{trust.label}</div>
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-semibold">
                      Stars, maintenance, license, docs, install safety, permission surface, and installability.
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-secondary">
                      The Trust Score is OpenAgentSkill&apos;s adoption layer. It is designed to help an agent decide
                      whether a skill is safe enough to shortlist before installation.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
                {trust.dimensions.map((dimension) => (
                  <div key={dimension.id} className="min-w-0 bg-background p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">
                        {dimension.label}
                      </p>
                      <span className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] ${trustStatusTone(dimension.status)}`}>
                        {dimension.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="font-mono text-2xl font-semibold">{dimension.score}</p>
                    <div className="mt-3 h-1 bg-muted">
                      <div className="h-full bg-foreground" style={{ width: `${dimension.score}%` }} />
                    </div>
                    <p className="mt-3 line-clamp-3 break-words text-xs leading-relaxed text-secondary [overflow-wrap:anywhere]">
                      {dimension.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-xs uppercase text-secondary">Checks</p>
                <h2 className="font-display text-2xl font-semibold">Install and adoption review</h2>
              </div>
              <div className="font-mono text-sm text-secondary">
                {passCount} passed · {reviewCount} review
              </div>
            </div>

            <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
              {audit.checks.map((check) => (
                <div key={check.label} className="min-w-0 bg-background p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase text-secondary">{check.label}</p>
                      <p className="mt-2 font-mono text-2xl font-semibold">{check.score}</p>
                    </div>
                    <span className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] ${checkTone(check.status)}`}>
                      {statusLabel(check.status)}
                    </span>
                  </div>
                  <p className="break-words text-sm leading-relaxed text-secondary [overflow-wrap:anywhere]">
                    {check.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="border border-border p-5">
                <p className="mb-3 text-xs uppercase text-secondary">Warnings</p>
                {audit.warnings.length > 0 ? (
                  <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                    {audit.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed text-secondary">
                    No major warnings detected from available metadata.
                  </p>
                )}
              </div>
              <div className="border border-border p-5">
                <p className="mb-3 text-xs uppercase text-secondary">Method</p>
                <p className="text-sm leading-relaxed text-secondary">
                  This report combines public metadata, AI review output, repository freshness, install readiness,
                  OpenAgentSkill events, quality scoring, trust checks, and the agent safety gate. It is not a full
                  source-code security review.
                </p>
              </div>
            </div>
          </div>

          <aside className="min-w-0 space-y-5">
            <div className="border border-border p-5">
              <h2 className="font-display text-lg font-semibold">Install path</h2>
              <p className="mb-4 mt-1 text-xs text-secondary">Review the report before installing into production agents.</p>
              <InstallCommand command={installCommand} skillSlug={skill.slug} compact />
            </div>

            <div className="border border-border p-5">
              <p className="mb-2 text-xs uppercase text-secondary">Agent-readable metadata</p>
              <h2 className="font-display text-lg font-semibold">Machine decision packet</h2>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                Embedded JSON exposes suited tasks, suited agents, install command, trust score, safety gate,
                alternatives, and do-not-use conditions for agent review.
              </p>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-secondary">Install policy</dt>
                  <dd className="font-mono text-right">{agentReadableMetadata.safety_gate.auto_install_policy}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-secondary">Best agents</dt>
                  <dd className="font-mono text-right">{agentReadableMetadata.suited_agents.slice(0, 2).join(' + ')}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-secondary">Alternatives</dt>
                  <dd className="font-mono">{agentReadableMetadata.alternative_skills.length}</dd>
                </div>
              </dl>
              <Link
                href={`/api/agent/skills/${skill.slug}`}
                prefetch={false}
                className="mt-4 block border border-border px-4 py-2.5 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Open agent JSON
              </Link>
            </div>

            <div className="border border-border p-5">
              <h2 className="font-display text-lg font-semibold">Signals</h2>
              <dl className="mt-4 space-y-3 text-xs">
                {audit.signals.map((signal) => (
                  <div key={signal.label} className="flex items-center justify-between gap-4">
                    <dt className="text-secondary">{signal.label}</dt>
                    <dd className="font-mono text-right">{signal.value}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-secondary">GitHub stars</dt>
                  <dd className="font-mono">{formatCompactNumber(skill.github_stars || 0)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-secondary">Last push</dt>
                  <dd className="font-mono text-right">{formatDate(skill.github_last_pushed_at || skill.updated_at)}</dd>
                </div>
              </dl>
            </div>

            <div className="border border-border p-5">
              <p className="mb-2 text-xs uppercase text-secondary">Agent safety v2</p>
              <h2 className="font-display text-lg font-semibold">{safety.score}/100 · {safety.label}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`border px-2 py-1 font-mono text-[10px] ${safetyTierTone(safety.safety_tier.tier)}`}>
                  {safety.safety_tier.label}
                </span>
                <span className="border border-border px-2 py-1 font-mono text-[10px] uppercase text-secondary">
                  {safety.safety_tier.auto_install_policy}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                {safety.safety_tier.summary}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-secondary">
                {safety.safety_tier.recommended_action}
              </p>
              {safety.safety_tier.reasons.length > 0 && (
                <ul className="mt-4 space-y-1 border-t border-border pt-4 text-xs leading-relaxed text-secondary">
                  {safety.safety_tier.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              )}
              <div className="mt-4 space-y-3">
                {safety.permission_hints.slice(0, 4).map((hint) => (
                  <div key={hint.id} className="border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{hint.label}</p>
                      <span className="font-mono text-[10px] uppercase text-secondary">{hint.severity}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-secondary">{hint.reason}</p>
                  </div>
                ))}
              </div>
              {safety.policy_warnings.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-border pt-4 text-xs leading-relaxed text-secondary">
                  {safety.policy_warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              )}
            </div>

            <div className="grid gap-2 text-sm">
              <Link
                href={`/skills/${skill.slug}`}
                className="border border-foreground bg-foreground px-4 py-2.5 text-center font-semibold text-background transition-opacity hover:opacity-80"
              >
                Back to skill
              </Link>
              <Link
                href={`/alternatives/${skill.slug}`}
                className="border border-border px-4 py-2.5 text-center text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Alternatives
              </Link>
              <Link
                href={`/api/badge/${skill.slug}?metric=audit&label=Audit`}
                className="border border-border px-4 py-2.5 text-center text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Audit badge SVG
              </Link>
            </div>
          </aside>
        </section>

        {relatedSkills.length > 0 && (
          <section className="py-10">
            <div className="mb-6">
              <p className="mb-2 text-xs uppercase text-secondary">Compare nearby options</p>
              <h2 className="font-display text-2xl font-semibold">Related skills to audit next</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {relatedSkills.map((related) => (
                <Link
                  key={related.slug}
                  href={`/skills/${related.slug}/audit`}
                  className="border border-border p-5 transition-colors hover:border-foreground"
                >
                  <h3 className="font-display text-lg font-semibold">{related.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-secondary">{related.description}</p>
                  <p className="mt-4 font-mono text-xs text-secondary">
                    {formatCompactNumber(related.github_stars || 0)} stars · Audit report
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
