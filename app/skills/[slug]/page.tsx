import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSkillBySlug } from '@/lib/mock-data'
import { AgentSkillManifest } from '@/lib/types'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const skill = getSkillBySlug(params.slug)

  if (!skill) {
    return {
      title: 'Skill Not Found',
    }
  }

  return {
    title: `${skill.name} - Open Agent Skill`,
    description: skill.description,
    openGraph: {
      title: skill.name,
      description: skill.description,
      type: 'article',
    },
  }
}

export default function SkillDetailPage({ params }: { params: { slug: string } }) {
  const skill = getSkillBySlug(params.slug)

  if (!skill) {
    notFound()
  }

  // Generate JSON-LD structured data for agents
  const structuredData: AgentSkillManifest = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: skill.name,
    description: skill.description,
    applicationCategory: skill.category,
    offers: {
      '@type': 'Offer',
      price: skill.pricing.price?.toString() || '0',
      priceCurrency: skill.pricing.currency || 'USD',
    },
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
      {/* JSON-LD for SEO and Agent parsing */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-baseline justify-between">
            <Link href="/" className="text-2xl font-display font-bold text-foreground">
              {'Open Agent Skill'}
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/skills" className="text-secondary hover:text-foreground">
                {'Browse'}
              </Link>
              <Link href="/docs" className="text-secondary hover:text-foreground">
                {'Documentation'}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-secondary">
          <Link href="/skills" className="hover:text-foreground">
            {'Skills'}
          </Link>
          {' / '}
          <span className="text-foreground">{skill.name}</span>
        </nav>

        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-display text-5xl font-bold text-foreground mb-4 leading-tight">
                {skill.name}
              </h1>
              <p className="text-xl italic text-secondary leading-relaxed">
                {skill.tagline}
              </p>
            </div>
            {skill.verified && (
              <span className="border border-foreground px-4 py-2 text-sm font-mono shrink-0">
                {'✓ VERIFIED'}
              </span>
            )}
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap gap-6 border-y border-border py-6 text-sm">
            <div>
              <span className="text-secondary">{'Downloads'}</span>
              <span className="ml-2 font-mono font-semibold">
                {skill.stats.downloads.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-secondary">{'Stars'}</span>
              <span className="ml-2 font-mono font-semibold">
                {'★ '}{skill.stats.stars.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-secondary">{'Rating'}</span>
              <span className="ml-2 font-mono font-semibold">
                {skill.stats.rating}/5 ({skill.stats.reviewCount} reviews)
              </span>
            </div>
            <div>
              <span className="text-secondary">{'Used by'}</span>
              <span className="ml-2 font-mono font-semibold">
                {skill.stats.usedBy.toLocaleString()} agents
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Description */}
            <section className="mb-12">
              <h2 className="font-display text-3xl font-semibold mb-6">{'Overview'}</h2>
              <div className="prose-custom space-y-4 text-lg leading-relaxed">
                {skill.longDescription.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="text-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {/* Compatibility */}
            <section className="mb-12">
              <h2 className="font-display text-3xl font-semibold mb-6">{'Compatibility'}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {skill.compatibility.map((compat) => (
                  <div key={compat.platform} className="border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-mono font-semibold">{compat.platform}</h3>
                      <span
                        className={`text-xs font-mono ${
                          compat.status === 'full'
                            ? 'text-foreground'
                            : compat.status === 'partial'
                            ? 'text-secondary'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {compat.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-secondary">{compat.version}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Technical Details */}
            <section className="mb-12">
              <h2 className="font-display text-3xl font-semibold mb-6">{'Technical Details'}</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="border-b border-border pb-2">
                  <dt className="text-sm text-secondary mb-1">{'Version'}</dt>
                  <dd className="font-mono">{skill.technical.version}</dd>
                </div>
                <div className="border-b border-border pb-2">
                  <dt className="text-sm text-secondary mb-1">{'License'}</dt>
                  <dd className="font-mono">{skill.technical.license}</dd>
                </div>
                <div className="border-b border-border pb-2">
                  <dt className="text-sm text-secondary mb-1">{'Size'}</dt>
                  <dd className="font-mono">{skill.technical.size}</dd>
                </div>
                <div className="border-b border-border pb-2">
                  <dt className="text-sm text-secondary mb-1">{'Last Updated'}</dt>
                  <dd className="font-mono">{skill.technical.lastUpdated}</dd>
                </div>
              </dl>

              <div className="mt-6">
                <h3 className="text-sm text-secondary mb-2">{'Languages'}</h3>
                <div className="flex flex-wrap gap-2">
                  {skill.technical.language.map((lang) => (
                    <span key={lang} className="border border-border px-3 py-1 font-mono text-sm">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm text-secondary mb-2">{'Frameworks'}</h3>
                <div className="flex flex-wrap gap-2">
                  {skill.technical.frameworks.map((framework) => (
                    <span key={framework} className="border border-border px-3 py-1 font-mono text-sm">
                      {framework}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Installation */}
              <div className="border border-border bg-card p-6">
                <h3 className="font-display text-xl font-semibold mb-4">{'Install'}</h3>
                
                {skill.pricing.type === 'free' ? (
                  <p className="text-sm text-secondary mb-4">{'Free and open source'}</p>
                ) : skill.pricing.type === 'freemium' ? (
                  <p className="text-sm text-secondary mb-4">
                    {'Free tier available • '}
                    <span className="font-semibold text-foreground">
                      ${skill.pricing.price}/{skill.pricing.pricingModel === 'subscription' ? 'mo' : 'one-time'}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-foreground mb-4">
                    <span className="font-semibold">
                      ${skill.pricing.price}/{skill.pricing.pricingModel === 'subscription' ? 'mo' : 'one-time'}
                    </span>
                  </p>
                )}

                <div className="space-y-3">
                  {skill.technical.repository && (
                    <a
                      href={skill.technical.repository}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full border border-foreground bg-foreground py-3 text-center text-sm font-semibold text-background transition-opacity hover:opacity-80"
                    >
                      {'View on GitHub'}
                    </a>
                  )}
                  <a
                    href={skill.technical.documentation}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full border border-border py-3 text-center text-sm font-semibold text-foreground transition-colors hover:border-foreground"
                  >
                    {'Documentation'}
                  </a>
                </div>

                <div className="mt-6 border-t border-border pt-6">
                  <h4 className="text-sm font-semibold mb-3">{'Quick Install'}</h4>
                  <pre className="bg-muted p-3 text-xs font-mono overflow-x-auto">
                    <code>{`pip install oas-${skill.slug}`}</code>
                  </pre>
                </div>
              </div>

              {/* Author */}
              <div className="border border-border bg-card p-6">
                <h3 className="font-display text-xl font-semibold mb-4">{'Author'}</h3>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center border border-border bg-muted font-mono text-xl">
                    {skill.author.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">
                      {skill.author.name}
                      {skill.author.verified && (
                        <span className="ml-2 text-xs font-mono">{'✓'}</span>
                      )}
                    </h4>
                    <p className="text-sm text-secondary">@{skill.author.username}</p>
                    <p className="mt-2 text-sm text-secondary">
                      {skill.author.skillCount} skills • {skill.author.reputation.toLocaleString()} reputation
                    </p>
                  </div>
                </div>
                {skill.author.bio && (
                  <p className="mt-4 text-sm text-secondary leading-relaxed">
                    {skill.author.bio}
                  </p>
                )}
              </div>

              {/* Tags */}
              <div className="border border-border bg-card p-6">
                <h3 className="font-display text-xl font-semibold mb-4">{'Tags'}</h3>
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

      {/* Footer */}
      <footer className="border-t border-border bg-background mt-20">
        <div className="container mx-auto px-6 py-12">
          <p className="text-center text-sm text-secondary">
            {'Open Agent Skill © 2026 • Built with care for the agent community'}
          </p>
        </div>
      </footer>
    </div>
  )
}
