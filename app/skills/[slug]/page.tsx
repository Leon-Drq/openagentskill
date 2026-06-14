import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getApprovedClaimBySkillSlug,
  getSkillBySlug,
  convertSkillRecordToManifest,
  getRelatedSkills,
  getSkillEventStats,
} from '@/lib/db/skills'
import { ClaimSkillPanel } from '@/components/claim-skill-panel'
import { SaveSkillButton } from '@/components/save-skill-button'
import { SkillAttributionPanel } from '@/components/skill-attribution-panel'
import { SkillActionLink } from '@/components/skill-action-link'
import { SkillEventTracker } from '@/components/skill-event-tracker'
import { SkillFeedbackPanel } from '@/components/skill-feedback-panel'
import { SkillInstallTargets } from '@/components/skill-install-targets'
import { SkillScorePanel } from '@/components/skill-score-panel'
import { SkillXSharePanel } from '@/components/skill-x-share-panel'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getStacksForSkill } from '@/lib/collections'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import { getSkillDecisionProfile } from '@/lib/decision'
import { getSkillInstallTargets } from '@/lib/install-targets'
import { getSkillQualityProfile, getPlatformHints } from '@/lib/quality'
import { getSkillInstallApiUrl } from '@/lib/registry'
import { getSkillAttribution } from '@/lib/skill-attribution'
import { getSkillTrustProfile, type SkillTrustProfile, type TrustCheckStatus } from '@/lib/trust'
import { getUseCasesForSkill } from '@/lib/use-cases'
import { buildManualXMainText, buildManualXReplyText, buildXIntentUrl } from '@/lib/x/poster'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const dbSkill = await getSkillBySlug(slug)
  const skill = dbSkill ? convertSkillRecordToManifest(dbSkill) : null
  if (!skill) return { title: 'Skill Not Found' }
  
  const starsText = skill.stats.stars >= 1000 ? `${(skill.stats.stars / 1000).toFixed(1)}K` : skill.stats.stars
  const description = `${skill.description} ${starsText} GitHub stars. Install with npx skills add ${skill.slug}.`
  const pageUrl = `https://www.openagentskill.com/skills/${slug}`
  const imageAlt = `${skill.name} - OpenAgentSkill`
  const image = {
    url: `${pageUrl}/opengraph-image?v=2`,
    width: 1200,
    height: 630,
    alt: imageAlt,
    type: 'image/png',
  }
  
  return {
    title: `${skill.name} - AI Agent Skill`,
    description,
    keywords: [skill.name, ...skill.tags, 'AI agent skill', 'agent tool', skill.category],
    openGraph: {
      title: `${skill.name} — Open Agent Skill`,
      description,
      type: 'article',
      url: pageUrl,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${skill.name} — AI Agent Skill`,
      description,
      images: [
        {
          url: `${pageUrl}/twitter-image?v=2`,
          alt: imageAlt,
        },
      ],
    },
    alternates: {
      canonical: pageUrl,
    },
  }
}

function getStatusLabel(status: TrustCheckStatus) {
  if (status === 'pass') return 'PASS'
  if (status === 'warn') return 'CHECK'
  if (status === 'fail') return 'FIX'
  return 'INFO'
}

function getStatusTone(status: TrustCheckStatus) {
  if (status === 'pass') return 'border-foreground text-foreground'
  if (status === 'fail') return 'border-red-300 text-red-700'
  if (status === 'warn') return 'border-amber-300 text-amber-700'
  return 'border-border text-secondary'
}

function getAuditTone(level: string) {
  if (level === 'safe_to_try') return 'border-foreground text-foreground'
  if (level === 'needs_review') return 'border-amber-300 text-amber-700'
  return 'border-red-300 text-red-700'
}

function TrustBadge({ profile }: { profile: SkillTrustProfile }) {
  const label = profile.tier === 'production'
    ? 'TRUSTED'
    : profile.tier === 'strong'
      ? 'STRONG'
      : 'REVIEW'

  return (
    <span className={`inline-flex items-center gap-1.5 border px-3 py-1 text-xs font-mono ${profile.tier === 'production' ? 'border-foreground text-foreground' : 'border-border text-secondary'}`}>
      {label} · {profile.score}
    </span>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function SkillDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const dbSkill = await getSkillBySlug(slug)
  const skill = dbSkill ? convertSkillRecordToManifest(dbSkill) : null
  if (!skill) notFound()

  const [relatedSkills, eventStats, approvedClaim] = await Promise.all([
    getRelatedSkills(skill.id, skill.category, 4).catch(() => []),
    getSkillEventStats(skill.slug).catch(() => null),
    getApprovedClaimBySkillSlug(skill.slug).catch(() => null),
  ])
  const aiScore = dbSkill?.ai_review_score?.score as number | undefined
  const matchedUseCases = dbSkill ? getUseCasesForSkill(dbSkill, 3) : []
  const matchedStacks = dbSkill ? getStacksForSkill(dbSkill, 3) : []
  const qualityProfile = dbSkill ? getSkillQualityProfile(dbSkill) : null
  const platformHints = dbSkill ? getPlatformHints(dbSkill) : []
  const decisionProfile = dbSkill ? getSkillDecisionProfile(dbSkill, eventStats) : null
  const trustProfile = dbSkill ? getSkillTrustProfile(dbSkill, Boolean(approvedClaim), eventStats) : null
  const attribution = dbSkill ? getSkillAttribution(dbSkill, approvedClaim) : null
  const auditProfile = dbSkill ? buildSkillAudit(dbSkill, eventStats) : null
  const safetyProfile = dbSkill && auditProfile
    ? getAgentSafetyProfile(dbSkill, auditProfile, { max_risk: 'medium', needs_install_command: true })
    : null
  const installTargets = dbSkill ? getSkillInstallTargets(dbSkill) : []
  const compareHref = `/compare?skills=${encodeURIComponent([skill.slug, ...relatedSkills.slice(0, 3).map((rs) => rs.slug)].join(','))}`
  const installApiHref = `/api/skills/${skill.slug}/install`
  const installTextHref = `${installApiHref}?format=text`
  const searchApiHref = `/api/skills/search?q=${encodeURIComponent(skill.name)}&limit=3`
  const resolveApiHref = `/api/agent/resolve?task=${encodeURIComponent(`Use ${skill.name} for an agent workflow`)}&agent=codex&max_risk=medium`
  const resolveTextHref = `${resolveApiHref}&format=text`
  const registryManifestHref = `/api/registry/manifest/${skill.slug}`
  const registryManifestTextHref = `${registryManifestHref}?format=text`
  const registryInstallHref = `/api/registry/install/${skill.slug}`
  const registryRecommendHref = `/api/registry/recommend?task=${encodeURIComponent(`Use ${skill.name} in an agent workflow`)}&limit=3`
  const absoluteInstallApiUrl = getSkillInstallApiUrl(skill.slug)
  const xMainText = dbSkill ? buildManualXMainText(dbSkill) : ''
  const xReplyText = dbSkill ? buildManualXReplyText(dbSkill) : ''
  const agentResolvePrompt = [
    `Task: Use ${skill.name} in this workspace.`,
    `Resolve first: https://www.openagentskill.com${resolveApiHref}`,
    `Review install handoff: ${absoluteInstallApiUrl}`,
    `Install command: ${skill.technical.installCommand}`,
    'Before running it, summarize audit warnings, required permissions, and the fallback skill if install is risky.',
  ].join('\n')
  const relatedDecisionRows = relatedSkills.map((relatedSkill) => ({
    skill: relatedSkill,
    quality: getSkillQualityProfile(relatedSkill),
    decision: getSkillDecisionProfile(relatedSkill),
  }))

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: skill.name,
    description: skill.description,
    applicationCategory: skill.category,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    aggregateRating: skill.stats.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: skill.stats.rating,
      reviewCount: skill.stats.reviewCount,
    } : undefined,
    operatingSystem: skill.compatibility.map((c) => c.platform),
    softwareVersion: skill.technical.version,
    datePublished: skill.createdAt,
    dateModified: skill.updatedAt,
    author: {
      '@type': skill.author.verified ? 'Organization' : 'Person',
      name: skill.author.name,
      url: attribution?.creatorUrl || undefined,
    },
    sameAs: [attribution?.sourceUrl, attribution?.creatorUrl].filter(Boolean),
    downloadUrl: skill.technical.repository,
    codeRepository: skill.technical.repository,
    potentialAction: {
      '@type': 'InstallAction',
      target: `https://www.openagentskill.com${installApiHref}`,
      object: {
        '@type': 'SoftwareApplication',
        name: skill.name,
      },
    },
  }

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SkillEventTracker skillSlug={skill.slug} />

      <SiteHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 text-xs sm:text-sm text-secondary flex items-center gap-2">
          <Link href="/skills" className="hover:text-foreground">Skills</Link>
          <span>/</span>
          {skill.category && (
            <>
              <Link href={`/skills?category=${skill.category}`} className="hover:text-foreground capitalize">
                {skill.category}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground">{skill.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-3">
          {/* Main content */}
          <div className="min-w-0 lg:col-span-2">
            {/* Title block */}
            <div className="mb-8">
              <div className="flex items-start gap-3 flex-wrap mb-3">
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  {skill.name}
                </h1>
                {trustProfile && (
                  <div className="pt-2">
                    <TrustBadge profile={trustProfile} />
                  </div>
                )}
                {attribution && (
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 border border-border px-3 py-1 font-mono text-xs uppercase text-secondary">
                      {attribution.statusLabel}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-lg italic text-secondary leading-relaxed mb-4">
                {skill.tagline}
              </p>
              {/* Key stats row */}
              <div className="grid gap-3 border-y border-border py-4 text-sm font-mono sm:grid-cols-2">
                <div>
                  <span className="text-secondary">Downloads </span>
                  <span className="font-semibold">{formatNumber(skill.stats.downloads)}</span>
                </div>
                <div>
                  <span className="text-secondary">Stars </span>
                  <span className="font-semibold">{formatNumber(skill.stats.stars)}</span>
                </div>
                {skill.stats.usedBy > 0 && (
                  <div>
                    <span className="text-secondary">Used by </span>
                    <span className="font-semibold">{formatNumber(skill.stats.usedBy)} agents</span>
                  </div>
                )}
                {skill.stats.rating > 0 && (
                  <div>
                    <span className="text-secondary">Rating </span>
                    <span className="font-semibold">{skill.stats.rating.toFixed(1)}/5</span>
                    {skill.stats.reviewCount > 0 && (
                      <span className="text-secondary ml-1">({skill.stats.reviewCount})</span>
                    )}
                  </div>
                )}
                <div>
                  <span className="text-secondary">Version </span>
                  <span className="font-semibold">{skill.technical.version}</span>
                </div>
                {qualityProfile && (
                  <div>
                    <span className="text-secondary">Quality </span>
                    <span className="font-semibold">{qualityProfile.score}/100 · {qualityProfile.label}</span>
                  </div>
                )}
                {trustProfile && (
                  <div>
                    <span className="text-secondary">Trust </span>
                    <span className="font-semibold">{trustProfile.score}/100 · {trustProfile.label}</span>
                  </div>
                )}
                {auditProfile && (
                  <div>
                    <span className="text-secondary">Audit </span>
                    <span className="font-semibold">{auditProfile.audit_score}/100 · {auditRiskLabel(auditProfile.risk_level)}</span>
                  </div>
                )}
              </div>
            </div>

            <SkillScorePanel quality={qualityProfile} trust={trustProfile} audit={auditProfile} />

            {safetyProfile && (
              <section className="mb-10 border border-border bg-card p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="mb-2 text-xs uppercase text-secondary">Agent safety v2</p>
                    <h2 className="font-display text-2xl font-semibold">
                      {safetyProfile.score}/100 · {safetyProfile.label}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                      Safety v2 estimates whether an agent should auto-install this skill by combining audit risk,
                      install readiness, inferred permission surface, and policy constraints.
                    </p>
                  </div>
                  <Link
                    href={`/api/agent/resolve?task=${encodeURIComponent(`Use ${skill.name}`)}&agent=codex&max_risk=medium`}
                    prefetch={false}
                    className="w-full border border-border px-4 py-2.5 text-center text-sm font-semibold transition-colors hover:border-foreground sm:w-auto"
                  >
                    Resolve via API
                  </Link>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {safetyProfile.permission_hints.slice(0, 4).map((hint) => (
                    <div key={hint.id} className="border border-border bg-background p-4">
                      <p className="font-mono text-xs uppercase text-secondary">{hint.severity}</p>
                      <h3 className="mt-2 font-semibold">{hint.label}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-secondary">{hint.reason}</p>
                    </div>
                  ))}
                </div>
                {safetyProfile.policy_warnings.length > 0 && (
                  <ul className="mt-5 space-y-2 border-t border-border pt-4 text-sm leading-relaxed text-secondary">
                    {safetyProfile.policy_warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <SkillInstallTargets skillSlug={skill.slug} targets={installTargets} />

            <section className="mb-10 overflow-hidden border border-border bg-card">
              <div className="border-b border-border p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="mb-2 text-xs uppercase text-secondary">Agent resolve plan</p>
                    <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                      Let an agent verify fit before installing.
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                      The Resolve API returns the selected skill, alternatives, safety policy, audit notes, install
                      target, and copy-paste prompt an agent can follow without scraping this page.
                    </p>
                  </div>
                  <Link
                    href={resolveTextHref}
                    prefetch={false}
                    className="w-full border border-foreground bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background transition-opacity hover:opacity-80 sm:w-auto"
                  >
                    Open text plan
                  </Link>
                </div>
              </div>

              <div className="grid gap-px bg-border lg:grid-cols-3">
                {[
                  {
                    label: 'Resolve JSON',
                    value: resolveApiHref,
                    href: resolveApiHref,
                  },
                  {
                    label: 'Resolve text',
                    value: resolveTextHref,
                    href: resolveTextHref,
                  },
                  {
                    label: 'Install handoff',
                    value: installApiHref,
                    href: installApiHref,
                  },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    prefetch={false}
                    className="min-w-0 bg-background p-4 transition-colors hover:bg-muted/40"
                  >
                    <p className="text-xs uppercase text-secondary">{item.label}</p>
                    <p className="mt-2 break-all font-mono text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">
                      {item.value}
                    </p>
                  </Link>
                ))}
              </div>

              <div className="grid gap-px bg-border md:grid-cols-[0.9fr_1.1fr]">
                <div className="bg-card p-5">
                  <p className="mb-3 text-xs uppercase text-secondary">Agent should check</p>
                  <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                    <li>Task fit and alternatives from Resolve API.</li>
                    <li>Audit score, trust score, and safety policy warnings.</li>
                    <li>Install target compatibility for Codex, Claude Code, Cursor, or CLI.</li>
                  </ul>
                </div>
                <div className="min-w-0 bg-card p-5">
                  <p className="mb-3 text-xs uppercase text-secondary">Copy prompt</p>
                  <pre className="overflow-x-auto border border-border bg-background p-4 font-mono text-xs leading-relaxed text-secondary">
                    <code>{agentResolvePrompt}</code>
                  </pre>
                </div>
              </div>
            </section>

            <section className="mb-10 overflow-hidden border border-border bg-card">
              <div className="border-b border-border p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="mb-2 text-xs uppercase text-secondary">Agent handoff</p>
                    <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                      Give an agent the install path, not another directory page.
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                      Use the public install endpoint to fetch the command, safety checklist, target prompts, and
                      canonical links for this skill.
                    </p>
                  </div>
                  <Link
                    href={installApiHref}
                    className="w-full border border-foreground bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background transition-opacity hover:opacity-80 sm:w-auto"
                  >
                    Open install API
                  </Link>
                </div>
              </div>

              <div className="grid gap-px bg-border lg:grid-cols-3">
                {[
                  {
                    label: 'Install handoff',
                    value: installApiHref,
                    href: installApiHref,
                  },
                  {
                    label: 'LLM text format',
                    value: installTextHref,
                    href: installTextHref,
                  },
                  {
                    label: 'Find alternatives',
                    value: searchApiHref,
                    href: searchApiHref,
                  },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="min-w-0 bg-background p-4 transition-colors hover:bg-muted/40"
                  >
                    <p className="text-xs uppercase text-secondary">{item.label}</p>
                    <p className="mt-2 break-all font-mono text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">
                      {item.value}
                    </p>
                  </Link>
                ))}
              </div>

              <div className="border-t border-border p-5">
                <p className="mb-3 text-xs uppercase text-secondary">Agent prompt</p>
                <pre className="overflow-x-auto border border-border bg-background p-4 font-mono text-xs leading-relaxed text-secondary">
                  <code>{`Use ${skill.name} for this task. Review ${absoluteInstallApiUrl}, then install with: ${skill.technical.installCommand}`}</code>
                </pre>
              </div>
            </section>

            <section className="mb-10 overflow-hidden border border-border bg-card">
              <div className="border-b border-border p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="mb-2 text-xs uppercase text-secondary">Registry metadata</p>
                    <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                      Agent-readable profile for automatic skill selection.
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                      This page exposes the same decision, trust, audit, use-case, and install signals through the
                      Registry API, so agents can rank this skill without scraping the UI.
                    </p>
                  </div>
                  <Link
                    href={registryManifestHref}
                    className="w-full border border-foreground bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background transition-opacity hover:opacity-80 sm:w-auto"
                  >
                    Open manifest
                  </Link>
                </div>
              </div>

              <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Manifest', value: registryManifestHref, href: registryManifestHref },
                  { label: 'LLM text', value: registryManifestTextHref, href: registryManifestTextHref },
                  { label: 'Install alias', value: registryInstallHref, href: registryInstallHref },
                  { label: 'Recommend', value: registryRecommendHref, href: registryRecommendHref },
                ].map((item) => (
                  <Link key={item.label} href={item.href} className="min-w-0 bg-background p-4 transition-colors hover:bg-muted/40">
                    <p className="text-xs uppercase text-secondary">{item.label}</p>
                    <p className="mt-2 break-all font-mono text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">
                      {item.value}
                    </p>
                  </Link>
                ))}
              </div>

              <div className="grid gap-px bg-border md:grid-cols-3">
                <div className="bg-card p-5">
                  <p className="mb-3 text-xs uppercase text-secondary">Agent fit</p>
                  <div className="font-mono text-2xl font-semibold">
                    {decisionProfile?.readinessScore ?? qualityProfile?.score ?? 0}/100
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-secondary">
                    {decisionProfile?.primaryFit || 'General reusable skill candidate'}
                  </p>
                </div>
                <div className="bg-card p-5">
                  <p className="mb-3 text-xs uppercase text-secondary">Use-case tags</p>
                  <div className="flex flex-wrap gap-2">
                    {matchedUseCases.length > 0 ? matchedUseCases.map((useCase) => (
                      <Link
                        key={useCase.slug}
                        href={`/use-cases/${useCase.slug}`}
                        className="border border-border px-2 py-1 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
                      >
                        {useCase.shortTitle}
                      </Link>
                    )) : (
                      <span className="text-sm text-secondary">General agent workflow</span>
                    )}
                  </div>
                </div>
                <div className="bg-card p-5">
                  <p className="mb-3 text-xs uppercase text-secondary">Platforms</p>
                  <p className="text-sm leading-relaxed text-secondary">
                    {[...new Set([...(skill.technical.frameworks || []), ...platformHints])].slice(0, 6).join(', ') || 'Codex, Claude Code, Cursor, and custom agents'}
                  </p>
                </div>
              </div>
            </section>

            {auditProfile && (
              <section className="mb-10 border border-border bg-card p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="mb-2 text-xs uppercase text-secondary">Audit report</p>
                    <h2 className="font-display text-2xl font-semibold">
                      {auditRiskLabel(auditProfile.risk_level)} · {auditProfile.audit_score}/100
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                      Review install readiness, maintenance, trust, quality, and metadata warnings before adding this
                      skill to an agent workflow.
                    </p>
                  </div>
                  <Link
                    href={`/skills/${skill.slug}/audit`}
                    className="w-full border border-foreground bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background transition-opacity hover:opacity-80 sm:w-auto"
                  >
                    View audit report
                  </Link>
                </div>
              </section>
            )}

            {decisionProfile && (
              <section className="mb-10 border border-border bg-card">
                <div className="border-b border-border p-5">
                  <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <p className="mb-2 text-xs uppercase text-secondary">Agent decision cockpit</p>
                      <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                        {decisionProfile.decisionHeadline}
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                        {decisionProfile.recommendation}
                      </p>
                    </div>
                    <div className="grid min-w-28 grid-cols-2 border border-border text-center sm:block">
                      <div className="border-r border-border px-4 py-3 sm:border-r-0 sm:border-b">
                        <div className="font-mono text-3xl font-semibold">{decisionProfile.readinessScore}</div>
                        <div className="mt-1 text-xs uppercase text-secondary">Readiness</div>
                      </div>
                      <div className="px-4 py-3">
                        <div className="font-mono text-lg font-semibold">{decisionProfile.adoptionStage}</div>
                        <div className="mt-1 text-xs uppercase text-secondary">Stage</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: 'Role in stack', value: decisionProfile.agentRole },
                      { label: 'Primary fit', value: decisionProfile.primaryFit },
                      { label: 'Trust label', value: decisionProfile.readinessLabel },
                      { label: 'Install path', value: skill.technical.installCommand ? 'Command ready' : 'Repo install' },
                    ].map((item) => (
                      <div key={item.label} className="bg-background p-4">
                        <p className="text-xs uppercase text-secondary">{item.label}</p>
                        <p className="mt-2 font-mono text-sm">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-px bg-border lg:grid-cols-3">
                  <div className="bg-card p-5">
                    <p className="mb-3 text-xs uppercase text-secondary">Use when</p>
                    <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                      {decisionProfile.bestFor.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="bg-card p-5">
                    <p className="mb-3 text-xs uppercase text-secondary">Evidence</p>
                    <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                      {decisionProfile.proofPoints.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="bg-card p-5">
                    <p className="mb-3 text-xs uppercase text-secondary">Review first</p>
                    <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                      {decisionProfile.riskNotes.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="border-t border-border p-5">
                  <p className="mb-3 text-xs uppercase text-secondary">Implementation path</p>
                  <ol className="grid gap-3 text-sm leading-relaxed text-secondary md:grid-cols-3">
                    {decisionProfile.implementationPlan.map((step, index) => (
                      <li key={step} className="border border-border p-4">
                        <span className="mb-2 block font-mono text-foreground">{index + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            )}

            {trustProfile && (
              <section className="mb-10 border border-border bg-card">
                <div className="border-b border-border p-5">
                  <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                      <p className="mb-2 text-xs uppercase text-secondary">Trust profile</p>
                      <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                        {trustProfile.label}
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                        {trustProfile.summary}
                      </p>
                    </div>
                    <div className="shrink-0 border border-border px-5 py-4 text-center sm:min-w-32">
                      <div className="font-mono text-4xl font-semibold">{trustProfile.score}</div>
                      <div className="mt-1 text-xs uppercase text-secondary">Trust score</div>
                    </div>
                  </div>

                  <div className="mb-5 h-1.5 bg-muted">
                    <div className="h-full bg-foreground" style={{ width: `${trustProfile.score}%` }} />
                  </div>

                  <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
                    {trustProfile.checks.slice(0, 4).map((check) => (
                      <div key={check.label} className="min-w-0 bg-background p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-xs uppercase text-secondary">{check.label}</p>
                          <span className={`shrink-0 border px-2 py-0.5 text-[10px] font-mono ${getStatusTone(check.status)}`}>
                            {getStatusLabel(check.status)}
                          </span>
                        </div>
                        <p className="break-words font-mono text-sm text-foreground [overflow-wrap:anywhere]">{check.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-px bg-border md:grid-cols-2">
                  <div className="bg-card p-5">
                    <p className="mb-3 text-xs uppercase text-secondary">Good signals</p>
                    {trustProfile.strengths.length > 0 ? (
                      <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                        {trustProfile.strengths.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : (
                      <p className="text-sm leading-relaxed text-secondary">No standout trust signals yet.</p>
                    )}
                  </div>
                  <div className="bg-card p-5">
                    <p className="mb-3 text-xs uppercase text-secondary">Review before install</p>
                    {trustProfile.warnings.length > 0 ? (
                      <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                        {trustProfile.warnings.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : (
                      <p className="text-sm leading-relaxed text-secondary">
                        No major trust warnings detected from available metadata.
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-border p-5">
                  <p className="mb-3 text-xs uppercase text-secondary">Recommended action</p>
                  <p className="text-sm leading-relaxed text-secondary">{trustProfile.recommendedAction}</p>
                </div>
              </section>
            )}

            {qualityProfile && (
              <section className="mb-10 border border-border p-5">
                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="mb-2 text-xs uppercase text-secondary">Quality profile</p>
                    <h2 className="font-display text-2xl font-semibold">
                      {qualityProfile.label} candidate for agent workflows
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">{qualityProfile.summary}</p>
                  </div>
                  <div className="font-mono text-3xl font-semibold">{qualityProfile.score}</div>
                </div>
                <div className="mb-5 h-1.5 bg-muted">
                  <div className="h-full bg-foreground" style={{ width: `${qualityProfile.score}%` }} />
                </div>
                <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
                  {qualityProfile.signals.map((signal) => (
                    <div key={signal.label} className="bg-background p-4">
                      <div className="text-xs uppercase text-secondary">{signal.label}</div>
                      <div className="mt-2 font-mono text-sm">{signal.value}</div>
                    </div>
                  ))}
                </div>
                {qualityProfile.warnings.length > 0 && (
                  <div className="mt-4 border-l border-border pl-3 text-sm leading-relaxed text-secondary">
                    Check before install: {qualityProfile.warnings.slice(0, 3).join(' · ')}
                  </div>
                )}
              </section>
            )}

            {matchedUseCases.length > 0 && (
              <section className="mb-10">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-2 text-xs uppercase text-secondary">Workflow fit</p>
                    <h2 className="font-display text-2xl font-semibold">Use this skill in these scenarios</h2>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {matchedUseCases.map((useCase) => (
                    <Link
                      key={useCase.slug}
                      href={`/use-cases/${useCase.slug}`}
                      className="border border-border p-4 transition-colors hover:border-foreground"
                    >
                      <p className="text-xs uppercase text-secondary">{useCase.eyebrow}</p>
                      <h3 className="mt-2 font-display text-lg font-semibold">{useCase.shortTitle}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-secondary">{useCase.heroPrompt}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {matchedStacks.length > 0 && (
              <section className="mb-10">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-2 text-xs uppercase text-secondary">Stack fit</p>
                    <h2 className="font-display text-2xl font-semibold">Add it to a complete workflow</h2>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {matchedStacks.map((stack) => (
                    <Link
                      key={stack.slug}
                      href={`/collections/${stack.slug}`}
                      className="border border-border p-4 transition-colors hover:border-foreground"
                    >
                      <p className="text-xs uppercase text-secondary">{stack.eyebrow}</p>
                      <h3 className="mt-2 font-display text-lg font-semibold">{stack.shortTitle}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-secondary">{stack.description}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {relatedDecisionRows.length > 0 && (
              <section className="mb-10 border border-border p-5">
                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="mb-2 text-xs uppercase text-secondary">Alternative shortlist</p>
                    <h2 className="font-display text-2xl font-semibold">Compare before you install</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                      Similar skills in this category, ranked with the same readiness and quality signals.
                    </p>
                  </div>
                  <SkillActionLink
                    href={compareHref}
                    skillSlug={skill.slug}
                    eventType="compare"
                    className="w-full border border-foreground bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background transition-opacity hover:opacity-80 sm:w-auto"
                  >
                    Compare all
                  </SkillActionLink>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {relatedDecisionRows.map((row) => (
                    <Link
                      key={row.skill.slug}
                      href={`/skills/${row.skill.slug}`}
                      className="border border-border p-4 transition-colors hover:border-foreground"
                    >
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="font-display text-lg font-semibold">{row.skill.name}</h3>
                          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-secondary">{row.skill.description}</p>
                        </div>
                        <span className="shrink-0 border border-border px-2 py-1 text-xs font-mono text-secondary">
                          {row.decision.adoptionStage}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-px border border-border bg-border text-xs">
                        <div className="bg-background p-2">
                          <span className="block text-secondary">Ready</span>
                          <span className="font-mono">{row.decision.readinessScore}</span>
                        </div>
                        <div className="bg-background p-2">
                          <span className="block text-secondary">Quality</span>
                          <span className="font-mono">{row.quality.score}</span>
                        </div>
                        <div className="bg-background p-2">
                          <span className="block text-secondary">Stars</span>
                          <span className="font-mono">{formatNumber(row.skill.github_stars || 0)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Description */}
            <section className="mb-10">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-5">Overview</h2>
              <div className="prose-like space-y-4 text-base sm:text-lg leading-relaxed">
                {skill.longDescription.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-foreground">{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Compatibility */}
            {skill.compatibility.length > 0 && (
              <section className="mb-10">
                <h2 className="font-display text-2xl font-semibold mb-5">Platform Compatibility</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {skill.compatibility.map((compat) => (
                    <div key={compat.platform} className="border border-border p-4 flex items-center justify-between">
                      <span className="font-mono font-semibold text-sm">{compat.platform}</span>
                      <span className="text-xs font-mono text-secondary border border-border px-2 py-0.5">
                        {compat.status?.toUpperCase() || 'SUPPORTED'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Technical details */}
            <section className="mb-10">
              <h2 className="font-display text-2xl font-semibold mb-5">Technical Details</h2>
              <dl className="grid gap-y-3 sm:grid-cols-2 sm:gap-x-8">
                {[
                  { label: 'Version', value: skill.technical.version },
                  { label: 'License', value: skill.technical.license },
                  { label: 'Last Updated', value: new Date(skill.technical.lastUpdated).toLocaleDateString() },
                  { label: 'Published', value: new Date(skill.createdAt).toLocaleDateString() },
                ].filter(({ value }) => value).map(({ label, value }) => (
                  <div key={label} className="border-b border-border pb-3">
                    <dt className="text-xs text-secondary mb-1">{label}</dt>
                    <dd className="font-mono text-sm">{value}</dd>
                  </div>
                ))}
              </dl>

              {skill.technical.frameworks.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs text-secondary mb-2">Frameworks & Tools</p>
                  <div className="flex flex-wrap gap-2">
                    {skill.technical.frameworks.map((f) => (
                      <span key={f} className="border border-border px-3 py-1 font-mono text-xs">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* AI Review */}
            {aiScore !== undefined && (
              <section className="mb-10">
                <h2 className="font-display text-2xl font-semibold mb-5">AI Quality Review</h2>
                <div className="border border-border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-secondary">Quality Score</span>
                    <span className="font-mono font-bold text-2xl">{aiScore}/100</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-none overflow-hidden">
                    <div
                      className="h-full bg-foreground transition-all"
                      style={{ width: `${aiScore}%` }}
                    />
                  </div>
                  {dbSkill?.ai_review_suggestions && dbSkill.ai_review_suggestions.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-secondary mb-2">Suggestions</p>
                      <ul className="space-y-1">
                        {dbSkill.ai_review_suggestions.map((s, i) => (
                          <li key={i} className="text-xs text-secondary border-l-2 border-border pl-3">{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="min-w-0 lg:col-span-1">
            <div className="sticky top-24 space-y-5">
              {decisionProfile && (
                <div className="border border-border bg-card p-5">
                  <p className="mb-2 text-xs uppercase text-secondary">Decision snapshot</p>
                  <h3 className="font-display text-lg font-semibold">{decisionProfile.agentRole}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-px border border-border bg-border text-center">
                    <div className="bg-background p-3">
                      <div className="font-mono text-2xl font-semibold">{decisionProfile.readinessScore}</div>
                      <div className="mt-1 text-xs text-secondary">Ready</div>
                    </div>
                    <div className="bg-background p-3">
                      <div className="font-mono text-sm font-semibold">{decisionProfile.adoptionStage}</div>
                      <div className="mt-1 text-xs text-secondary">Stage</div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-secondary">{decisionProfile.proofPoints[0]}</p>
                </div>
              )}

              {auditProfile && (
                <div className="border border-border p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-lg font-semibold">Audit Snapshot</h3>
                      <p className="mt-1 text-xs text-secondary">Install and adoption review</p>
                    </div>
                    <div className="font-mono text-2xl font-semibold">{auditProfile.audit_score}</div>
                  </div>
                  <span className={`inline-flex border px-2 py-0.5 font-mono text-xs ${getAuditTone(auditProfile.risk_level)}`}>
                    {auditRiskLabel(auditProfile.risk_level)}
                  </span>
                  <dl className="mt-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-secondary">Security</dt>
                      <dd className="font-mono">{auditProfile.security_score}/100</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-secondary">Maintenance</dt>
                      <dd className="font-mono">{auditProfile.maintenance_score}/100</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-secondary">Install</dt>
                      <dd className="font-mono">{auditProfile.install_score}/100</dd>
                    </div>
                  </dl>
                  <Link
                    href={`/skills/${skill.slug}/audit`}
                    className="mt-4 block border border-border px-3 py-2 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                  >
                    Open full audit
                  </Link>
                </div>
              )}

              {/* Install card */}
              <div className="border border-border p-5">
                <h3 className="font-display text-lg font-semibold mb-3">Install</h3>
                <p className="text-xs text-secondary mb-4">Free and open source</p>
                <div className="space-y-2">
                  <SaveSkillButton skillSlug={skill.slug} />
                  <SkillActionLink
                    href={compareHref}
                    skillSlug={skill.slug}
                    eventType="compare"
                    className="block w-full border border-border py-2.5 text-center text-sm text-foreground hover:border-foreground transition-colors"
                  >
                    Compare Alternatives
                  </SkillActionLink>
                  <Link
                    href={resolveTextHref}
                    prefetch={false}
                    className="block w-full border border-border py-2.5 text-center text-sm text-foreground transition-colors hover:border-foreground"
                  >
                    Auto-resolve Plan
                  </Link>
                  {skill.technical.repository && (
                    <SkillActionLink
                      href={skill.technical.repository}
                      skillSlug={skill.slug}
                      eventType="outbound_github"
                      external
                      className="block w-full border border-foreground bg-foreground py-2.5 text-center text-sm font-semibold text-background hover:opacity-80 transition-opacity"
                    >
                      View on GitHub
                    </SkillActionLink>
                  )}
                  <SkillActionLink
                    href={skill.technical.documentation}
                    skillSlug={skill.slug}
                    eventType="outbound_docs"
                    external
                    className="block w-full border border-border py-2.5 text-center text-sm text-foreground hover:border-foreground transition-colors"
                  >
                    Documentation
                  </SkillActionLink>
                </div>
              </div>

              {xMainText && (
                <SkillXSharePanel
                  skillName={skill.name}
                  mainText={xMainText}
                  mainIntentUrl={buildXIntentUrl(xMainText)}
                  replyText={xReplyText}
                  replyIntentUrl={xReplyText ? buildXIntentUrl(xReplyText) : undefined}
                />
              )}

              {attribution && <SkillAttributionPanel attribution={attribution} />}

              <ClaimSkillPanel
                skillSlug={skill.slug}
                repository={skill.technical.repository}
                creatorName={attribution?.creatorName}
                sourceLabel={attribution?.statusLabel.toLowerCase()}
                approvedClaim={approvedClaim ? {
                  github_username: approvedClaim.github_username,
                  evidence_url: approvedClaim.evidence_url,
                } : null}
              />

              <div className="border border-border p-5">
                <h3 className="font-display text-lg font-semibold mb-3">README badge</h3>
                <p className="mb-4 text-xs leading-relaxed text-secondary">
                  Add this badge to your GitHub README to show the listing, trust score, and install handoff.
                </p>
                <pre className="overflow-x-auto border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-secondary">
                  <code>{`[![OpenAgentSkill](https://www.openagentskill.com/api/badge/${skill.slug})](https://www.openagentskill.com/skills/${skill.slug})`}</code>
                </pre>
                <div className="mt-3 grid gap-2">
                  <Link
                    href={`/api/badge/${skill.slug}`}
                    className="border border-border px-3 py-2 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                  >
                    Preview badge
                  </Link>
                  <Link
                    href={`/api/badge/${skill.slug}?metric=audit`}
                    className="border border-border px-3 py-2 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                  >
                    Audit badge
                  </Link>
                </div>
              </div>

              {/* Author */}
              <div className="border border-border p-5">
                <h3 className="font-display text-lg font-semibold mb-3">Author</h3>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-border font-mono text-lg shrink-0">
                    {skill.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {skill.author.name}
                      {skill.author.verified && (
                        <span className="ml-1.5 text-xs font-mono text-secondary">✓</span>
                      )}
                    </p>
                    {skill.author.username && (
                      <p className="text-xs text-secondary">@{skill.author.username}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {skill.tags.length > 0 && (
                <div className="border border-border p-5">
                  <h3 className="font-display text-lg font-semibold mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {skill.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/skills?q=${encodeURIComponent(tag)}`}
                        className="border border-border px-2.5 py-1 text-xs text-secondary hover:border-foreground hover:text-foreground transition-colors"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {platformHints.length > 0 && (
                <div className="border border-border p-5">
                  <h3 className="font-display text-lg font-semibold mb-3">Platform Fit</h3>
                  <div className="flex flex-wrap gap-2">
                    {platformHints.map((hint) => (
                      <Link
                        key={hint}
                        href={`/skills?platform=${encodeURIComponent(hint)}`}
                        className="border border-border px-2.5 py-1 text-xs text-secondary hover:border-foreground hover:text-foreground transition-colors"
                      >
                        {hint}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="border border-border p-5">
                <h3 className="font-display text-lg font-semibold mb-3">Health Signals</h3>
                <dl className="space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-secondary">GitHub stars</dt>
                    <dd className="font-mono">{formatNumber(skill.stats.stars)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-secondary">Quality score</dt>
                    <dd className="font-mono">{Math.round(skill.stats.qualityScore || aiScore || 0)}/100</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-secondary">Last GitHub push</dt>
                    <dd className="font-mono text-right">{formatDate(dbSkill?.github_last_pushed_at)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-secondary">Framework hints</dt>
                    <dd className="font-mono">{skill.technical.frameworks.length || 'Unknown'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-secondary">OpenAgentSkill views</dt>
                    <dd className="font-mono">{formatNumber(eventStats?.views || 0)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-secondary">Install copies</dt>
                    <dd className="font-mono">{formatNumber(eventStats?.install_copies || 0)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-secondary">Outbound clicks</dt>
                    <dd className="font-mono">{formatNumber(eventStats?.outbound_clicks || 0)}</dd>
                  </div>
                </dl>
              </div>

              <SkillFeedbackPanel skillSlug={skill.slug} />

              {trustProfile && (
                <div className="border border-border p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-lg font-semibold">Trust & Safety</h3>
                      <p className="mt-1 text-xs text-secondary">{trustProfile.label}</p>
                    </div>
                    <div className="font-mono text-2xl font-semibold">{trustProfile.score}</div>
                  </div>
                  <ul className="space-y-2 text-xs text-secondary">
                    {trustProfile.checks.slice(0, 6).map((check) => (
                      <li key={check.label} className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block text-foreground">{check.label}</span>
                          <span className="block break-words [overflow-wrap:anywhere]">{check.detail}</span>
                        </span>
                        <span className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] ${getStatusTone(check.status)}`}>
                          {getStatusLabel(check.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related skills */}
              {relatedSkills.length > 0 && (
                <div className="border border-border p-5">
                  <h3 className="font-display text-lg font-semibold mb-3">Related Skills</h3>
                  <div className="space-y-3">
                    {relatedSkills.map((rs) => (
                      <Link
                        key={rs.slug}
                        href={`/skills/${rs.slug}`}
                        className="block border-b border-border pb-3 last:border-0 last:pb-0 hover:opacity-70 transition-opacity"
                      >
                        <p className="font-semibold text-sm">{rs.name}</p>
                        <p className="text-xs text-secondary mt-0.5 line-clamp-2">{rs.description}</p>
                        <span className="text-xs font-mono text-secondary mt-1 block">
                          {formatNumber(rs.github_stars)} stars · {formatNumber(rs.downloads)} installs
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
