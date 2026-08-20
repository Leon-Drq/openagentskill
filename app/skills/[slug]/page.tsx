import { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import {
  getApprovedClaimBySkillSlug,
  convertSkillRecordToManifest,
  getAgentOutcomeStats,
  getRelatedSkills,
  getSkillEventStats,
} from '@/lib/db/skills'
import { ClaimSkillPanel } from '@/components/claim-skill-panel'
import { CreatorBadgeKit } from '@/components/creator-badge-kit'
import { SaveSkillButton } from '@/components/save-skill-button'
import { SkillAttributionPanel } from '@/components/skill-attribution-panel'
import { SkillActionLink } from '@/components/skill-action-link'
import { SkillEventTracker } from '@/components/skill-event-tracker'
import { SkillFeedbackPanel } from '@/components/skill-feedback-panel'
import { SkillInstallTargets } from '@/components/skill-install-targets'
import { SkillScorePanel } from '@/components/skill-score-panel'
import { SkillXSharePanel } from '@/components/skill-x-share-panel'
import { SkillDetailLink as Link } from '@/components/skill-detail-link'
import { SkillDetailDate, SkillDetailText, SkillDetailValue } from '@/components/skill-detail-text'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { I18nProvider } from '@/lib/i18n/context'
import { defaultLocale, getLocaleFromSearchParam } from '@/lib/i18n/config'
import { withTimeout } from '@/lib/async'
import { getStacksForSkill } from '@/lib/collections'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import { buildAgentReadableSkillMetadata } from '@/lib/agent-readable'
import { getSkillDecisionProfile } from '@/lib/decision'
import { getSkillInstallTargets } from '@/lib/install-targets'
import { getSkillQualityProfile, getPlatformHints } from '@/lib/quality'
import { getSkillInstallApiUrl } from '@/lib/registry'
import { getSkillAttribution } from '@/lib/skill-attribution'
import { getCanonicalSkillSlug, getSkillBySlugOrFallbackStrict } from '@/lib/skill-fallbacks'
import { getSkillSupplyProfile } from '@/lib/supply'
import {
  getSkillTrustProfileV5,
  type SkillTrustProfileV5,
  type TrustCheckStatus,
} from '@/lib/trust'
import { getUseCasesForSkill } from '@/lib/use-cases'
import { isSearchIndexEligible } from '@/lib/seo/search-indexability'
import { buildSkillSearchMetadata } from '@/lib/seo/search-metadata'
import {
  buildManualXMainText,
  buildManualXReplyText,
  buildXIntentUrl,
} from '@/lib/x/poster'

export const dynamic = 'force-dynamic'
export const revalidate = 0
const SKILL_DETAIL_SUPPORT_TIMEOUT_MS = 1200

const getCachedSkillBySlug = cache(async (slug: string) =>
  getSkillBySlugOrFallbackStrict(getCanonicalSkillSlug(slug))
)

const getCachedSkillDetailSupport = cache(
  async (skillId: string, category: string, slug: string) => {
    if (skillId.startsWith('snapshot-')) {
      return { relatedSkills: [], eventStats: null, outcomeStats: null, approvedClaim: null }
    }

    const [relatedSkills, eventStats, outcomeStats, approvedClaim] = await Promise.all([
      withTimeout(
        getRelatedSkills(skillId, category, 4),
        SKILL_DETAIL_SUPPORT_TIMEOUT_MS,
        'skill related query'
      ).catch(() => []),
      withTimeout(
        getSkillEventStats(slug),
        SKILL_DETAIL_SUPPORT_TIMEOUT_MS,
        'skill event stats query'
      ).catch(() => null),
      withTimeout(
        getAgentOutcomeStats(slug),
        SKILL_DETAIL_SUPPORT_TIMEOUT_MS,
        'skill outcome stats query'
      ).catch(() => null),
      withTimeout(
        getApprovedClaimBySkillSlug(slug),
        SKILL_DETAIL_SUPPORT_TIMEOUT_MS,
        'skill claim query'
      ).catch(() => null),
    ])

    return { relatedSkills, eventStats, outcomeStats, approvedClaim }
  }
)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const dbSkill = await getCachedSkillBySlug(slug)
  const skill = dbSkill ? convertSkillRecordToManifest(dbSkill) : null
  if (!dbSkill || !skill) return { title: 'Skill Not Found' }
  const canonicalSlug = skill.slug || getCanonicalSkillSlug(slug)
  const seo = buildSkillSearchMetadata(dbSkill, defaultLocale)
  const indexable = isSearchIndexEligible(dbSkill)
  const pageUrl = `https://www.openagentskill.com/skills/${canonicalSlug}`
  const imageAlt = seo.imageAlt
  const imageVersion = '7'
  const staticSkillImageUrl =
    canonicalSlug === 'addyosmani-agent-skills'
      ? 'https://www.openagentskill.com/og/skills/addyosmani-agent-skills-v7.png'
      : null
  const openGraphImageUrl = staticSkillImageUrl || `${pageUrl}/opengraph-image?v=${imageVersion}`
  const twitterImageUrl = staticSkillImageUrl || `${pageUrl}/twitter-image?v=${imageVersion}`
  const image = {
    url: openGraphImageUrl,
    width: 1200,
    height: 630,
    alt: imageAlt,
    type: 'image/png',
  }

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    other: {
      'content-language': seo.htmlLanguage,
    },
    openGraph: {
      title: `${seo.openGraphTitle} - OpenAgentSkill`,
      description: seo.description,
      type: 'article',
      url: pageUrl,
      locale: seo.openGraphLocale,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${seo.openGraphTitle} - OpenAgentSkill`,
      description: seo.description,
      images: [
        {
          url: twitterImageUrl,
          alt: imageAlt,
        },
      ],
    },
    alternates: {
      canonical: pageUrl,
    },
    robots: {
      index: indexable,
      follow: true,
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
  if (status === 'pass') return 'border-[#c8ded5] bg-[#eef7f2] text-[#006b4f]'
  if (status === 'fail') return 'border-red-200 bg-red-50 text-red-700'
  if (status === 'warn') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-border bg-background text-secondary'
}

function getAuditTone(level: string) {
  if (level === 'safe_to_try')
    return 'border-[#c8ded5] bg-[#eef7f2] text-[#006b4f]'
  if (level === 'needs_review')
    return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-red-200 bg-red-50 text-red-700'
}

function TrustBadge({ profile }: { profile: SkillTrustProfileV5 }) {
  const label =
    profile.tier === 'production'
      ? 'TRUSTED'
      : profile.tier === 'strong'
        ? 'STRONG'
        : 'REVIEW'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[6px] border px-3 py-1 text-xs font-mono ${profile.tier === 'production' ? 'border-[#c8ded5] bg-[#eef7f2] text-[#006b4f]' : 'border-border bg-background text-secondary'}`}
    >
      <SkillDetailValue value={label} /> · {profile.score}
    </span>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function safetyTierTone(tier: string) {
  if (tier === 'verified') return 'border-[#006b4f] text-[#006b4f]'
  if (tier === 'reviewed') return 'border-foreground text-foreground'
  if (tier === 'blocked') return 'border-red-300 text-red-700'
  return 'border-amber-300 text-amber-700'
}

export default async function SkillDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string | string[] }>
}) {
  const { slug } = await params
  const { lang } = await searchParams
  const initialLocale = getLocaleFromSearchParam(lang) || undefined
  const dbSkill = await getCachedSkillBySlug(slug)
  const skill = dbSkill ? convertSkillRecordToManifest(dbSkill) : null
  if (!skill) notFound()

  if (slug !== skill.slug) {
    permanentRedirect(`/skills/${skill.slug}`)
  }

  const { relatedSkills, eventStats, outcomeStats, approvedClaim } =
    await getCachedSkillDetailSupport(skill.id, skill.category, skill.slug)
  const verifiedInstalls = outcomeStats?.verified_installs || 0
  const aiScore = dbSkill?.ai_review_score?.score as number | undefined
  const matchedUseCases = dbSkill ? getUseCasesForSkill(dbSkill, 3) : []
  const matchedStacks = dbSkill ? getStacksForSkill(dbSkill, 3) : []
  const qualityProfile = dbSkill ? getSkillQualityProfile(dbSkill) : null
  const platformHints = dbSkill ? getPlatformHints(dbSkill) : []
  const decisionProfile = dbSkill
    ? getSkillDecisionProfile(dbSkill, eventStats)
    : null
  const trustProfile = dbSkill
    ? getSkillTrustProfileV5(dbSkill, Boolean(approvedClaim), eventStats, outcomeStats)
    : null
  const outcomeEvidence = trustProfile?.outcomeEvidence || null
  const supplyProfile = dbSkill
    ? getSkillSupplyProfile(dbSkill, eventStats)
    : null
  const attribution = dbSkill
    ? getSkillAttribution(dbSkill, approvedClaim)
    : null
  const auditProfile = dbSkill ? buildSkillAudit(dbSkill, eventStats) : null
  const safetyProfile =
    dbSkill && auditProfile
      ? getAgentSafetyProfile(dbSkill, auditProfile, {
          max_risk: 'medium',
          needs_install_command: true,
        })
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
  const installCommand =
    skill.technical.installCommand ||
    `npx skills add ${dbSkill?.github_repo || skill.slug}`
  const agentReadableMetadata = dbSkill
    ? buildAgentReadableSkillMetadata(dbSkill, {
        eventStats,
        outcomeStats,
        approvedClaim: Boolean(approvedClaim),
        alternatives: relatedSkills,
        task: `Use ${skill.name} for an agent workflow`,
      })
    : null
  const agentProvenEvidence = agentReadableMetadata?.agent_proven || null
  const suitableTasks = agentReadableMetadata?.suited_tasks || []
  const suitableAgents = agentReadableMetadata?.suited_agents || []
  const agentAlternatives = agentReadableMetadata?.alternative_skills || []
  const doNotUseWhen =
    agentReadableMetadata?.do_not_use_when || [
      'Do not skip repository, license, permission, and dependency review before production use.',
    ]
  const outcomeFeedback = agentReadableMetadata?.outcome_feedback || null
  const publisherProfiles = [
    dbSkill?.publisher_github ? `https://github.com/${dbSkill.publisher_github}` : null,
    dbSkill?.publisher_x ? `https://x.com/${dbSkill.publisher_x}` : null,
  ].filter((profile): profile is string => Boolean(profile))

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: skill.name,
    description: skill.description,
    applicationCategory: skill.category,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    aggregateRating:
      skill.stats.reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: skill.stats.rating,
            reviewCount: skill.stats.reviewCount,
          }
        : undefined,
    operatingSystem: skill.compatibility.map((c) => c.platform),
    softwareVersion: skill.technical.version,
    datePublished: skill.createdAt,
    dateModified: skill.updatedAt,
    author: {
      '@type': skill.author.verified ? 'Organization' : 'Person',
      name: skill.author.name,
      url: attribution?.creatorUrl || undefined,
      sameAs: publisherProfiles.length > 0 ? publisherProfiles : undefined,
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
    <I18nProvider initialLocale={initialLocale}>
      <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        id="openagentskill-agent-metadata"
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(agentReadableMetadata),
        }}
      />
      <SkillEventTracker skillSlug={skill.slug} />

      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 sm:py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-secondary sm:text-sm">
          <Link href="/skills" className="hover:text-foreground">
            <SkillDetailText id="skills" />
          </Link>
          <span>/</span>
          {skill.category && (
            <>
              <Link
                href={`/skills?category=${skill.category}`}
                className="hover:text-foreground capitalize"
              >
                <SkillDetailValue value={skill.category} />
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
            <div className="relative mb-8 overflow-hidden rounded-[8px] border border-border bg-card p-5 shadow-[0_18px_48px_rgba(22,20,16,0.05)] sm:p-7">
              <div className="brand-grain pointer-events-none absolute inset-0 opacity-35" />
              <div className="relative">
                <div className="mb-4 flex flex-wrap items-start gap-3">
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
                      <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-background px-3 py-1 font-mono text-xs uppercase text-secondary">
                        <SkillDetailValue value={attribution.statusLabel} />
                      </span>
                    </div>
                  )}
                </div>
                <p className="mb-5 max-w-3xl text-lg leading-relaxed text-secondary">
                  {skill.tagline}
                </p>
                {/* Key stats row */}
                <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-[8px] border border-border bg-background/85 p-3">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                      <SkillDetailText id="verifiedInstalls" />
                    </span>
                    <span className="mt-1 block font-mono text-base font-semibold">
                      {formatNumber(verifiedInstalls)}
                    </span>
                  </div>
                  <div className="rounded-[8px] border border-border bg-background/85 p-3">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                      <SkillDetailText id="stars" />
                    </span>
                    <span className="mt-1 block font-mono text-base font-semibold">
                      {formatNumber(skill.stats.stars)}
                    </span>
                  </div>
                  {skill.stats.usedBy > 0 && (
                    <div className="rounded-[8px] border border-border bg-background/85 p-3">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                        <SkillDetailText id="usedBy" />
                      </span>
                      <span className="mt-1 block font-mono text-base font-semibold">
                        {formatNumber(skill.stats.usedBy)} <SkillDetailText id="agents" />
                      </span>
                    </div>
                  )}
                  {skill.stats.rating > 0 && (
                    <div className="rounded-[8px] border border-border bg-background/85 p-3">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                        <SkillDetailText id="rating" />
                      </span>
                      <span className="mt-1 block font-mono text-base font-semibold">
                        {skill.stats.rating.toFixed(1)}/5
                      </span>
                      {skill.stats.reviewCount > 0 && (
                        <span className="text-secondary ml-1">
                          ({skill.stats.reviewCount})
                        </span>
                      )}
                    </div>
                  )}
                  <div className="rounded-[8px] border border-border bg-background/85 p-3">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                      <SkillDetailText id="version" />
                    </span>
                    <span className="mt-1 block font-mono text-base font-semibold">
                      {skill.technical.version}
                    </span>
                  </div>
                  {qualityProfile && (
                    <div className="rounded-[8px] border border-border bg-background/85 p-3">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                        <SkillDetailText id="quality" />
                      </span>
                      <span className="mt-1 block font-mono text-base font-semibold">
                        {qualityProfile.score}/100 · <SkillDetailValue value={qualityProfile.label} />
                      </span>
                    </div>
                  )}
                  {trustProfile && (
                    <div className="rounded-[8px] border border-border bg-background/85 p-3">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                        <SkillDetailText id="trust" />
                      </span>
                      <span className="mt-1 block font-mono text-base font-semibold">
                        {trustProfile.score}/100 · <SkillDetailValue value={trustProfile.label} />
                      </span>
                    </div>
                  )}
                  {auditProfile && (
                    <div className="rounded-[8px] border border-border bg-background/85 p-3">
                      <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                        <SkillDetailText id="audit" />
                      </span>
                      <span className="mt-1 block font-mono text-base font-semibold">
                        {auditProfile.audit_score}/100 ·{' '}
                        <SkillDetailValue value={auditRiskLabel(auditProfile.risk_level)} />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {supplyProfile && (
              <section className="mb-10 overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_18px_48px_rgba(22,20,16,0.05)]">
                <div className="relative border-b border-border bg-[#fbfaf7] p-5 sm:p-6">
                  <div className="brand-grain pointer-events-none absolute inset-0 opacity-40" />
                  <div className="relative">
                    <p className="mb-2 text-xs uppercase text-secondary">
                      <SkillDetailText id="supplyAssetProfile" />
                    </p>
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                          <SkillDetailValue value={supplyProfile.track.label} />
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                          <SkillDetailValue value={supplyProfile.track.description} />
                        </p>
                      </div>
                      <Link
                        href={`/skills?track=${supplyProfile.track.slug}`}
                        className="w-full rounded-[8px] border border-border bg-background px-4 py-2.5 text-center text-sm font-semibold transition-colors hover:border-foreground sm:w-auto"
                      >
                        <SkillDetailText id="browseTrack" />
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 bg-[#fbfaf7] p-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    {
                      label: 'scenario',
                      value: supplyProfile.scenario.label,
                      detail: supplyProfile.scenario.description,
                    },
                    {
                      label: 'agentFit',
                      value: supplyProfile.applicableAgents
                        .slice(0, 3)
                        .join(' + '),
                      detail: 'supplyAgentFitDescription',
                      detailIsCopy: true,
                    },
                    {
                      label: 'install',
                      value: supplyProfile.install.ready ? 'Ready' : 'Review',
                      detail: supplyProfile.install.command,
                      detailIsTechnical: true,
                    },
                    {
                      label: 'maintenance',
                      value: supplyProfile.maintenance.status,
                      detail: supplyProfile.maintenance.label,
                    },
                    {
                      label: 'risk',
                      value: supplyProfile.risk.label,
                      detail: supplyProfile.risk.notes.slice(0, 1).join(''),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="min-w-0 rounded-[8px] border border-border bg-background p-4"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                        <SkillDetailText id={item.label as 'scenario' | 'agentFit' | 'install' | 'maintenance' | 'risk'} />
                      </p>
                      <p className="mt-2 truncate font-semibold capitalize text-foreground">
                        <SkillDetailValue value={item.value} />
                      </p>
                      <p className="mt-2 line-clamp-3 break-words text-xs leading-relaxed text-secondary [overflow-wrap:anywhere]">
                        {item.detailIsCopy ? (
                          <SkillDetailText id="supplyAgentFitDescription" />
                        ) : item.detailIsTechnical ? (
                          item.detail
                        ) : (
                          <SkillDetailValue value={item.detail} />
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 border-t border-border bg-card p-3 sm:grid-cols-3">
                  <div className="rounded-[8px] border border-border bg-background p-5">
                    <p className="text-xs uppercase text-secondary">
                      <SkillDetailText id="githubQuality" />
                    </p>
                    <p className="mt-2 font-mono text-2xl font-semibold">
                      <SkillDetailValue value={supplyProfile.githubQuality.starsLabel} />
                    </p>
                    <p className="mt-1 text-sm text-secondary">
                      {supplyProfile.githubQuality.qualityScore}/100 <SkillDetailText id="quality" /> ·{' '}
                      {supplyProfile.githubQuality.trustScore}/100 <SkillDetailText id="trust" />
                    </p>
                  </div>
                  <div className="rounded-[8px] border border-border bg-background p-5">
                    <p className="text-xs uppercase text-secondary">
                      <SkillDetailText id="coverageTags" />
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {supplyProfile.coverageTags.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-[6px] border border-border bg-card px-2 py-1 text-xs text-secondary"
                        >
                          <SkillDetailValue value={tag} />
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[8px] border border-border bg-background p-5">
                    <p className="text-xs uppercase text-secondary">
                      <SkillDetailText id="reviewNotes" />
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-secondary">
                      {supplyProfile.risk.notes.slice(0, 2).map((note, index) => (
                        <span key={note}>
                          {index > 0 ? ' · ' : null}
                          <SkillDetailValue value={note} />
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <SkillScorePanel
              quality={qualityProfile}
              trust={trustProfile}
              audit={auditProfile}
            />

            <section className="mb-10 overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_18px_48px_rgba(22,20,16,0.05)]">
              <div className="relative border-b border-border bg-[#fbfaf7] p-5 sm:p-6">
                <div className="brand-grain pointer-events-none absolute inset-0 opacity-40" />
                <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                      <SkillDetailText id="agentReadableMetadata" />
                    </p>
                    <h2 className="max-w-2xl font-display text-2xl font-semibold leading-tight sm:text-3xl">
                      <SkillDetailText id="machineDecisionTitle" />
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                      <SkillDetailText id="machineDecisionDescription" />
                    </p>
                  </div>
                  <Link
                    href={registryManifestHref}
                    prefetch={false}
                    className="w-full rounded-[8px] border border-foreground bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background transition-opacity hover:opacity-80 sm:w-auto"
                  >
                    <SkillDetailText id="openJson" />
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 bg-[#fbfaf7] p-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="min-w-0 rounded-[8px] border border-border bg-background p-4 sm:p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                    <SkillDetailText id="suitedTasks" />
                  </p>
                  <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                    {suitableTasks.slice(0, 4).map((task) => (
                      <li key={task} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#006b4f]" />
                        <span className="min-w-0 break-words [overflow-wrap:anywhere]"><SkillDetailValue value={task} /></span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="min-w-0 rounded-[8px] border border-border bg-background p-4 sm:p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                    <SkillDetailText id="suitedAgents" />
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suitableAgents.map((agent) => (
                      <span
                        key={agent}
                        className="min-w-0 max-w-full rounded-[6px] border border-border bg-card px-2 py-1 text-xs leading-snug text-secondary [overflow-wrap:anywhere]"
                      >
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="min-w-0 rounded-[8px] border border-border bg-background p-4 sm:p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                    <SkillDetailText id="installDecision" />
                  </p>
                  <dl className="grid gap-2 text-sm">
                    <div className="min-w-0">
                      <dt className="text-secondary"><SkillDetailText id="command" /></dt>
                      <dd className="mt-1 min-w-0 rounded-[6px] border border-border bg-[#fbfaf7] px-2.5 py-2 font-mono text-xs leading-relaxed [overflow-wrap:anywhere]" title={installCommand}>
                        {installCommand}
                      </dd>
                    </div>
                    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3">
                      <dt className="text-secondary"><SkillDetailText id="policy" /></dt>
                      <dd className="min-w-0 break-words text-right font-mono [overflow-wrap:anywhere]">
                        <SkillDetailValue value={safetyProfile?.safety_tier.auto_install_policy || 'review'} />
                      </dd>
                    </div>
                    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3">
                      <dt className="text-secondary"><SkillDetailText id="humanReview" /></dt>
                      <dd className="min-w-0 text-right font-mono">
                        <SkillDetailValue value={safetyProfile?.human_review_required ? 'yes' : 'no'} />
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="min-w-0 rounded-[8px] border border-border bg-background p-4 sm:p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                    <SkillDetailText id="trustAndRisk" />
                  </p>
                  <dl className="grid gap-2 text-sm">
                    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3">
                      <dt className="text-secondary"><SkillDetailText id="trust" /></dt>
                      <dd className="min-w-0 text-right font-mono">
                        {trustProfile ? `${trustProfile.score}/100` : <SkillDetailValue value="Unknown" />}
                      </dd>
                    </div>
                    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3">
                      <dt className="text-secondary"><SkillDetailText id="audit" /></dt>
                      <dd className="min-w-0 text-right font-mono">
                        {auditProfile
                          ? `${auditProfile.audit_score}/100`
                          : <SkillDetailValue value="Unknown" />}
                      </dd>
                    </div>
                    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3">
                      <dt className="text-secondary"><SkillDetailText id="riskLevel" /></dt>
                      <dd className="min-w-0 break-words text-right font-mono [overflow-wrap:anywhere]">
                        {auditProfile
                          ? <SkillDetailValue value={auditRiskLabel(auditProfile.risk_level)} />
                          : <SkillDetailValue value="Unknown" />}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="min-w-0 rounded-[8px] border border-border bg-background p-4 sm:p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                    <SkillDetailText id="outcomeLoop" />
                  </p>
                  <dl className="grid gap-2 text-sm">
                    <div className="min-w-0">
                      <dt className="text-secondary"><SkillDetailText id="endpoint" /></dt>
                      <dd className="mt-1 min-w-0 rounded-[6px] border border-border bg-[#fbfaf7] px-2.5 py-2 font-mono text-xs leading-relaxed [overflow-wrap:anywhere]">
                        /api/agent/outcome
                      </dd>
                    </div>
                    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3">
                      <dt className="text-secondary"><SkillDetailText id="eventId" /></dt>
                      <dd className="min-w-0 text-right font-mono">resolve</dd>
                    </div>
                    <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3">
                      <dt className="text-secondary"><SkillDetailText id="outcomes" /></dt>
                      <dd className="min-w-0 text-right font-mono">
                        {outcomeFeedback?.expected_outcomes.length || 5}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="grid gap-3 border-t border-border bg-card p-3 lg:grid-cols-[1fr_0.9fr]">
                <div className="min-w-0 rounded-[8px] border border-border bg-background p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">
                    <SkillDetailText id="installCommand" />
                  </p>
                  <pre className="whitespace-pre-wrap break-all rounded-[6px] border border-border bg-[#fbfaf7] p-4 font-mono text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">
                    <code>{installCommand}</code>
                  </pre>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/skills/${skill.slug}/audit`}
                      className="rounded-[6px] border border-border px-2.5 py-1 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
                    >
                      <SkillDetailText id="publicAudit" />
                    </Link>
                    <Link
                      href={`/skills/${skill.slug}/evals`}
                      className="rounded-[6px] border border-border px-2.5 py-1 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
                    >
                      <SkillDetailText id="evalReport" />
                    </Link>
                    <Link
                      href={resolveApiHref}
                      prefetch={false}
                      className="rounded-[6px] border border-border px-2.5 py-1 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
                    >
                      <SkillDetailText id="resolveApi" />
                    </Link>
                    <Link
                      href={installApiHref}
                      prefetch={false}
                      className="rounded-[6px] border border-border px-2.5 py-1 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
                    >
                      <SkillDetailText id="installHandoff" />
                    </Link>
                  </div>
                </div>
                <div className="rounded-[8px] border border-border bg-background p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">
                    <SkillDetailText id="doNotUseWhen" />
                  </p>
                  <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                    {doNotUseWhen.slice(0, 5).map((warning) => (
                      <li key={warning} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-600" />
                        <span><SkillDetailValue value={warning} /></span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid gap-3 border-t border-border bg-[#fbfaf7] p-3 sm:grid-cols-2 lg:grid-cols-4">
                {agentAlternatives.length > 0 ? (
                  agentAlternatives.map((alternative) => (
                    <Link
                      key={alternative.slug}
                      href={`/skills/${alternative.slug}`}
                      className="min-w-0 rounded-[8px] border border-border bg-background p-4 transition-colors hover:border-foreground/40"
                    >
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                        <SkillDetailText id="alternative" />
                      </p>
                      <h3 className="truncate font-display text-lg font-semibold">
                        {alternative.name}
                      </h3>
                      <p className="mt-2 font-mono text-xs text-secondary">
                        {formatNumber(alternative.stars)} <SkillDetailText id="stars" />
                      </p>
                      <p className="mt-2 break-all font-mono text-[11px] leading-relaxed text-secondary [overflow-wrap:anywhere]">
                        {alternative.install_command}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-[8px] border border-border bg-background p-4 text-sm text-secondary">
                    <SkillDetailText id="closeAlternatives" />
                  </div>
                )}
              </div>
            </section>

            {safetyProfile && (
              <section className="mb-10 overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_18px_48px_rgba(22,20,16,0.05)]">
                <div className="relative border-b border-border bg-[#fbfaf7] p-5 sm:p-6">
                  <div className="brand-grain pointer-events-none absolute inset-0 opacity-40" />
                  <div className="relative">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                          <SkillDetailText id="agentSafetyV2" />
                        </p>
                        <h2 className="font-display text-2xl font-semibold">
                          {safetyProfile.score}/100 · <SkillDetailValue value={safetyProfile.label} />
                        </h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-[6px] border px-2 py-1 font-mono text-[10px] ${safetyTierTone(safetyProfile.safety_tier.tier)}`}
                          >
                            <SkillDetailValue value={safetyProfile.safety_tier.label} />
                          </span>
                          <span className="rounded-[6px] border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase text-secondary">
                            <SkillDetailValue value={safetyProfile.safety_tier.auto_install_policy} />
                          </span>
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                          <SkillDetailValue value={safetyProfile.safety_tier.summary} />
                        </p>
                        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-secondary">
                          <SkillDetailValue value={safetyProfile.safety_tier.recommended_action} />
                        </p>
                      </div>
                      <Link
                        href={`/api/agent/resolve?task=${encodeURIComponent(`Use ${skill.name}`)}&agent=codex&max_risk=medium`}
                        prefetch={false}
                        className="w-full rounded-[8px] border border-[#006b4f] bg-[#006b4f] px-4 py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
                      >
                        <SkillDetailText id="resolveViaApi" />
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 bg-[#fbfaf7] p-3 sm:grid-cols-2">
                  {safetyProfile.permission_hints.slice(0, 4).map((hint) => (
                    <div
                      key={hint.id}
                      className="rounded-[8px] border border-border bg-background p-4"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                        <SkillDetailValue value={hint.severity} />
                      </p>
                      <h3 className="mt-2 font-semibold"><SkillDetailValue value={hint.label} /></h3>
                      <p className="mt-2 text-sm leading-relaxed text-secondary">
                        <SkillDetailValue value={hint.reason} />
                      </p>
                    </div>
                  ))}
                </div>
                {safetyProfile.policy_warnings.length > 0 && (
                  <ul className="space-y-2 border-t border-border p-5 text-sm leading-relaxed text-secondary">
                    {safetyProfile.policy_warnings.map((warning) => (
                      <li key={warning} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-600" />
                        <span><SkillDetailValue value={warning} /></span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <div id="install-options" className="scroll-mt-24">
              <SkillInstallTargets
                skillSlug={skill.slug}
                targets={installTargets}
              />
            </div>

            <section className="mb-10 overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_18px_48px_rgba(22,20,16,0.05)]">
              <div className="relative border-b border-border bg-[#fbfaf7] p-5 sm:p-6">
                <div className="brand-grain pointer-events-none absolute inset-0 opacity-40" />
                <div className="relative">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                        <SkillDetailText id="agentResolvePlan" />
                      </p>
                      <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                        <SkillDetailText id="agentResolveTitle" />
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                        <SkillDetailText id="agentResolveDescription" />
                      </p>
                    </div>
                    <Link
                      href={resolveTextHref}
                      prefetch={false}
                      className="w-full rounded-[8px] border border-foreground bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background transition-opacity hover:opacity-80 sm:w-auto"
                    >
                      <SkillDetailText id="openTextPlan" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 bg-[#fbfaf7] p-3 lg:grid-cols-3">
                {[
                  {
                    label: 'openJson',
                    value: resolveApiHref,
                    href: resolveApiHref,
                  },
                  {
                    label: 'resolveText',
                    value: resolveTextHref,
                    href: resolveTextHref,
                  },
                  {
                    label: 'installHandoff',
                    value: installApiHref,
                    href: installApiHref,
                  },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    prefetch={false}
                    className="min-w-0 rounded-[8px] border border-border bg-background p-4 transition-colors hover:border-foreground/40"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                      <SkillDetailText id={item.label as 'openJson' | 'resolveText' | 'installHandoff'} />
                    </p>
                    <p className="mt-2 break-all font-mono text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">
                      {item.value}
                    </p>
                  </Link>
                ))}
              </div>

              <div className="grid gap-3 border-t border-border bg-card p-3 md:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[8px] border border-border bg-background p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                    <SkillDetailText id="agentShouldCheck" />
                  </p>
                  <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                    {[
                      'agentCheckTaskFit',
                      'agentCheckScores',
                      'agentCheckTargets',
                    ].map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#006b4f]" />
                        <span>
                          <SkillDetailText id={item as 'agentCheckTaskFit' | 'agentCheckScores' | 'agentCheckTargets'} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="min-w-0 rounded-[8px] border border-border bg-background p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                    <SkillDetailText id="copyPrompt" />
                  </p>
                  <pre className="overflow-x-auto rounded-[6px] border border-border bg-[#fbfaf7] p-4 font-mono text-xs leading-relaxed text-secondary">
                    <code>{agentResolvePrompt}</code>
                  </pre>
                </div>
              </div>
            </section>

            <section className="mb-10 overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_18px_48px_rgba(22,20,16,0.05)]">
              <div className="relative border-b border-border bg-[#fbfaf7] p-5 sm:p-6">
                <div className="brand-grain pointer-events-none absolute inset-0 opacity-40" />
                <div className="relative">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                        <SkillDetailText id="agentHandoff" />
                      </p>
                      <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                        <SkillDetailText id="agentHandoffTitle" />
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                        <SkillDetailText id="agentHandoffDescription" />
                      </p>
                    </div>
                    <Link
                      href={installApiHref}
                      className="w-full rounded-[8px] border border-foreground bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background transition-opacity hover:opacity-80 sm:w-auto"
                      >
                      <SkillDetailText id="openInstallApi" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 bg-[#fbfaf7] p-3 lg:grid-cols-3">
                {[
                  {
                    label: 'installHandoff',
                    value: installApiHref,
                    href: installApiHref,
                  },
                  {
                    label: 'llmTextFormat',
                    value: installTextHref,
                    href: installTextHref,
                  },
                  {
                    label: 'findAlternatives',
                    value: searchApiHref,
                    href: searchApiHref,
                  },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="min-w-0 rounded-[8px] border border-border bg-background p-4 transition-colors hover:border-foreground/40"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                      <SkillDetailText id={item.label as 'installHandoff' | 'llmTextFormat' | 'findAlternatives'} />
                    </p>
                    <p className="mt-2 break-all font-mono text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">
                      {item.value}
                    </p>
                  </Link>
                ))}
              </div>

              <div className="border-t border-border p-5">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                  <SkillDetailText id="agentPrompt" />
                </p>
                <pre className="overflow-x-auto rounded-[6px] border border-border bg-[#fbfaf7] p-4 font-mono text-xs leading-relaxed text-secondary">
                  <code>{`Use ${skill.name} for this task. Review ${absoluteInstallApiUrl}, then install with: ${skill.technical.installCommand}`}</code>
                </pre>
              </div>
            </section>

            <section className="mb-10 overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_18px_48px_rgba(22,20,16,0.05)]">
              <div className="relative border-b border-border bg-[#fbfaf7] p-5 sm:p-6">
                <div className="brand-grain pointer-events-none absolute inset-0 opacity-40" />
                <div className="relative">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                        <SkillDetailText id="registryMetadata" />
                      </p>
                      <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                        <SkillDetailText id="registryTitle" />
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                        <SkillDetailText id="registryDescription" />
                      </p>
                    </div>
                    <Link
                      href={registryManifestHref}
                      className="w-full rounded-[8px] border border-foreground bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background transition-opacity hover:opacity-80 sm:w-auto"
                      >
                      <SkillDetailText id="openManifest" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 bg-[#fbfaf7] p-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: 'manifest',
                    value: registryManifestHref,
                    href: registryManifestHref,
                  },
                  {
                    label: 'llmText',
                    value: registryManifestTextHref,
                    href: registryManifestTextHref,
                  },
                  {
                    label: 'installAlias',
                    value: registryInstallHref,
                    href: registryInstallHref,
                  },
                  {
                    label: 'recommend',
                    value: registryRecommendHref,
                    href: registryRecommendHref,
                  },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="min-w-0 rounded-[8px] border border-border bg-background p-4 transition-colors hover:border-foreground/40"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                      <SkillDetailText id={item.label as 'manifest' | 'llmText' | 'installAlias' | 'recommend'} />
                    </p>
                    <p className="mt-2 break-all font-mono text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">
                      {item.value}
                    </p>
                  </Link>
                ))}
              </div>

              <div className="grid gap-3 border-t border-border bg-card p-3 md:grid-cols-3">
                <div className="rounded-[8px] border border-border bg-background p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                    <SkillDetailText id="agentFit" />
                  </p>
                  <div className="font-mono text-2xl font-semibold">
                    {decisionProfile?.readinessScore ??
                      qualityProfile?.score ??
                      0}
                    /100
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-secondary">
                    {decisionProfile?.primaryFit ? (
                      <SkillDetailValue value={decisionProfile.primaryFit} />
                    ) : (
                      <SkillDetailText id="generalAgentWorkflow" />
                    )}
                  </p>
                </div>
                <div className="rounded-[8px] border border-border bg-background p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                    <SkillDetailText id="useCaseTags" />
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {matchedUseCases.length > 0 ? (
                      matchedUseCases.map((useCase) => (
                        <Link
                          key={useCase.slug}
                          href={`/use-cases/${useCase.slug}`}
                          className="rounded-[6px] border border-border bg-card px-2 py-1 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
                        >
                          <SkillDetailValue value={useCase.shortTitle} />
                        </Link>
                      ))
                    ) : (
                      <span className="text-sm text-secondary">
                        <SkillDetailText id="generalAgentWorkflow" />
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-[8px] border border-border bg-background p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                    <SkillDetailText id="platforms" />
                  </p>
                  <p className="text-sm leading-relaxed text-secondary">
                    {[
                      ...new Set([
                        ...(skill.technical.frameworks || []),
                        ...platformHints,
                      ]),
                    ]
                      .slice(0, 6)
                      .join(', ') ||
                      'Codex, Claude Code, Cursor, and custom agents'}
                  </p>
                </div>
              </div>
            </section>

            {auditProfile && (
              <section className="mb-10 rounded-[8px] border border-border bg-card p-5 shadow-[0_18px_48px_rgba(22,20,16,0.05)] sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                      <SkillDetailText id="auditReport" />
                    </p>
                    <h2 className="font-display text-2xl font-semibold">
                      <SkillDetailValue value={auditRiskLabel(auditProfile.risk_level)} /> ·{' '}
                      {auditProfile.audit_score}/100
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                      <SkillDetailText id="auditReportDescription" />
                    </p>
                  </div>
                  <Link
                    href={`/skills/${skill.slug}/audit`}
                    className="w-full rounded-[8px] border border-foreground bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background transition-opacity hover:opacity-80 sm:w-auto"
                  >
                    <SkillDetailText id="viewAuditReport" />
                  </Link>
                  <Link
                    href={`/skills/${skill.slug}/evals`}
                    className="w-full rounded-[8px] border border-border px-4 py-2.5 text-center text-sm font-semibold text-foreground transition-colors hover:border-foreground sm:w-auto"
                  >
                    <SkillDetailText id="viewEvalReport" />
                  </Link>
                </div>
              </section>
            )}

            {decisionProfile && (
              <section className="mb-10 overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_18px_48px_rgba(22,20,16,0.05)]">
                <div className="relative border-b border-border bg-[#fbfaf7] p-5 sm:p-6">
                  <div className="brand-grain pointer-events-none absolute inset-0 opacity-40" />
                  <div className="relative">
                    <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                          <SkillDetailText id="agentDecisionCockpit" />
                        </p>
                        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                          <SkillDetailValue value={decisionProfile.decisionHeadline} />
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                          <SkillDetailValue value={decisionProfile.recommendation} />
                        </p>
                      </div>
                      <div className="grid min-w-28 grid-cols-2 overflow-hidden rounded-[8px] border border-border bg-background text-center sm:block">
                        <div className="border-r border-border px-4 py-3 sm:border-r-0 sm:border-b">
                          <div className="font-mono text-3xl font-semibold">
                            {decisionProfile.readinessScore}
                          </div>
                          <div className="mt-1 text-xs uppercase text-secondary">
                            <SkillDetailText id="readiness" />
                          </div>
                        </div>
                        <div className="px-4 py-3">
                          <div className="font-mono text-lg font-semibold">
                            <SkillDetailValue value={decisionProfile.adoptionStage} />
                          </div>
                          <div className="mt-1 text-xs uppercase text-secondary">
                            <SkillDetailText id="stage" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        {
                          label: 'roleInStack',
                          value: decisionProfile.agentRole,
                        },
                        {
                          label: 'primaryFit',
                          value: decisionProfile.primaryFit,
                        },
                        {
                          label: 'trustLabel',
                          value: decisionProfile.readinessLabel,
                        },
                        {
                          label: 'installPath',
                          value: skill.technical.installCommand
                            ? 'Command ready'
                            : 'Repo install',
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-[8px] border border-border bg-background p-4"
                        >
                          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                            <SkillDetailText id={item.label as 'roleInStack' | 'primaryFit' | 'trustLabel' | 'installPath'} />
                          </p>
                          <p className="mt-2 font-mono text-sm"><SkillDetailValue value={item.value} /></p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 bg-card p-3 lg:grid-cols-3">
                  <div className="rounded-[8px] border border-border bg-background p-5">
                    <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                      <SkillDetailText id="useWhen" />
                    </p>
                    <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                      {decisionProfile.bestFor.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#006b4f]" />
                          <span><SkillDetailValue value={item} /></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[8px] border border-border bg-background p-5">
                    <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                      <SkillDetailText id="evidence" />
                    </p>
                    <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                      {decisionProfile.proofPoints.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#006b4f]" />
                          <span><SkillDetailValue value={item} /></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-[8px] border border-border bg-background p-5">
                    <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                      <SkillDetailText id="reviewFirst" />
                    </p>
                    <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                      {decisionProfile.riskNotes.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-600" />
                          <span><SkillDetailValue value={item} /></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="border-t border-border p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                    <SkillDetailText id="implementationPath" />
                  </p>
                  <ol className="grid gap-3 text-sm leading-relaxed text-secondary md:grid-cols-3">
                    {decisionProfile.implementationPlan.map((step, index) => (
                      <li
                        key={step}
                        className="rounded-[8px] border border-border bg-background p-4"
                      >
                        <span className="mb-2 block font-mono text-foreground">
                          {index + 1}
                        </span>
                        <SkillDetailValue value={step} />
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            )}

            {trustProfile && (
              <section className="mb-10 overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_18px_48px_rgba(22,20,16,0.05)]">
                <div className="relative border-b border-border bg-[#fbfaf7] p-5 sm:p-6">
                  <div className="brand-grain pointer-events-none absolute inset-0 opacity-40" />
                  <div className="relative">
                    <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                      <div>
                        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                          <SkillDetailText id="trustProfile" />
                        </p>
                        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                          <SkillDetailValue value={trustProfile.label} />
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                          <SkillDetailValue value={trustProfile.summary} />
                        </p>
                      </div>
                      <div className="shrink-0 rounded-[8px] border border-border bg-background px-5 py-4 text-center sm:min-w-32">
                        <div className="font-mono text-4xl font-semibold">
                          {trustProfile.score}
                        </div>
                        <div className="mt-1 text-xs uppercase text-secondary">
                          <SkillDetailText id="trustScore" />
                        </div>
                      </div>
                    </div>

                    <div className="mb-5 h-2 overflow-hidden rounded-[6px] bg-[#ebe7dd]">
                      <div
                        className="h-full rounded-[6px] bg-[#006b4f]"
                        style={{ width: `${trustProfile.score}%` }}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {trustProfile.checks.slice(0, 4).map((check) => (
                        <div
                          key={check.label}
                          className="min-w-0 rounded-[8px] border border-border bg-background p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                              <SkillDetailValue value={check.label} />
                            </p>
                            <span
                              className={`shrink-0 rounded-[6px] border px-2 py-0.5 text-[10px] font-mono ${getStatusTone(check.status)}`}
                            >
                              <SkillDetailValue value={getStatusLabel(check.status)} />
                            </span>
                          </div>
                          <p className="break-words font-mono text-sm text-foreground [overflow-wrap:anywhere]">
                            <SkillDetailValue value={check.detail} />
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 bg-card p-3 md:grid-cols-2">
                  <div className="rounded-[8px] border border-border bg-background p-5">
                    <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                      <SkillDetailText id="goodSignals" />
                    </p>
                    {trustProfile.strengths.length > 0 ? (
                      <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                        {trustProfile.strengths.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#006b4f]" />
                            <span><SkillDetailValue value={item} /></span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm leading-relaxed text-secondary">
                        <SkillDetailText id="noTrustSignals" />
                      </p>
                    )}
                  </div>
                  <div className="rounded-[8px] border border-border bg-background p-5">
                    <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                      <SkillDetailText id="reviewBeforeInstall" />
                    </p>
                    {trustProfile.warnings.length > 0 ? (
                      <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                        {trustProfile.warnings.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-600" />
                            <span><SkillDetailValue value={item} /></span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm leading-relaxed text-secondary">
                        <SkillDetailText id="noMajorTrustWarnings" />
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-border p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                    <SkillDetailText id="recommendedAction" />
                  </p>
                  <p className="text-sm leading-relaxed text-secondary">
                    <SkillDetailValue value={trustProfile.recommendedAction} />
                  </p>
                </div>
              </section>
            )}

            {qualityProfile && (
              <section className="mb-10 rounded-[8px] border border-border bg-card p-5 shadow-[0_18px_48px_rgba(22,20,16,0.05)] sm:p-6">
                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                      <SkillDetailText id="qualityProfile" />
                    </p>
                    <h2 className="font-display text-2xl font-semibold">
                      <SkillDetailValue value={qualityProfile.label} /> <SkillDetailText id="workflowCandidate" />
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                      <SkillDetailValue value={qualityProfile.summary} />
                    </p>
                  </div>
                  <div className="font-mono text-3xl font-semibold">
                    {qualityProfile.score}
                  </div>
                </div>
                <div className="mb-5 h-2 overflow-hidden rounded-[6px] bg-[#ebe7dd]">
                  <div
                    className="h-full rounded-[6px] bg-[#006b4f]"
                    style={{ width: `${qualityProfile.score}%` }}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {qualityProfile.signals.map((signal) => (
                    <div
                      key={signal.label}
                      className="rounded-[8px] border border-border bg-background p-4"
                    >
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                        <SkillDetailValue value={signal.label} />
                      </div>
                      <div className="mt-2 font-mono text-sm">
                        <SkillDetailValue value={signal.value} />
                      </div>
                    </div>
                  ))}
                </div>
                {qualityProfile.warnings.length > 0 && (
                  <div className="mt-4 rounded-[8px] border border-border bg-[#fbfaf7] p-4 text-sm leading-relaxed text-secondary">
                    <SkillDetailText id="reviewBeforeInstall" />:{' '}
                    {qualityProfile.warnings.slice(0, 3).map((warning, index) => (
                      <span key={warning}>
                        {index > 0 ? ' · ' : null}
                        <SkillDetailValue value={warning} />
                      </span>
                    ))}
                  </div>
                )}
              </section>
            )}

            {matchedUseCases.length > 0 && (
              <section className="mb-10">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-2 text-xs uppercase text-secondary">
                      <SkillDetailText id="workflowFit" />
                    </p>
                    <h2 className="font-display text-2xl font-semibold">
                      <SkillDetailText id="useSkillScenarios" />
                    </h2>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {matchedUseCases.map((useCase) => (
                    <Link
                      key={useCase.slug}
                      href={`/use-cases/${useCase.slug}`}
                      className="border border-border p-4 transition-colors hover:border-foreground"
                    >
                      <p className="text-xs uppercase text-secondary">
                        {useCase.eyebrow}
                      </p>
                      <h3 className="mt-2 font-display text-lg font-semibold">
                        {useCase.shortTitle}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-secondary">
                        {useCase.heroPrompt}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {matchedStacks.length > 0 && (
              <section className="mb-10">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-2 text-xs uppercase text-secondary">
                      <SkillDetailText id="workflowFit" />
                    </p>
                    <h2 className="font-display text-2xl font-semibold">
                      <SkillDetailText id="addCompleteWorkflow" />
                    </h2>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {matchedStacks.map((stack) => (
                    <Link
                      key={stack.slug}
                      href={`/collections/${stack.slug}`}
                      className="border border-border p-4 transition-colors hover:border-foreground"
                    >
                      <p className="text-xs uppercase text-secondary">
                        {stack.eyebrow}
                      </p>
                      <h3 className="mt-2 font-display text-lg font-semibold">
                        {stack.shortTitle}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-secondary">
                        {stack.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {relatedDecisionRows.length > 0 && (
              <section className="mb-10 border border-border p-5">
                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="mb-2 text-xs uppercase text-secondary">
                      <SkillDetailText id="alternativeShortlist" />
                    </p>
                    <h2 className="font-display text-2xl font-semibold">
                      <SkillDetailText id="compareBeforeInstall" />
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                      <SkillDetailText id="similarSkills" />
                    </p>
                  </div>
                  <SkillActionLink
                    href={compareHref}
                    skillSlug={skill.slug}
                    eventType="compare"
                    className="w-full border border-foreground bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background transition-opacity hover:opacity-80 sm:w-auto"
                  >
                    <SkillDetailText id="compareAll" />
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
                          <h3 className="font-display text-lg font-semibold">
                            {row.skill.name}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-secondary">
                            {row.skill.description}
                          </p>
                        </div>
                        <span className="shrink-0 border border-border px-2 py-1 text-xs font-mono text-secondary">
                          <SkillDetailValue value={row.decision.adoptionStage} />
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-px border border-border bg-border text-xs">
                        <div className="bg-background p-2">
                          <span className="block text-secondary"><SkillDetailText id="ready" /></span>
                          <span className="font-mono">
                            {row.decision.readinessScore}
                          </span>
                        </div>
                        <div className="bg-background p-2">
                          <span className="block text-secondary"><SkillDetailText id="quality" /></span>
                          <span className="font-mono">{row.quality.score}</span>
                        </div>
                        <div className="bg-background p-2">
                          <span className="block text-secondary"><SkillDetailText id="stars" /></span>
                          <span className="font-mono">
                            {formatNumber(row.skill.github_stars || 0)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Description */}
            <section className="mb-10">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-5">
                <SkillDetailText id="overview" />
              </h2>
              <div className="prose-like space-y-4 text-base sm:text-lg leading-relaxed">
                {skill.longDescription.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {/* Compatibility */}
            {skill.compatibility.length > 0 && (
              <section className="mb-10">
                <h2 className="font-display text-2xl font-semibold mb-5">
                  <SkillDetailText id="platformCompatibility" />
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {skill.compatibility.map((compat) => (
                    <div
                      key={compat.platform}
                      className="border border-border p-4 flex items-center justify-between"
                    >
                      <span className="font-mono font-semibold text-sm">
                        {compat.platform}
                      </span>
                      <span className="text-xs font-mono text-secondary border border-border px-2 py-0.5">
                        <SkillDetailValue value={compat.status?.toUpperCase() || 'SUPPORTED'} />
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Technical details */}
            <section className="mb-10">
              <h2 className="font-display text-2xl font-semibold mb-5">
                <SkillDetailText id="technicalDetails" />
              </h2>
              <dl className="grid gap-y-3 sm:grid-cols-2 sm:gap-x-8">
                {[
                  { label: 'version', value: skill.technical.version },
                  { label: 'license', value: skill.technical.license },
                  { label: 'lastUpdated', date: skill.technical.lastUpdated },
                  { label: 'published', date: skill.createdAt },
                ]
                  .filter((item) => item.value || item.date)
                  .map(({ label, value, date }) => (
                    <div key={label} className="border-b border-border pb-3">
                      <dt className="text-xs text-secondary mb-1">
                        <SkillDetailText id={label as 'version' | 'license' | 'lastUpdated' | 'published'} />
                      </dt>
                      <dd className="font-mono text-sm">
                        {date ? <SkillDetailDate value={date} /> : value}
                      </dd>
                    </div>
                  ))}
              </dl>

              {skill.technical.frameworks.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs text-secondary mb-2">
                    <SkillDetailText id="frameworksTools" />
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {skill.technical.frameworks.map((f) => (
                      <span
                        key={f}
                        className="border border-border px-3 py-1 font-mono text-xs"
                      >
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
                <h2 className="font-display text-2xl font-semibold mb-5">
                  <SkillDetailText id="aiQualityReview" />
                </h2>
                <div className="border border-border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-secondary">
                      <SkillDetailText id="qualityScore" />
                    </span>
                    <span className="font-mono font-bold text-2xl">
                      {aiScore}/100
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-none overflow-hidden">
                    <div
                      className="h-full bg-foreground transition-all"
                      style={{ width: `${aiScore}%` }}
                    />
                  </div>
                  {dbSkill?.ai_review_suggestions &&
                    dbSkill.ai_review_suggestions.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-secondary mb-2">
                          <SkillDetailText id="suggestions" />
                        </p>
                        <ul className="space-y-1">
                          {dbSkill.ai_review_suggestions.map((s, i) => (
                            <li
                              key={i}
                              className="text-xs text-secondary border-l-2 border-border pl-3"
                            >
                              <SkillDetailValue value={s} />
                            </li>
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
                <div className="overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_14px_36px_rgba(22,20,16,0.04)]">
                  <div className="border-b border-border bg-[#fbfaf7] p-5">
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
                      <SkillDetailText id="decisionSnapshot" />
                    </p>
                    <h3 className="font-display text-xl font-semibold leading-tight">
                      <SkillDetailValue value={decisionProfile.agentRole} />
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-border text-center">
                    <div className="bg-background p-4">
                      <div className="font-mono text-2xl font-semibold">
                        {decisionProfile.readinessScore}
                      </div>
                      <div className="mt-1 text-xs text-secondary"><SkillDetailText id="ready" /></div>
                    </div>
                    <div className="bg-background p-4">
                      <div className="font-mono text-sm font-semibold">
                        <SkillDetailValue value={decisionProfile.adoptionStage} />
                      </div>
                      <div className="mt-1 text-xs text-secondary"><SkillDetailText id="stage" /></div>
                    </div>
                  </div>
                  <p className="p-5 text-sm leading-relaxed text-secondary">
                    <SkillDetailValue value={decisionProfile.proofPoints[0]} />
                  </p>
                </div>
              )}

              {auditProfile && (
                <div className="overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_14px_36px_rgba(22,20,16,0.04)]">
                  <div className="border-b border-border bg-[#fbfaf7] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
                          <SkillDetailText id="audit" />
                        </p>
                        <h3 className="font-display text-xl font-semibold">
                          <SkillDetailText id="installReview" />
                        </h3>
                        <p className="mt-1 text-xs text-secondary">
                          <SkillDetailText id="installAdoptionDescription" />
                        </p>
                      </div>
                      <div className="font-mono text-2xl font-semibold">
                        {auditProfile.audit_score}
                      </div>
                    </div>
                    <span
                      className={`mt-4 inline-flex rounded-[6px] border px-2 py-1 font-mono text-[11px] ${getAuditTone(auditProfile.risk_level)}`}
                    >
                      <SkillDetailValue value={auditRiskLabel(auditProfile.risk_level)} />
                    </span>
                  </div>
                  <dl className="space-y-3 p-5 text-xs">
                    <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                      <dt className="text-secondary"><SkillDetailText id="security" /></dt>
                      <dd className="font-mono">
                        {auditProfile.security_score}/100
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                      <dt className="text-secondary"><SkillDetailText id="maintenance" /></dt>
                      <dd className="font-mono">
                        {auditProfile.maintenance_score}/100
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-secondary"><SkillDetailText id="install" /></dt>
                      <dd className="font-mono">
                        {auditProfile.install_score}/100
                      </dd>
                    </div>
                  </dl>
                  <Link
                    href={`/skills/${skill.slug}/audit`}
                    className="mx-5 mb-5 block rounded-[8px] border border-border px-3 py-2.5 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                  >
                    <SkillDetailText id="openFullAudit" />
                  </Link>
                  <Link
                    href={`/skills/${skill.slug}/evals`}
                    className="mx-5 mb-5 block rounded-[8px] border border-border px-3 py-2.5 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                  >
                    <SkillDetailText id="viewEvalReport" />
                  </Link>
                </div>
              )}

              <div className="overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_14px_36px_rgba(22,20,16,0.04)]">
                <div className="border-b border-border bg-[#fbfaf7] p-5">
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
                    <SkillDetailText id="agentProvenEvidence" />
                  </p>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-xl font-semibold leading-tight">
                        <SkillDetailText id="agentProvenEvidence" />
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-secondary">
                        <SkillDetailText id="agentProvenDescription" />
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-2xl font-semibold">
                        {agentProvenEvidence ? agentProvenEvidence.score : 0}
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-secondary">
                        <SkillDetailText id="proven" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-b border-border p-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-[999px] border border-border bg-background px-3 py-1 font-mono text-[11px] text-secondary">
                      {agentProvenEvidence ? (
                        <SkillDetailValue value={agentProvenEvidence.label} />
                      ) : (
                        <SkillDetailText id="needsFirstAgentRun" />
                      )}
                    </span>
                    <span className="rounded-[999px] border border-border bg-background px-3 py-1 font-mono text-[11px] text-secondary">
                      <SkillDetailText id="autoInstall" />: {trustProfile?.autoInstall.allowed ? <SkillDetailText id="candidate" /> : <SkillDetailText id="reviewFirst" />}
                    </span>
                    <span className="rounded-[999px] border border-border bg-background px-3 py-1 font-mono text-[11px] text-secondary">
                      <SkillDetailText id="last" />: <SkillDetailDate value={outcomeEvidence?.lastOutcomeAt} />
                    </span>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-px bg-border text-xs">
                  <div className="bg-background p-4">
                    <dt className="text-secondary"><SkillDetailText id="successRate" /></dt>
                    <dd className="mt-1 font-mono text-lg">
                      {outcomeEvidence?.successRate !== null && outcomeEvidence?.successRate !== undefined
                        ? `${Math.round(Number(outcomeEvidence.successRate))}%`
                        : '—'}
                    </dd>
                  </div>
                  <div className="bg-background p-4">
                    <dt className="text-secondary"><SkillDetailText id="recentFailure" /></dt>
                    <dd className="mt-1 font-mono text-lg">
                      {outcomeEvidence?.recentFailureRate !== null && outcomeEvidence?.recentFailureRate !== undefined
                        ? `${Math.round(Number(outcomeEvidence.recentFailureRate))}%`
                        : '—'}
                    </dd>
                  </div>
                  <div className="bg-background p-4">
                    <dt className="text-secondary"><SkillDetailText id="outcomes" /></dt>
                    <dd className="mt-1 font-mono text-lg">
                      {formatNumber(outcomeEvidence?.total || 0)}
                    </dd>
                  </div>
                  <div className="bg-background p-4">
                    <dt className="text-secondary"><SkillDetailText id="outputQuality" /></dt>
                    <dd className="mt-1 font-mono text-lg">
                      {outcomeEvidence?.avgOutputQuality !== null && outcomeEvidence?.avgOutputQuality !== undefined
                        ? `${Number(outcomeEvidence.avgOutputQuality).toFixed(1)}/5`
                        : '—'}
                    </dd>
                  </div>
                  <div className="bg-background p-4">
                    <dt className="text-secondary"><SkillDetailText id="failed" /></dt>
                    <dd className="mt-1 font-mono text-lg">
                      {formatNumber(outcomeEvidence?.failures || 0)}
                    </dd>
                  </div>
                  <div className="bg-background p-4">
                    <dt className="text-secondary"><SkillDetailText id="notRelevant" /></dt>
                    <dd className="mt-1 font-mono text-lg">
                      {formatNumber(outcomeEvidence?.notRelevant || 0)}
                    </dd>
                  </div>
                  <div className="bg-background p-4">
                    <dt className="text-secondary"><SkillDetailText id="installs" /></dt>
                    <dd className="mt-1 font-mono text-lg">
                      {formatNumber(outcomeEvidence?.installAttempts || 0)}
                    </dd>
                  </div>
                  <div className="bg-background p-4">
                    <dt className="text-secondary"><SkillDetailText id="riskBlocked" /></dt>
                    <dd className="mt-1 font-mono text-lg">
                      {formatNumber(outcomeEvidence?.riskBlocked || 0)}
                    </dd>
                  </div>
                  <div className="bg-background p-4">
                    <dt className="text-secondary"><SkillDetailText id="setupNeeded" /></dt>
                    <dd className="mt-1 font-mono text-lg">
                      {formatNumber(outcomeEvidence?.setupRequired || 0)}
                    </dd>
                  </div>
                  <div className="bg-background p-4">
                    <dt className="text-secondary"><SkillDetailText id="production" /></dt>
                    <dd className="mt-1 font-mono text-lg">
                      {formatNumber(outcomeEvidence?.productionOutcomes || 0)}
                    </dd>
                  </div>
                </dl>
                <div className="space-y-3 p-5">
                  <p className="text-xs leading-relaxed text-secondary">
                    {agentProvenEvidence?.metrics.totalOutcomes
                      ? <SkillDetailValue value={agentProvenEvidence.summary} />
                      : <SkillDetailValue value="No agent outcome data yet. The first agent run can report success, setup needs, risk blocks, failure, or not-relevant through /api/agent/outcome." />}
                  </p>
                  <div className="grid gap-2">
                    <Link
                      href="/rankings/agent-proven"
                      className="rounded-[8px] border border-border px-3 py-2 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                    >
                      <SkillDetailText id="agentProvenRanking" />
                    </Link>
                    <Link
                      href="/api/agent/outcome?contract=true"
                      prefetch={false}
                      className="rounded-[8px] border border-border px-3 py-2 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                    >
                      <SkillDetailText id="outcomeContract" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Install card */}
              <div className="rounded-[8px] border border-border bg-card p-5 shadow-[0_14px_36px_rgba(22,20,16,0.04)]">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
                  <SkillDetailText id="install" />
                </p>
                <h3 className="mb-2 font-display text-xl font-semibold">
                  <SkillDetailText id="addToWorkflow" />
                </h3>
                <p className="mb-4 text-xs leading-relaxed text-secondary">
                  <SkillDetailText id="freeOpenSource" />. <SkillDetailText id="reviewBeforeProduction" />
                </p>
                <div className="space-y-2">
                  <SaveSkillButton
                    skillSlug={skill.slug}
                    className="rounded-[8px]"
                  />
                  <SkillActionLink
                    href={compareHref}
                    skillSlug={skill.slug}
                    eventType="compare"
                    className="block w-full rounded-[8px] border border-border py-2.5 text-center text-sm text-foreground transition-colors hover:border-foreground"
                  >
                    <SkillDetailText id="compareAlternatives" />
                  </SkillActionLink>
                  <Link
                    href={resolveTextHref}
                    prefetch={false}
                    className="block w-full rounded-[8px] border border-border py-2.5 text-center text-sm text-foreground transition-colors hover:border-foreground"
                  >
                    <SkillDetailText id="autoResolvePlan" />
                  </Link>
                  {skill.technical.repository && (
                    <SkillActionLink
                      href={skill.technical.repository}
                      skillSlug={skill.slug}
                      eventType="outbound_github"
                      external
                      className="block w-full rounded-[8px] border border-[#006b4f] bg-[#006b4f] py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      <SkillDetailText id="viewGitHub" />
                    </SkillActionLink>
                  )}
                  <SkillActionLink
                    href={skill.technical.documentation}
                    skillSlug={skill.slug}
                    eventType="outbound_docs"
                    external
                    className="block w-full rounded-[8px] border border-border py-2.5 text-center text-sm text-foreground transition-colors hover:border-foreground"
                  >
                    <SkillDetailText id="documentation" />
                  </SkillActionLink>
                </div>
              </div>

              {xMainText && (
                <SkillXSharePanel
                  skillName={skill.name}
                  mainText={xMainText}
                  mainIntentUrl={buildXIntentUrl(xMainText)}
                  replyText={xReplyText}
                  replyIntentUrl={
                    xReplyText ? buildXIntentUrl(xReplyText) : undefined
                  }
                />
              )}

              {attribution && (
                <SkillAttributionPanel attribution={attribution} />
              )}

              <ClaimSkillPanel
                skillSlug={skill.slug}
                repository={skill.technical.repository}
                creatorName={attribution?.creatorName}
                sourceLabel={attribution?.statusLabel.toLowerCase()}
                approvedClaim={
                  approvedClaim
                    ? {
                        github_username: approvedClaim.github_username,
                        evidence_url: approvedClaim.evidence_url,
                      }
                    : null
                }
              />

              <CreatorBadgeKit skillSlug={skill.slug} />

              {/* Author */}
              <div className="border border-border p-5">
                <h3 className="font-display text-lg font-semibold mb-3">
                  <SkillDetailText id="author" />
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center border border-border font-mono text-lg shrink-0">
                    {skill.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {skill.author.name}
                      {skill.author.verified && (
                        <span className="ml-1.5 text-xs font-mono text-secondary">
                          ✓
                        </span>
                      )}
                    </p>
                    {skill.author.username && (
                      <p className="text-xs text-secondary">
                        @{skill.author.username}
                      </p>
                    )}
                    {publisherProfiles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        {dbSkill?.publisher_github && (
                          <a href={`https://github.com/${dbSkill.publisher_github}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                            GitHub @{dbSkill.publisher_github}
                          </a>
                        )}
                        {dbSkill?.publisher_x && (
                          <a href={`https://x.com/${dbSkill.publisher_x}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                            X @{dbSkill.publisher_x}
                          </a>
                        )}
                        {!dbSkill?.publisher_verified && (
                          <span className="font-mono text-[10px] uppercase text-secondary">Unverified</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {skill.tags.length > 0 && (
                <div className="border border-border p-5">
                  <h3 className="font-display text-lg font-semibold mb-3">
                    <SkillDetailText id="tags" />
                  </h3>
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
                  <h3 className="font-display text-lg font-semibold mb-3">
                    <SkillDetailText id="platformFit" />
                  </h3>
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
                <h3 className="font-display text-lg font-semibold mb-3">
                  <SkillDetailText id="healthSignals" />
                </h3>
                <dl className="space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-secondary"><SkillDetailText id="githubStars" /></dt>
                    <dd className="font-mono">
                      {formatNumber(skill.stats.stars)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-secondary"><SkillDetailText id="qualityScore" /></dt>
                    <dd className="font-mono">
                      {Math.round(skill.stats.qualityScore || aiScore || 0)}/100
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-secondary"><SkillDetailText id="lastGitHubPush" /></dt>
                    <dd className="font-mono text-right">
                      <SkillDetailDate value={dbSkill?.github_last_pushed_at} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-secondary"><SkillDetailText id="frameworkHints" /></dt>
                    <dd className="font-mono">
                      {skill.technical.frameworks.length || <SkillDetailValue value="Unknown" />}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-secondary"><SkillDetailText id="openSkillViews" /></dt>
                    <dd className="font-mono">
                      {formatNumber(eventStats?.views || 0)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-secondary"><SkillDetailText id="installCopies" /></dt>
                    <dd className="font-mono">
                      {formatNumber(eventStats?.install_copies || 0)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-secondary"><SkillDetailText id="outboundClicks" /></dt>
                    <dd className="font-mono">
                      {formatNumber(eventStats?.outbound_clicks || 0)}
                    </dd>
                  </div>
                </dl>
              </div>

              <SkillFeedbackPanel skillSlug={skill.slug} />

              {trustProfile && (
                <div className="border border-border p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-lg font-semibold">
                        <SkillDetailText id="trustSafety" />
                      </h3>
                      <p className="mt-1 text-xs text-secondary">
                        <SkillDetailValue value={trustProfile.label} />
                      </p>
                    </div>
                    <div className="font-mono text-2xl font-semibold">
                      {trustProfile.score}
                    </div>
                  </div>
                  <ul className="space-y-2 text-xs text-secondary">
                    {trustProfile.checks.slice(0, 6).map((check) => (
                      <li
                        key={check.label}
                        className="flex items-start justify-between gap-3"
                      >
                        <span className="min-w-0">
                          <span className="block text-foreground">
                            <SkillDetailValue value={check.label} />
                          </span>
                          <span className="block break-words [overflow-wrap:anywhere]">
                            <SkillDetailValue value={check.detail} />
                          </span>
                        </span>
                        <span
                          className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] ${getStatusTone(check.status)}`}
                        >
                          <SkillDetailValue value={getStatusLabel(check.status)} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related skills */}
              {relatedSkills.length > 0 && (
                <div className="border border-border p-5">
                  <h3 className="font-display text-lg font-semibold mb-3">
                    <SkillDetailText id="relatedSkills" />
                  </h3>
                  <div className="space-y-3">
                    {relatedSkills.map((rs) => (
                      <Link
                        key={rs.slug}
                        href={`/skills/${rs.slug}`}
                        className="block border-b border-border pb-3 last:border-0 last:pb-0 hover:opacity-70 transition-opacity"
                      >
                        <p className="font-semibold text-sm">{rs.name}</p>
                        <p className="text-xs text-secondary mt-0.5 line-clamp-2">
                          {rs.description}
                        </p>
                        <span className="text-xs font-mono text-secondary mt-1 block">
                          {formatNumber(rs.github_stars)} <SkillDetailText id="stars" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-3 shadow-[0_-12px_30px_rgba(22,20,16,0.08)] backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2">
            <a
              href="#install-options"
              className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#006b4f] px-4 text-sm font-semibold text-white"
            >
              <SkillDetailText id="install" />
            </a>
            {skill.technical.repository ? (
              <SkillActionLink
                href={skill.technical.repository}
                skillSlug={skill.slug}
                eventType="outbound_github"
                external
                className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-border bg-background px-4 text-sm font-semibold"
              >
                <SkillDetailText id="viewGitHub" />
              </SkillActionLink>
            ) : (
              <Link
                href={resolveTextHref}
                prefetch={false}
                className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-border bg-background px-4 text-sm font-semibold"
              >
                <SkillDetailText id="autoResolvePlan" />
              </Link>
            )}
          </div>
        </div>
      </main>

        <SiteFooter />
      </div>
    </I18nProvider>
  )
}
