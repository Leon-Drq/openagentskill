import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { getApprovedClaimBySkillSlug, convertSkillRecordToManifest, getAgentOutcomeStats, getRelatedSkills, getSkillEventStats } from '@/lib/db/skills'
import { getSkillBySlugOrFallbackStrict, getCanonicalSkillSlug } from '@/lib/skill-fallbacks'
import { withTimeout } from '@/lib/async'
import { defaultLocale, getLocaleFromSearchParam } from '@/lib/i18n/config'
import { I18nProvider } from '@/lib/i18n/context'
import { buildSkillSearchMetadata } from '@/lib/seo/search-metadata'
import { isSearchIndexEligible } from '@/lib/seo/search-indexability'
import { getSkillSourceEvidence } from '@/lib/skills/source-evidence'
import { buildDetailStructuredData, selectDetailAlternatives, serializeDetailJson } from '@/lib/skills/detail-profile'
import { getSkillQualityProfile } from '@/lib/quality'
import { getSkillTrustProfileV5 } from '@/lib/trust'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import { buildAgentReadableSkillMetadata } from '@/lib/agent-readable'
import { getSkillInstallTargets } from '@/lib/install-targets'
import { getGitHubOwner } from '@/lib/github-owner'
import { FEATURED_CREATORS, creatorHref } from '@/lib/creator-directory'
import { getSkillAttribution } from '@/lib/skill-attribution'
import { getShowcasesForSkill } from '@/lib/showcase'
import { needsOwnerPublicationReview } from '@/lib/skills/publication'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { SkillDetailLink as Link } from '@/components/skill-detail-link'
import { SkillDetailText as Text, SkillDetailDate as DateText, SkillDetailValue as Value } from '@/components/skill-detail-text'
import { SkillProfileText as ProfileText } from '@/components/skill-profile-text'
import { SkillDocument } from '@/components/skill-document'
import { GitHubOwnerAvatar } from '@/components/github-owner-avatar'
import { SkillActionLink } from '@/components/skill-action-link'
import { SkillEventTracker } from '@/components/skill-event-tracker'
import { SkillInstallTargets } from '@/components/skill-install-targets'
import { SkillShareButton } from '@/components/skill-share-button'
import { SaveSkillButton } from '@/components/save-skill-button'
import { SkillShowcase } from '@/components/showcase-sections'
import { ClaimSkillPanel } from '@/components/claim-skill-panel'
import { CreatorBadgeKit } from '@/components/creator-badge-kit'
import { SkillFeedbackPanel } from '@/components/skill-feedback-panel'
import { SkillAttributionPanel } from '@/components/skill-attribution-panel'
import { OwnerPublicationNote } from '@/components/owner-publication-note'

export const revalidate = 300
const SKILL_DETAIL_SUPPORT_TIMEOUT_MS = 1200

const getCachedSkillBySlug = cache(async (slug: string) =>
  getSkillBySlugOrFallbackStrict(getCanonicalSkillSlug(slug))
)

const getSharedSkillDetailSupport = unstable_cache(
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
  },
  ['skill-detail-support-v1'],
  {
    revalidate: 300,
    tags: ['public-skill-directory', 'public-skill-stats', 'public-skill-outcomes'],
  }
)

const getCachedSkillDetailSupport = cache(getSharedSkillDetailSupport)

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
  const imageVersion = '8'
  const openGraphImageUrl = `${pageUrl}/opengraph-image?v=${imageVersion}`
  const twitterImageUrl = `${pageUrl}/twitter-image?v=${imageVersion}`
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


const sectionClass = 'scroll-mt-28 border-t border-border py-9 sm:py-12'
const headingClass = 'font-display text-3xl font-normal tracking-tight sm:text-4xl'
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#006b4f]'

