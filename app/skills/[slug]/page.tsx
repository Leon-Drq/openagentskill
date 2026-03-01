import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSkillBySlug, convertSkillRecordToManifest, getRelatedSkills } from '@/lib/db/skills'
import { InstallCommand } from '@/components/install-command'

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
  return {
    title: `${skill.name} — Open Agent Skill`,
    description: skill.description,
    openGraph: {
      title: skill.name,
      description: skill.description,
      type: 'article',
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

export default async function SkillDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const dbSkill = await getSkillBySlug(slug)
  const skill = dbSkill ? convertSkillRecordToManifest(dbSkill) : null
  if (!skill) notFound()

  const relatedSkills = await getRelatedSkills(skill.id, skill.category, 4).catch(() => [])
  const aiScore = dbSkill?.ai_review_score?.score as number | undefined

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

      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-baseline justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-60 transition-opacity">
              <span className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-foreground rounded-full flex items-center justify-center font-display font-bold text-xs">
                O
              </span>
              <span className="text-xl sm:text-2xl font-display font-bold">Open Agent Skill</span>
            </Link>
            <nav className="flex gap-4 sm:gap-6 text-xs sm:text-sm">
              <Link href="/skills" className="text-secondary hover:text-foreground">Browse</Link>
              <Link href="/submit" className="text-secondary hover:text-foreground">Submit</Link>
              <Link href="/docs" className="text-secondary hover:text-foreground">Docs</Link>
            </nav>
          </div>
        </div>
      </header>

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
          <div className="lg:col-span-2">
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
              <div className="flex flex-wrap gap-6 border-y border-border py-4 text-sm font-mono">
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
              </div>
            </div>

            {/* Install */}
            <div className="mb-10">
              <InstallCommand
                command={skill.technical.installCommand || `npx skills add ${skill.slug}`}
                skillSlug={skill.slug}
              />
            </div>

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
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-5">
              {/* Install card */}
              <div className="border border-border p-5">
                <h3 className="font-display text-lg font-semibold mb-3">Install</h3>
                <p className="text-xs text-secondary mb-4">Free and open source</p>
                <div className="space-y-2">
                  {skill.technical.repository && (
                    <a
                      href={skill.technical.repository}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full border border-foreground bg-foreground py-2.5 text-center text-sm font-semibold text-background hover:opacity-80 transition-opacity"
                    >
                      View on GitHub
                    </a>
                  )}
                  <a
                    href={skill.technical.documentation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full border border-border py-2.5 text-center text-sm text-foreground hover:border-foreground transition-colors"
                  >
                    Documentation
                  </a>
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

      <footer className="border-t border-border mt-20">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p className="text-center text-sm text-secondary">
            Open Agent Skill © 2026 · Built with care for the agent community
          </p>
        </div>
      </footer>
    </div>
  )
}
