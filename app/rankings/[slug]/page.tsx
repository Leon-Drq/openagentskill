import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InstallCommand } from '@/components/install-command'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import {
  convertSkillRecordToManifest,
  getAgentOutcomeStatsMap,
  getAllSkills,
  getSkillStats,
  type SkillAgentStats,
  type SkillOutcomeStats,
} from '@/lib/db/skills'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import {
  getRankingCompareHref,
  getRankingDefinition,
  getRankingDefinitions,
  rankSkillsForDefinition,
} from '@/lib/rankings'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return getRankingDefinitions().map((ranking) => ({ slug: ranking.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const ranking = getRankingDefinition(slug)
  if (!ranking) return { title: 'Ranking Not Found' }

  return {
    title: ranking.title,
    description: ranking.description,
    alternates: {
      canonical: `https://www.openagentskill.com/rankings/${ranking.slug}`,
    },
    openGraph: {
      title: `${ranking.title} — OpenAgentSkill`,
      description: ranking.description,
      url: `https://www.openagentskill.com/rankings/${ranking.slug}`,
      type: 'website',
    },
  }
}

function formatDate(value: string | null) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function RankingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const ranking = getRankingDefinition(slug)
  if (!ranking) notFound()

  const [skills, statsMap] = await Promise.all([
    getAllSkills('quality', undefined, 1200).catch(() => []),
    ranking.kind === 'agent-usage'
      ? getAgentOutcomeStatsMap().catch((): Record<string, SkillOutcomeStats> => ({}))
      : getSkillStats().catch((): Record<string, SkillAgentStats> => ({})),
  ])
  const rankedSkills = rankSkillsForDefinition(skills, ranking, statsMap, 30)
  const compareHref = getRankingCompareHref(rankedSkills)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: ranking.title,
    description: ranking.description,
    url: `https://www.openagentskill.com/rankings/${ranking.slug}`,
  }

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 flex items-center gap-2 text-sm text-secondary">
          <Link href="/rankings" className="hover:text-foreground">Rankings</Link>
          <span>/</span>
          <span className="text-foreground">{ranking.shortTitle}</span>
        </nav>

        <section className="grid gap-10 border-b border-border pb-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-secondary">{ranking.eyebrow}</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">{ranking.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{ranking.description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              {rankedSkills.length > 1 && (
                <Link
                  href={compareHref}
                  className="border border-foreground bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
                >
                  Compare top 4
                </Link>
              )}
              <Link
                href="/skills?quality=excellent&minStars=500"
                className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Browse excellent skills
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px self-end border border-border bg-border text-center">
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{rankedSkills.length}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Ranked</div>
            </div>
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">
                {formatCompactNumber(rankedSkills.reduce((sum, item) => sum + Number(item.skill.github_stars || 0), 0))}
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Stars</div>
            </div>
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">
                {rankedSkills[0] ? Math.round(getSkillQualityProfile(rankedSkills[0].skill).score) : 0}
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Top score</div>
            </div>
          </div>
        </section>

        <section className="py-10">
          {rankedSkills.length === 0 ? (
            <div className="border border-border p-8">
              <h2 className="font-display text-2xl font-semibold">No skills matched this ranking yet.</h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                The indexer is expanding this area as new high-star skills are discovered.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {rankedSkills.map((item) => {
                const skill = item.skill
                const manifest = convertSkillRecordToManifest(skill)
                const quality = getSkillQualityProfile(skill, statsMap[skill.slug] || null)

                return (
                  <article key={skill.slug} className="grid gap-5 py-7 lg:grid-cols-[auto_1fr_auto]">
                    <div className="font-mono text-2xl text-secondary tabular-nums">#{item.rank}</div>
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Link href={`/skills/${skill.slug}`} className="min-w-0">
                          <h2 className="font-display text-2xl font-semibold leading-tight hover:text-secondary">
                            {skill.name}
                          </h2>
                        </Link>
                        <span className="border border-border px-2 py-0.5 text-xs font-mono text-secondary">
                          {item.badge}
                        </span>
                        <span className="border border-border px-2 py-0.5 text-xs font-mono text-secondary">
                          {quality.label} · {quality.score}
                        </span>
                      </div>
                      <p className="max-w-3xl text-sm leading-relaxed text-secondary">{skill.description}</p>
                      <p className="mt-3 max-w-3xl text-sm leading-relaxed">{item.reason}</p>
                      <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono text-secondary">
                        <span>{formatCompactNumber(skill.github_stars || 0)} stars</span>
                        <span>{formatCompactNumber(skill.github_forks || 0)} forks</span>
                        <span>{formatDate(skill.github_last_pushed_at || skill.updated_at)} push</span>
                        <span>{skill.category}</span>
                      </div>
                    </div>
                    <div className="lg:w-72">
                      <InstallCommand
                        command={manifest.technical.installCommand || `npx skills add ${skill.github_repo}`}
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
      </main>

      <SiteFooter />
    </div>
  )
}
