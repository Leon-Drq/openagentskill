import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { InstallCommand } from '@/components/install-command'
import { SkillDetailLink as Link } from '@/components/skill-detail-link'
import { SkillDetailDate, SkillDetailText, SkillDetailValue } from '@/components/skill-detail-text'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { I18nProvider } from '@/lib/i18n/context'
import { getLocaleFromSearchParam } from '@/lib/i18n/config'
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
    robots: {
      index: false,
      follow: true,
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

export default async function SkillAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string | string[] }>
}) {
  const { slug } = await params
  const { lang } = await searchParams
  const initialLocale = getLocaleFromSearchParam(lang) || undefined
  const skill = await getSkillBySlugOrFallback(slug)
  if (!skill) notFound()

  if (slug !== skill.slug) {
    permanentRedirect(`/skills/${skill.slug}/audit`)
  }

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
  const generatedAt = audit.generated_at

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
    <I18nProvider initialLocale={initialLocale}>
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
          <Link href="/skills" className="hover:text-foreground"><SkillDetailText id="skills" /></Link>
          <span>/</span>
          <Link href={`/skills/${skill.slug}`} className="hover:text-foreground">{skill.name}</Link>
          <span>/</span>
          <span className="text-foreground"><SkillDetailText id="audit" /></span>
        </nav>

        <section className="border-b border-border pb-10">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="mb-4 text-xs uppercase text-secondary"><SkillDetailText id="skillAuditReport" /></p>
              <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
                {skill.name} <SkillDetailText id="auditReport" />.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{skill.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className={`border px-3 py-1 font-mono text-xs ${safetyTierTone(safety.safety_tier.tier)}`}>
                  <SkillDetailValue value={safety.safety_tier.badge} /> · <SkillDetailValue value={safety.safety_tier.auto_install_policy.toUpperCase()} />
                </span>
                <span className={`border px-3 py-1 font-mono text-xs ${riskTone(audit.risk_level)}`}>
                  <SkillDetailValue value={auditRiskLabel(audit.risk_level)} />
                </span>
                <span className="border border-border px-3 py-1 font-mono text-xs text-secondary">
                  <SkillDetailText id="generated" /> <SkillDetailDate value={generatedAt} />
                </span>
                <span className="border border-border px-3 py-1 font-mono text-xs text-secondary">
                  <SkillDetailText id="auditGenerated" />
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px border border-border bg-border text-center sm:grid-cols-3">
              {[
                { label: 'audit', value: audit.audit_score },
                { label: 'trust', value: audit.trust_score },
                { label: 'quality', value: audit.quality_score },
                { label: 'security', value: audit.security_score },
                { label: 'maintain', value: audit.maintenance_score },
                { label: 'install', value: audit.install_score },
              ].map((item) => (
                <div key={item.label} className="bg-background p-4">
                  <div className="font-mono text-3xl font-semibold">{item.value}</div>
                  <div className="mt-1 text-xs uppercase text-secondary">
                    <SkillDetailText id={item.label as 'audit' | 'trust' | 'quality' | 'security' | 'maintain' | 'install'} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <div className="mb-10 overflow-hidden border border-border bg-card">
              <div className="border-b border-border p-5">
                <p className="mb-2 text-xs uppercase tracking-widest text-secondary"><SkillDetailText id="trustScore" /></p>
                <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-end">
                  <div>
                    <div className="font-mono text-6xl font-semibold leading-none">{trust.score}</div>
                    <div className="mt-2 text-sm font-semibold"><SkillDetailValue value={trust.label} /></div>
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-semibold">
                      <SkillDetailText id="trustScore" />
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-secondary">
                      <SkillDetailText id="trustScoreDescription" />
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
                {trust.dimensions.map((dimension) => (
                  <div key={dimension.id} className="min-w-0 bg-background p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">
                        <SkillDetailValue value={dimension.label} />
                      </p>
                      <span className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] ${trustStatusTone(dimension.status)}`}>
                        <SkillDetailValue value={dimension.status.toUpperCase()} />
                      </span>
                    </div>
                    <p className="font-mono text-2xl font-semibold">{dimension.score}</p>
                    <div className="mt-3 h-1 bg-muted">
                      <div className="h-full bg-foreground" style={{ width: `${dimension.score}%` }} />
                    </div>
                    <p className="mt-3 line-clamp-3 break-words text-xs leading-relaxed text-secondary [overflow-wrap:anywhere]">
                      <SkillDetailValue value={dimension.detail} />
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-xs uppercase text-secondary"><SkillDetailText id="checks" /></p>
                <h2 className="font-display text-2xl font-semibold"><SkillDetailText id="installAdoptionReview" /></h2>
              </div>
              <div className="font-mono text-sm text-secondary">
                {passCount} <SkillDetailText id="statusPassed" /> · {reviewCount} <SkillDetailText id="statusReview" />
              </div>
            </div>

            <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
              {audit.checks.map((check) => (
                <div key={check.label} className="min-w-0 bg-background p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase text-secondary"><SkillDetailValue value={check.label} /></p>
                      <p className="mt-2 font-mono text-2xl font-semibold">{check.score}</p>
                    </div>
                    <span className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] ${checkTone(check.status)}`}>
                      <SkillDetailValue value={statusLabel(check.status)} />
                    </span>
                  </div>
                  <p className="break-words text-sm leading-relaxed text-secondary [overflow-wrap:anywhere]">
                    <SkillDetailValue value={check.detail} />
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="border border-border p-5">
                <p className="mb-3 text-xs uppercase text-secondary"><SkillDetailText id="warnings" /></p>
                {audit.warnings.length > 0 ? (
                  <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                    {audit.warnings.map((warning) => <li key={warning}><SkillDetailValue value={warning} /></li>)}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed text-secondary">
                    <SkillDetailText id="noMajorWarnings" />
                  </p>
                )}
              </div>
              <div className="border border-border p-5">
                <p className="mb-3 text-xs uppercase text-secondary"><SkillDetailText id="method" /></p>
                <p className="text-sm leading-relaxed text-secondary">
                  <SkillDetailText id="auditMethodDescription" />
                </p>
              </div>
            </div>
          </div>

          <aside className="min-w-0 space-y-5">
            <div className="border border-border p-5">
              <h2 className="font-display text-lg font-semibold"><SkillDetailText id="installPath" /></h2>
              <p className="mb-4 mt-1 text-xs text-secondary"><SkillDetailText id="reviewBeforeProduction" /></p>
              <InstallCommand command={installCommand} skillSlug={skill.slug} compact />
            </div>

            <div className="border border-border p-5">
              <p className="mb-2 text-xs uppercase text-secondary"><SkillDetailText id="agentReadableMetadata" /></p>
              <h2 className="font-display text-lg font-semibold"><SkillDetailText id="machineDecisionPacket" /></h2>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                <SkillDetailText id="agentMetadataDescription" />
              </p>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-secondary"><SkillDetailText id="installPolicy" /></dt>
                  <dd className="font-mono text-right"><SkillDetailValue value={agentReadableMetadata.safety_gate.auto_install_policy} /></dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-secondary"><SkillDetailText id="bestAgents" /></dt>
                  <dd className="font-mono text-right">{agentReadableMetadata.suited_agents.slice(0, 2).join(' + ')}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-secondary"><SkillDetailText id="alternatives" /></dt>
                  <dd className="font-mono">{agentReadableMetadata.alternative_skills.length}</dd>
                </div>
              </dl>
              <Link
                href={`/api/agent/skills/${skill.slug}`}
                prefetch={false}
                className="mt-4 block border border-border px-4 py-2.5 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                <SkillDetailText id="agentJson" />
              </Link>
            </div>

            <div className="border border-border p-5">
              <h2 className="font-display text-lg font-semibold"><SkillDetailText id="signals" /></h2>
              <dl className="mt-4 space-y-3 text-xs">
                {audit.signals.map((signal) => (
                  <div key={signal.label} className="flex items-center justify-between gap-4">
                    <dt className="text-secondary"><SkillDetailValue value={signal.label} /></dt>
                    <dd className="font-mono text-right"><SkillDetailValue value={signal.value} /></dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-secondary"><SkillDetailText id="githubStars" /></dt>
                  <dd className="font-mono">{formatCompactNumber(skill.github_stars || 0)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-secondary"><SkillDetailText id="lastPush" /></dt>
                  <dd className="font-mono text-right"><SkillDetailDate value={skill.github_last_pushed_at || skill.updated_at} /></dd>
                </div>
              </dl>
            </div>

            <div className="border border-border p-5">
              <p className="mb-2 text-xs uppercase text-secondary"><SkillDetailText id="agentSafetyV2" /></p>
              <h2 className="font-display text-lg font-semibold">{safety.score}/100 · <SkillDetailValue value={safety.label} /></h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`border px-2 py-1 font-mono text-[10px] ${safetyTierTone(safety.safety_tier.tier)}`}>
                  <SkillDetailValue value={safety.safety_tier.label} />
                </span>
                <span className="border border-border px-2 py-1 font-mono text-[10px] uppercase text-secondary">
                  <SkillDetailValue value={safety.safety_tier.auto_install_policy} />
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                <SkillDetailValue value={safety.safety_tier.summary} />
              </p>
              <p className="mt-2 text-xs leading-relaxed text-secondary">
                <SkillDetailValue value={safety.safety_tier.recommended_action} />
              </p>
              {safety.safety_tier.reasons.length > 0 && (
                <ul className="mt-4 space-y-1 border-t border-border pt-4 text-xs leading-relaxed text-secondary">
                  {safety.safety_tier.reasons.map((reason) => <li key={reason}><SkillDetailValue value={reason} /></li>)}
                </ul>
              )}
              <div className="mt-4 space-y-3">
                {safety.permission_hints.slice(0, 4).map((hint) => (
                  <div key={hint.id} className="border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold"><SkillDetailValue value={hint.label} /></p>
                      <span className="font-mono text-[10px] uppercase text-secondary"><SkillDetailValue value={hint.severity} /></span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-secondary"><SkillDetailValue value={hint.reason} /></p>
                  </div>
                ))}
              </div>
              {safety.policy_warnings.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-border pt-4 text-xs leading-relaxed text-secondary">
                  {safety.policy_warnings.map((warning) => <li key={warning}><SkillDetailValue value={warning} /></li>)}
                </ul>
              )}
            </div>

            <div className="grid gap-2 text-sm">
              <Link
                href={`/skills/${skill.slug}`}
                className="border border-foreground bg-foreground px-4 py-2.5 text-center font-semibold text-background transition-opacity hover:opacity-80"
              >
                <SkillDetailText id="backToSkill" />
              </Link>
              <Link
                href={`/alternatives/${skill.slug}`}
                className="border border-border px-4 py-2.5 text-center text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                <SkillDetailText id="alternatives" />
              </Link>
              <Link
                href={`/api/badge/${skill.slug}?metric=audit&label=Audit`}
                className="border border-border px-4 py-2.5 text-center text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                <SkillDetailText id="auditBadge" />
              </Link>
            </div>
          </aside>
        </section>

        {relatedSkills.length > 0 && (
          <section className="py-10">
            <div className="mb-6">
              <p className="mb-2 text-xs uppercase text-secondary"><SkillDetailText id="compareNearby" /></p>
              <h2 className="font-display text-2xl font-semibold"><SkillDetailText id="relatedAuditNext" /></h2>
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
                    {formatCompactNumber(related.github_stars || 0)} <SkillDetailText id="stars" /> · <SkillDetailText id="auditReport" />
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

        <SiteFooter />
      </div>
    </I18nProvider>
  )
}