export default async function SkillDetailPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string | string[] }>
}) {
  const { slug } = await params
  const { lang } = await searchParams
  const initialLocale = getLocaleFromSearchParam(lang) || undefined
  const dbSkill = await getCachedSkillBySlug(slug)
  if (!dbSkill) notFound()
  const skill = convertSkillRecordToManifest(dbSkill)
  if (slug !== skill.slug) permanentRedirect(`/skills/${skill.slug}`)
  const support = await getCachedSkillDetailSupport(skill.id, skill.category, skill.slug)
  const { eventStats, outcomeStats, approvedClaim } = support
  const relatedSkills = selectDetailAlternatives(dbSkill, support.relatedSkills)
  const quality = getSkillQualityProfile(dbSkill)
  const trust = getSkillTrustProfileV5(dbSkill, Boolean(approvedClaim), eventStats, outcomeStats)
  const audit = buildSkillAudit(dbSkill, eventStats)
  const safety = getAgentSafetyProfile(dbSkill, audit, { max_risk: 'medium', needs_install_command: true })
  const source = getSkillSourceEvidence(dbSkill)
  const attribution = getSkillAttribution(dbSkill, approvedClaim)
  const targets = getSkillInstallTargets(dbSkill)
  const installTargets = (['codex', 'claude-code', 'cursor', 'openagentskill-cli'] as const)
    .map(id => targets.find(target => target.id === id)).filter((target): target is NonNullable<typeof target> => Boolean(target))
  const hasShowcase = getShowcasesForSkill(skill.slug).length > 0
  const githubOwner = getGitHubOwner(dbSkill)
  const featuredCreator = FEATURED_CREATORS.find(creator => creator.owner.toLowerCase() === githubOwner.toLowerCase())
  const machineMetadata = buildAgentReadableSkillMetadata(dbSkill, { eventStats, outcomeStats, approvedClaim: Boolean(approvedClaim), alternatives: relatedSkills })
  const sourceStatus = source.status === 'source-recorded' ? 'recorded' : source.status === 'source-needs-review' ? 'changed' : 'unverified'
  const sourceNote = source.status === 'source-recorded' ? 'recordedNote' : source.status === 'source-needs-review' ? 'changedNote' : 'unverifiedNote'
  const installApiHref = `/api/skills/${skill.slug}/install`
  const auditHref = `/skills/${skill.slug}/audit`
  const evalHref = `/skills/${skill.slug}/evals`
  const compareHref = `/compare?skills=${encodeURIComponent([skill.slug, ...relatedSkills.map(item => item.slug)].join(','))}`
  const warnings = [...new Set([...audit.warnings, ...(dbSkill.ai_review_issues || [])])].filter(Boolean)
  const metrics = [
    { label: 'quality' as const, value: quality.score, status: quality.label },
    { label: 'trust' as const, value: trust.score, status: trust.label },
    { label: 'audit' as const, value: audit.audit_score, status: auditRiskLabel(audit.risk_level) },
  ]
  const sourceHref = source.path && dbSkill.github_repo && /^[\w.-]+\/[\w.-]+$/.test(dbSkill.github_repo)
    ? `https://github.com/${dbSkill.github_repo}/blob/${encodeURIComponent(dbSkill.source_commit_sha || dbSkill.source_ref || 'HEAD')}/${source.path.split('/').map(encodeURIComponent).join('/')}`
    : skill.technical.repository

  return (
    <I18nProvider initialLocale={initialLocale}>
      <div className="min-h-screen bg-background">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeDetailJson(buildDetailStructuredData(dbSkill)) }} />
        <script id="agent-skill-metadata" type="application/json" dangerouslySetInnerHTML={{ __html: serializeDetailJson(machineMetadata) }} />
        <SkillEventTracker skillSlug={skill.slug} />
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-6 sm:pt-12" data-skill-profile="v2">
          <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap gap-2 text-xs text-secondary sm:mb-12">
            <Link href="/skills"><Text id="skills" /></Link><span aria-hidden="true">/</span>
            <Link href={`/skills?category=${encodeURIComponent(skill.category)}`}><Value value={skill.category} /></Link>
            <span aria-hidden="true">/</span><span className="break-words text-foreground">{skill.name}</span>
          </nav>

          <header className="relative pb-10 sm:pb-14">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <GitHubOwnerAvatar owner={githubOwner} label={skill.author.name} size="lg" />
                <div className="min-w-0 text-sm">
                  {featuredCreator ? <Link href={creatorHref(featuredCreator.owner)} className="font-semibold hover:underline">{skill.author.name}</Link> : <a href={attribution.creatorUrl || skill.technical.repository} target="_blank" rel="noreferrer" className="font-semibold hover:underline">{skill.author.name}</a>}
                  <p className="mt-1 text-xs text-secondary"><Value value={attribution.statusLabel} /></p>
                </div>
              </div>
              <span className="rounded-full border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-secondary"><ProfileText id={sourceStatus} /></span>
            </div>
            <h1 className="max-w-5xl break-words font-display text-4xl font-normal leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl [overflow-wrap:anywhere]">{skill.name}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-secondary sm:text-xl">{skill.tagline || skill.description}</p>
            <div className="mt-7 flex flex-wrap gap-2 sm:gap-3">
              <Link href="#install-options" className={`${actionClass} border-[#006b4f] bg-[#006b4f] text-white hover:bg-[#005841]`}>
                <ProfileText id={source.canOfferInstall && !safety.blocked ? 'useAgent' : 'reviewSource'} /><ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              {skill.technical.repository && <SkillActionLink href={skill.technical.repository} skillSlug={skill.slug} eventType="outbound_github" external className={actionClass}><Text id="viewGitHub" /><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></SkillActionLink>}
              <SaveSkillButton skillSlug={skill.slug} compact className="min-h-11 rounded-md px-4" />
              <SkillShareButton skillSlug={skill.slug} skillName={skill.name} />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-secondary">
              <span>★ {Number(dbSkill.github_stars || 0).toLocaleString('en-US')} <Text id="githubStars" /></span>
              <span><ProfileText id="registryUpdated" /> · <DateText value={skill.updatedAt} /></span>
              {skill.tags.slice(0, 3).map(tag => <Link key={tag} href={`/skills?q=${encodeURIComponent(tag)}`} className="underline decoration-border underline-offset-4 hover:decoration-foreground">{tag}</Link>)}
            </div>
            {needsOwnerPublicationReview(dbSkill) && <div className="mt-6"><OwnerPublicationNote /></div>}
          </header>

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-14">
            <div className="min-w-0">
              {hasShowcase && <SkillShowcase skillSlug={skill.slug} profile />}
              <section id="overview" className={sectionClass}>
                <h2 className={headingClass}><Text id="overview" /></h2>
                <SkillDocument source={skill.longDescription} summary={skill.description} sourceUrl={sourceHref || ''} locale={initialLocale} />
              </section>

              <section id="install-options" className={sectionClass}>
                <h2 className={headingClass}><ProfileText id={source.canOfferInstall && !safety.blocked ? 'useAgent' : 'reviewSource'} /></h2>
                <div className={`my-6 border-l-2 p-4 text-sm leading-relaxed ${source.canOfferInstall && !safety.human_review_required ? 'border-[#006b4f] bg-[#eef5f0]' : 'border-amber-600 bg-amber-50/60'}`} data-source-state={source.status}>
                  <p className="font-semibold"><ProfileText id={sourceStatus} /></p>
                  <p className="mt-2"><ProfileText id={sourceNote} /></p>
                  <p className="mt-2"><Text id="reviewBeforeInstall" />: <Value value={safety.label} /></p>
                  {warnings.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5">{warnings.slice(0, 4).map(warning => <li key={warning}><Value value={warning} /></li>)}</ul>}
                </div>
                {!safety.blocked && <SkillInstallTargets skillSlug={skill.slug} targets={installTargets} compact />}
                {safety.blocked && <Link href={auditHref} className={actionClass}><Text id="openFullAudit" /></Link>}
                <p className="mt-4 text-xs leading-relaxed text-secondary"><ProfileText id="compatibilityNote" /></p>
                <h3 className="mt-9 font-display text-2xl"><ProfileText id="workflow" /></h3>
                <ol className="mt-5 space-y-4">
                  {(['stepOne', 'stepTwo', 'stepThree'] as const).map((id, index) => <li key={id} className="flex gap-4 text-sm leading-7 text-secondary"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[10px] text-[#006b4f]">{index + 1}</span><span><ProfileText id={id} /></span></li>)}
                </ol>
                <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed text-secondary"><ProfileText id="costNote" /></p>
              </section>

              <section id="source-trust" className={sectionClass}>
                <h2 className={headingClass}><ProfileText id="sourceTrust" /></h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary"><ProfileText id="signalsNote" /></p>
                <dl className="mt-6 grid gap-x-8 sm:grid-cols-2">
                  <div className="border-b border-border py-4"><dt className="text-xs text-secondary"><Text id="license" /></dt><dd className="mt-2 text-sm"><Value value={dbSkill.license || 'Unknown'} /></dd></div>
                  <div className="border-b border-border py-4"><dt className="text-xs text-secondary"><Text id="version" /></dt><dd className="mt-2 font-mono text-sm">{dbSkill.version || '—'}</dd></div>
                  <div className="border-b border-border py-4"><dt className="text-xs text-secondary"><Text id="lastGitHubPush" /></dt><dd className="mt-2 text-sm"><DateText value={dbSkill.github_last_pushed_at} /></dd></div>
                  <div className="border-b border-border py-4"><dt className="text-xs text-secondary"><ProfileText id="registryUpdated" /></dt><dd className="mt-2 text-sm"><DateText value={skill.updatedAt} /></dd></div>
                  <div className="min-w-0 border-b border-border py-4 sm:col-span-2"><dt className="text-xs text-secondary"><ProfileText id="sourcePath" /></dt><dd className="mt-2 break-all font-mono text-xs">{source.path ? <a href={sourceHref} target="_blank" rel="noreferrer" className="underline underline-offset-4">{source.path}{source.revision ? ` @ ${source.revision.slice(0, 12)}` : ''}</a> : <ProfileText id="unverified" />}</dd></div>
                </dl>
                <p className="mt-3 text-xs leading-relaxed text-secondary"><ProfileText id="versionNote" /></p>
                <div className="mt-8 grid grid-cols-3 border-y border-border">
                  {metrics.map(metric => <div key={metric.label} className="min-w-0 border-r border-border py-5 pr-2 pl-3 first:pl-0 last:border-0 sm:px-5">
                    <p className="text-xs text-secondary"><Text id={metric.label} /></p>
                    <p className="mt-2 font-display text-3xl">{Math.max(0, Math.min(100, Math.round(metric.value)))}<span className="ml-1 font-mono text-[10px] text-secondary">/100</span></p>
                    <p className="mt-2 text-[11px] leading-relaxed text-secondary"><Value value={metric.status} /></p>
                  </div>)}
                </div>
                <div className="mt-5 flex flex-wrap gap-3"><Link href={auditHref} className={actionClass}><Text id="openFullAudit" /></Link><Link href={evalHref} className={actionClass}><Text id="viewEvalReport" /></Link></div>
                {warnings.length > 0 && <ul className="mt-6 list-disc space-y-2 pl-5 text-sm leading-relaxed text-secondary">{warnings.map(warning => <li key={warning}><Value value={warning} /></li>)}</ul>}
                <dl className="mt-7 grid grid-cols-2 gap-4">
                  <div><dt className="text-xs text-secondary"><Text id="verifiedInstalls" /></dt><dd className="mt-1 font-mono text-xl">{outcomeStats?.verified_installs ?? '—'}</dd></div>
                  <div><dt className="text-xs text-secondary"><Text id="outcomes" /></dt><dd className="mt-1 font-mono text-xl">{outcomeStats?.total_outcomes ?? '—'}</dd></div>
                </dl>
                <p className="mt-3 text-xs leading-relaxed text-secondary"><ProfileText id="copyNote" /></p>
              </section>

              <section id="agent-access" className={sectionClass}>
                <h2 className={headingClass}><ProfileText id="agentAccess" /></h2>
                <p className="mt-4 text-sm leading-relaxed text-secondary"><Text id="registryDescription" /></p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={installApiHref} prefetch={false} className={actionClass}><Text id="openInstallApi" /></Link>
                  <Link href={`${installApiHref}?format=text`} prefetch={false} className={actionClass}><Text id="llmTextFormat" /></Link>
                  <Link href={`/api/registry/manifest/${skill.slug}`} prefetch={false} className={actionClass}><Text id="openManifest" /></Link>
                  <Link href={`/resolve?task=${encodeURIComponent(`Evaluate ${skill.name} for my task. Check source instructions, permissions and costs before proposing installation.`)}`} className={actionClass}><Text id="autoResolvePlan" /></Link>
                </div>
                <details className="mt-5 border-b border-border pb-5">
                  <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold"><ProfileText id="moreDetails" /></summary>
                  <pre className="max-h-80 overflow-auto border border-border bg-card p-4 text-xs leading-relaxed"><code>{JSON.stringify(machineMetadata, null, 2)}</code></pre>
                </details>
              </section>

              <section id="related-skills" className={sectionClass}>
                <div className="flex flex-wrap items-center justify-between gap-4"><h2 className={headingClass}><Text id="relatedSkills" /></h2>
                  {relatedSkills.length > 0 && <Link href={compareHref} className="text-sm font-semibold text-[#006b4f]"><Text id="compareAll" /> →</Link>}
                </div>
                {relatedSkills.length ? <div className="mt-6 divide-y divide-border">{relatedSkills.map(item => <Link key={item.slug} href={`/skills/${item.slug}`} className="group flex items-start justify-between gap-4 py-5">
                  <div className="min-w-0"><p className="font-semibold group-hover:text-[#006b4f]">{item.name}</p><p className="mt-2 line-clamp-3 text-sm leading-relaxed text-secondary">{item.description}</p></div><ArrowUpRight className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                </Link>)}</div> : <p className="mt-5 text-sm text-secondary"><Text id="closeAlternatives" /></p>}
                <div className="mt-5 flex flex-wrap gap-2">{skill.tags.map(tag => <Link key={tag} href={`/skills?q=${encodeURIComponent(tag)}`} className="rounded-full border border-border px-3 py-1.5 text-xs text-secondary hover:text-foreground">{tag}</Link>)}</div>
              </section>

              <section id="creator-tools" className={sectionClass}>
                <h2 className={headingClass}><ProfileText id="creatorTools" /></h2>
                <div className="mt-6"><SkillAttributionPanel attribution={attribution} /></div>
                <ClaimSkillPanel skillSlug={skill.slug} repository={skill.technical.repository} creatorName={attribution.creatorName} sourceLabel={attribution.statusLabel.toLowerCase()} approvedClaim={approvedClaim ? { github_username: approvedClaim.github_username, x_username: approvedClaim.x_username, evidence_url: approvedClaim.evidence_url, verification_tier: approvedClaim.verification_tier, verified_at: approvedClaim.verified_at } : null} />
                <details className="my-5"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold"><Text id="shareKit" /></summary><CreatorBadgeKit skillSlug={skill.slug} /></details>
                <SkillFeedbackPanel skillSlug={skill.slug} />
              </section>
            </div>

            <aside className="hidden min-w-0 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto">
              <nav className="border-t-2 border-[#006b4f] pt-5" aria-label={skill.name}>
                <p className="mb-4 break-words font-display text-2xl">{skill.name}</p>
                <div className="space-y-1 text-sm">
                  {hasShowcase && <Link href="#showcase" className="block py-2 text-secondary hover:text-[#006b4f]">Gallery</Link>}
                  <Link href="#overview" className="block py-2 text-secondary hover:text-[#006b4f]"><Text id="overview" /></Link>
                  <Link href="#install-options" className="block py-2 text-secondary hover:text-[#006b4f]"><ProfileText id={source.canOfferInstall && !safety.blocked ? 'useAgent' : 'reviewSource'} /></Link>
                  <Link href="#source-trust" className="block py-2 text-secondary hover:text-[#006b4f]"><ProfileText id="sourceTrust" /></Link>
                  <Link href="#agent-access" className="block py-2 text-secondary hover:text-[#006b4f]"><ProfileText id="agentAccess" /></Link>
                  <Link href="#related-skills" className="block py-2 text-secondary hover:text-[#006b4f]"><Text id="relatedSkills" /></Link>
                  <Link href="#creator-tools" className="block py-2 text-secondary hover:text-[#006b4f]"><ProfileText id="creatorTools" /></Link>
                </div>
                <div className="mt-5 border-t border-border pt-5 text-xs leading-relaxed text-secondary"><ProfileText id={sourceNote} /></div>
              </nav>
            </aside>
          </div>
        </main>
        <SiteFooter />
      </div>
    </I18nProvider>
  )
}
