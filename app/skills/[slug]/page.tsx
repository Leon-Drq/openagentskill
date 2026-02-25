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

export default async function SkillDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const dbSkill = await getSkillBySlug(slug)
  const skill = dbSkill ? convertSkillRecordToManifest(dbSkill) : null

  if (!skill) notFound()

  const relatedSkills = await getRelatedSkills(skill.id, skill.category, 3).catch(() => [])

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: skill.name,
    description: skill.description,
    applicationCategory: skill.category,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: skill.stats.rating,
      reviewCount: skill.stats.reviewCount,
    },
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

      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-baseline justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-60 transition-opacity">
              <span className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-foreground rounded-full flex items-center justify-center font-display font-bold text-xs sm:text-sm">O</span>
              <span className="text-xl sm:text-2xl font-display font-bold text-foreground">Open Agent Skill</span>
            </Link>
            <nav className="flex gap-3 sm:gap-6 text-xs sm:text-sm">
              <Link href="/skills" className="text-secondary hover:text-foreground">Browse</Link>
              <Link href="/docs" className="text-secondary hover:text-foreground">Docs</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <nav className="mb-6 sm:mb-8 text-xs sm:text-sm text-secondary">
          <Link href="/skills" className="hover:text-foreground">Skills</Link>
          {' / '}
          <span className="text-foreground">{skill.name}</span>
        </nav>

        <div className="mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4 leading-tight">
                {skill.name}
              </h1>
              <p className="text-base sm:text-lg lg:text-xl italic text-secondary leading-relaxed">
                {skill.tagline}
              </p>
            </div>
            {skill.verified && (
              <span className="border border-foreground px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-mono shrink-0 w-fit">
                ✓ VERIFIED
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-6 border-y border-border py-4 sm:py-6 text-xs sm:text-sm">
            <div>
              <span className="text-secondary block sm:inline">Downloads </span>
              <span className="font-mono font-semibold">{(skill.stats.downloads / 1000).toFixed(1)}K</span>
            </div>
            <div>
              <span className="text-secondary block sm:inline">Stars </span>
              <span className="font-mono font-semibold">★ {(skill.stats.stars / 1000).toFixed(1)}K</span>
            </div>
            <div>
              <span className="text-secondary block sm:inline">Rating </span>
              <span className="font-mono font-semibold">{skill.stats.rating}/5</span>
            </div>
            <div>
              <span className="text-secondary block sm:inline">Used by </span>
              <span className="font-mono font-semibold">{(skill.stats.usedBy / 1000).toFixed(1)}K agents</span>
            </div>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <InstallCommand
              command={skill.technical.installCommand || `npx skills add ${skill.slug}`}
              skillSlug={skill.slug}
            />

            <section className="mb-8 sm:mb-12">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">Overview</h2>
              <div className="space-y-4 text-base sm:text-lg leading-relaxed">
                {skill.longDescription.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="text-foreground">{paragraph}</p>
                ))}
              </div>
            </section>

            {skill.compatibility && skill.compatibility.length > 0 && (
              <section className="mb-12">
                <h2 className="font-display text-3xl font-semibold mb-6">Compatibility</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {skill.compatibility.map((compat) => (
                    <div key={compat.platform} className="border border-border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-mono font-semibold">{compat.platform}</h3>
                        <span className="text-xs font-mono text-secondary">{compat.status?.toUpperCase() || 'SUPPORTED'}</span>
                      </div>
                      <p className="text-sm text-secondary">{compat.version || '>=1.0.0'}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mb-12">
              <h2 className="font-display text-3xl font-semibold mb-6">Technical Details</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'Version', value: skill.technical.version },
                  { label: 'License', value: skill.technical.license },
                  { label: 'Size', value: skill.technical.size },
                  { label: 'Last Updated', value: new Date(skill.technical.lastUpdated).toLocaleDateString() },
                ].map(({ label, value }) => (
                  <div key={label} className="border-b border-border pb-2">
                    <dt className="text-sm text-secondary mb-1">{label}</dt>
                    <dd className="font-mono">{value}</dd>
                  </div>
                ))}
              </dl>
              {skill.technical.frameworks.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm text-secondary mb-2">Frameworks</h3>
                  <div className="flex flex-wrap gap-2">
                    {skill.technical.frameworks.map((f) => (
                      <span key={f} className="border border-border px-3 py-1 font-mono text-sm">{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <div className="border border-border p-6">
                <h3 className="font-display text-xl font-semibold mb-4">Install</h3>
                <p className="text-sm text-secondary mb-4">Free and open source</p>
                <div className="space-y-3">
                  {skill.technical.repository && (
                    <a
                      href={skill.technical.repository}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full border border-foreground bg-foreground py-3 text-center text-sm font-semibold text-background hover:opacity-80 transition-opacity"
                    >
                      View on GitHub
                    </a>
                  )}
                  <a
                    href={skill.technical.documentation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full border border-border py-3 text-center text-sm font-semibold text-foreground hover:border-foreground transition-colors"
                  >
                    Documentation
                  </a>
                </div>
              </div>

              <div className="border border-border p-6">
                <h3 className="font-display text-xl font-semibold mb-4">Author</h3>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center border border-border bg-muted font-mono text-xl shrink-0">
                    {skill.author.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold">
                      {skill.author.name}
                      {skill.author.verified && <span className="ml-2 text-xs font-mono">✓</span>}
                    </h4>
                    {skill.author.username && (
                      <p className="text-sm text-secondary">@{skill.author.username}</p>
                    )}
                  </div>
                </div>
              </div>

              {relatedSkills.length > 0 && (
                <div className="border border-border p-6">
                  <h3 className="font-display text-xl font-semibold mb-4">Related Skills</h3>
                  <div className="space-y-3">
                    {relatedSkills.map((rs) => (
                      <Link
                        key={rs.slug}
                        href={`/skills/${rs.slug}`}
                        className="block border-b border-border pb-3 last:border-b-0 last:pb-0 hover:opacity-70 transition-opacity"
                      >
                        <h4 className="font-semibold text-sm">{rs.name}</h4>
                        <p className="text-xs text-secondary mt-1 line-clamp-2">{rs.description}</p>
                        <span className="text-xs font-mono text-secondary mt-1 block">
                          {(rs.github_stars / 1000).toFixed(1)}K stars
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="border border-border p-6">
                <h3 className="font-display text-xl font-semibold mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {skill.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/skills?q=${encodeURIComponent(tag)}`}
                      className="border border-border px-3 py-1 text-sm text-secondary hover:border-foreground hover:text-foreground"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-6 py-12">
          <p className="text-center text-sm text-secondary">
            Open Agent Skill © 2026 • Built with care for the agent community
          </p>
        </div>
      </footer>
    </div>
  )
}
