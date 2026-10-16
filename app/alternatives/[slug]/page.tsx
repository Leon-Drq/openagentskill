import type { Metadata } from 'next'
import { cache } from 'react'
import { getAlternativeCandidates, rankAlternatives } from '@/lib/skills/alternatives'
import Link from '@/components/crawl-link'
import { notFound, permanentRedirect } from 'next/navigation'
import { InstallCommand } from '@/components/install-command'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import { getSkillBySlugOrFallbackStrict } from '@/lib/skill-fallbacks'
import { getSkillTrustProfile } from '@/lib/trust'

export const revalidate = 900
const getTarget = cache((slug: string) => getSkillBySlugOrFallbackStrict(slug, 900))

export function generateStaticParams() {
  return []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const skill = await getTarget(slug)
  if (!skill) return { title: 'Alternatives Not Found' }

  return {
    title: `${skill.name} Alternatives for AI Agents`,
    description: `Compare ${skill.name} with similar AI agent skills ranked by quality, trust, GitHub adoption, maintenance, and install readiness.`,
    alternates: {
      canonical: `https://www.openagentskill.com/alternatives/${skill.slug}`,
    },
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title: `${skill.name} Alternatives - OpenAgentSkill`,
      description: `Find production-ready alternatives to ${skill.name} for AI agent workflows.`,
      url: `https://www.openagentskill.com/alternatives/${skill.slug}`,
      type: 'website',
    },
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function AlternativesPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const target = await getTarget(slug)
  if (!target) notFound()

  if (slug !== target.slug) {
    permanentRedirect(`/alternatives/${target.slug}`)
  }

  const alternatives = rankAlternatives(target, await getAlternativeCandidates(), 16)
  const targetQuality = getSkillQualityProfile(target)
  const targetTrust = getSkillTrustProfile(target)
  const compareHref = `/compare?skills=${encodeURIComponent([target.slug, ...alternatives.slice(0, 3).map((item) => item.skill.slug)].join(','))}`

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${target.name} alternatives`,
    description: `Similar AI agent skills to ${target.name}`,
    url: `https://www.openagentskill.com/alternatives/${target.slug}`,
    mainEntity: alternatives.slice(0, 10).map((item, index) => ({
      '@type': 'SoftwareApplication',
      position: index + 1,
      name: item.skill.name,
      url: `https://www.openagentskill.com/skills/${item.skill.slug}`,
      applicationCategory: item.skill.category,
    })),
  }

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-secondary">
          <Link href="/skills" className="hover:text-foreground">Skills</Link>
          <span>/</span>
          <Link href={`/skills/${target.slug}`} className="hover:text-foreground">{target.name}</Link>
          <span>/</span>
          <span className="text-foreground">Alternatives</span>
        </nav>

        <section className="grid gap-10 border-b border-border pb-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Alternatives</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
              {target.name} alternatives for AI agents.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
              Compare similar skills by workflow fit, trust score, quality, GitHub adoption, maintenance, and install readiness.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {alternatives.length > 0 && (
                <Link
                  href={compareHref}
                  className="border border-foreground bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
                >
                  Compare shortlist
                </Link>
              )}
              <Link
                href={`/skills/${target.slug}`}
                className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                View {target.name}
              </Link>
            </div>
          </div>

          <div className="border border-border bg-card p-5">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Current skill</p>
            <h2 className="font-display text-2xl font-semibold">{target.name}</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">{target.description}</p>
            <div className="mt-5 grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-3">
                <div className="font-mono text-xl">{targetQuality.score}</div>
                <div className="mt-1 text-xs text-secondary">Quality</div>
              </div>
              <div className="bg-background p-3">
                <div className="font-mono text-xl">{targetTrust.score}</div>
                <div className="mt-1 text-xs text-secondary">Trust</div>
              </div>
              <div className="bg-background p-3">
                <div className="font-mono text-xl">{formatCompactNumber(target.github_stars || 0)}</div>
                <div className="mt-1 text-xs text-secondary">Stars</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10">
          {alternatives.length === 0 ? (
            <div className="border border-border p-8">
              <h2 className="font-display text-2xl font-semibold">No strong alternatives found yet.</h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                The indexer may need more skills in this category before a useful shortlist appears.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {alternatives.map((item, index) => {
                const skill = item.skill
                const { quality, trust, platforms } = item

                return (
                  <article key={skill.slug} className="grid gap-5 py-7 lg:grid-cols-[auto_1fr_280px]">
                    <div className="font-mono text-2xl text-secondary tabular-nums">#{index + 1}</div>
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Link href={`/skills/${skill.slug}`} className="min-w-0">
                          <h2 className="font-display text-2xl font-semibold leading-tight hover:text-secondary">
                            {skill.name}
                          </h2>
                        </Link>
                        <span className="border border-border px-2 py-0.5 text-xs font-mono text-secondary">
                          Similarity {Math.round(item.score)}
                        </span>
                        <span className="border border-border px-2 py-0.5 text-xs font-mono text-secondary">
                          Trust {trust.score}
                        </span>
                        <span className="border border-border px-2 py-0.5 text-xs font-mono text-secondary">
                          {quality.label} {quality.score}
                        </span>
                      </div>
                      <p className="max-w-3xl text-sm leading-relaxed text-secondary">{skill.description}</p>
                      <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono text-secondary">
                        <span>{formatCompactNumber(skill.github_stars || 0)} stars</span>
                        <span>{formatDate(skill.github_last_pushed_at || skill.updated_at)} push</span>
                        <span>{skill.category}</span>
                        {platforms.slice(0, 2).map((platform) => <span key={platform}>{platform}</span>)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <InstallCommand
                        command={item.installCommand}
                        skillSlug={skill.slug}
                        compact
                      />
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="border-t border-border py-10">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">How to choose</p>
              <h2 className="font-display text-2xl font-semibold">When should you switch?</h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                Use an alternative when it has a clearer install path, higher trust score, fresher maintenance, or better platform
                fit for your current agent stack. Keep {target.name} if it already passes your workflow test and repository review.
              </p>
            </div>
            <div className="border border-border p-5">
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Next step</p>
              <h3 className="font-display text-xl font-semibold">Compare top candidates side by side</h3>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                Open the compare page, test the install commands in a sandbox, and check each repository before using a skill in production.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
