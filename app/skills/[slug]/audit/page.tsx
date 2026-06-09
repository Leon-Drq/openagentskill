import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InstallCommand } from '@/components/install-command'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import {
  auditRiskLabel,
  buildSkillAudit,
  normalizeAuditRecord,
  type ComputedSkillAudit,
  type SkillAuditCheck,
} from '@/lib/audits'
import { getRelatedSkills, getSkillAuditBySlug, getSkillBySlug, getSkillEventStats } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const skill = await getSkillBySlug(slug)
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
  const skill = await getSkillBySlug(slug)
  if (!skill) notFound()

  const [storedAudit, eventStats, relatedSkills] = await Promise.all([
    getSkillAuditBySlug(skill.slug).catch(() => null),
    getSkillEventStats(skill.slug).catch(() => null),
    getRelatedSkills(skill.id, skill.category, 3).catch(() => []),
  ])
  const audit = storedAudit ? normalizeAuditRecord(storedAudit) : buildSkillAudit(skill, eventStats)
  const installCommand = skill.install_command || `npx skills add ${skill.github_repo || skill.slug}`
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
              <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Skill audit report</p>
              <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
                {skill.name} audit report.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{skill.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
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
                  <div className="mt-1 text-xs uppercase tracking-widest text-secondary">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Checks</p>
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
                      <p className="text-xs uppercase tracking-widest text-secondary">{check.label}</p>
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
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Warnings</p>
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
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Method</p>
                <p className="text-sm leading-relaxed text-secondary">
                  This report combines public metadata, AI review output, repository freshness, install readiness,
                  OpenAgentSkill events, quality scoring, and trust checks. It is not a full source-code security review.
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
              <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Compare nearby options</p>
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
