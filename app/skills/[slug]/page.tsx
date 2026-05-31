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
import { InstallCommand } from '@/components/install-command'
import { SaveSkillButton } from '@/components/save-skill-button'
import { SkillActionLink } from '@/components/skill-action-link'
import { SkillEventTracker } from '@/components/skill-event-tracker'
import { SkillFeedbackPanel } from '@/components/skill-feedback-panel'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getStacksForSkill } from '@/lib/collections'
import { getSkillDecisionProfile } from '@/lib/decision'
import { getSkillQualityProfile, getPlatformHints } from '@/lib/quality'
import { getUseCasesForSkill } from '@/lib/use-cases'

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
    url: `${pageUrl}/opengraph-image`,
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
          url: `${pageUrl}/twitter-image`,
          alt: imageAlt,
        },
      ],
    },
    alternates: {
      canonical: pageUrl,
    },
  }
}

// Trust level based on review status
function TrustBadge({ verified, score }: { verified: boolean; score?: number }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1.5 border border-foreground px-3 py-1 text-xs font-mono">
        VERIFIED
      </span>
    )
  }
  if (score && score >= 80) {
    return (
      <span className="inline-flex items-center gap-1.5 border border-border px-3 py-1 text-xs font-mono text-secondary">
        AI REVIEWED
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 border border-border px-3 py-1 text-xs font-mono text-secondary">
      COMMUNITY
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
  const compareHref = `/compare?skills=${encodeURIComponent([skill.slug, ...relatedSkills.slice(0, 3).map((rs) => rs.slug)].join(','))}`

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
    },
    downloadUrl: skill.technical.repository,
    codeRepository: skill.technical.repository,
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
                <div className="pt-2">
                  <TrustBadge verified={skill.verified} score={aiScore} />
                </div>
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
              </div>
            </div>

            {/* Install */}
            <div className="mb-10">
              <InstallCommand
                command={skill.technical.installCommand || `npx skills add ${skill.slug}`}
                skillSlug={skill.slug}
              />
            </div>

            {decisionProfile && (
              <section className="mb-10 border border-border p-5">
                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Decision summary</p>
                    <h2 className="font-display text-2xl font-semibold">
                      {decisionProfile.readinessLabel} for {decisionProfile.primaryFit}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
                      {decisionProfile.recommendation}
                    </p>
                  </div>
                  <div className="border border-border px-4 py-3 text-center">
                    <div className="font-mono text-3xl font-semibold">{decisionProfile.readinessScore}</div>
                    <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Readiness</div>
                  </div>
                </div>
                <div className="grid gap-px border border-border bg-border md:grid-cols-3">
                  <div className="bg-background p-4">
                    <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Best for</p>
                    <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                      {decisionProfile.bestFor.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="bg-background p-4">
                    <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Not ideal for</p>
                    <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                      {decisionProfile.notIdealFor.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="bg-background p-4">
                    <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Risk notes</p>
                    <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                      {decisionProfile.riskNotes.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {qualityProfile && (
              <section className="mb-10 border border-border p-5">
                <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Quality profile</p>
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
                      <div className="text-xs uppercase tracking-widest text-secondary">{signal.label}</div>
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
                    <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Workflow fit</p>
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
                      <p className="text-xs uppercase tracking-widest text-secondary">{useCase.eyebrow}</p>
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
                    <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Stack fit</p>
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
                      <p className="text-xs uppercase tracking-widest text-secondary">{stack.eyebrow}</p>
                      <h3 className="mt-2 font-display text-lg font-semibold">{stack.shortTitle}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-secondary">{stack.description}</p>
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

              <ClaimSkillPanel
                skillSlug={skill.slug}
                repository={skill.technical.repository}
                approvedClaim={approvedClaim ? {
                  github_username: approvedClaim.github_username,
                  evidence_url: approvedClaim.evidence_url,
                } : null}
              />

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

              {/* Trust info */}
              <div className="border border-border p-5">
                <h3 className="font-display text-lg font-semibold mb-3">Trust & Safety</h3>
                <ul className="space-y-2 text-xs text-secondary">
                  <li className="flex items-center gap-2">
                    <span className="w-4 text-center">—</span>
                    Open source (public GitHub repo)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 text-center">—</span>
                    AI static analysis passed
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 text-center">—</span>
                    License: {skill.technical.license}
                  </li>
                  {skill.verified && (
                    <li className="flex items-center gap-2">
                      <span className="w-4 text-center">—</span>
                      Manually verified by team
                    </li>
                  )}
                  {approvedClaim && (
                    <li className="flex items-center gap-2">
                      <span className="w-4 text-center">—</span>
                      Owner claim approved for @{approvedClaim.github_username}
                    </li>
                  )}
                </ul>
              </div>

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
