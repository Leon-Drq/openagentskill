import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InstallCommand } from '@/components/install-command'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAgentTaskBySlug } from '@/lib/agent-tasks'
import { getAgentProvenProfile } from '@/lib/agent-proven'
import { convertSkillRecordToManifest, getAgentOutcomeStatsMap, getAllSkills } from '@/lib/db/skills'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import { getSkillCluster, SKILL_CLUSTERS } from '@/lib/seo/skill-clusters'
import { getSkillTrustProfile } from '@/lib/trust'
import { getUseCaseBySlug, selectSkillsForUseCase } from '@/lib/use-cases'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://www.openagentskill.com'

export function generateStaticParams() {
  return SKILL_CLUSTERS.map((cluster) => ({ slug: cluster.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const cluster = getSkillCluster(slug)
  if (!cluster) return { title: 'AI Agent Skill Cluster Not Found' }

  return {
    title: cluster.metaTitle,
    description: cluster.description,
    alternates: {
      canonical: `${BASE_URL}${cluster.path}`,
    },
    openGraph: {
      title: `${cluster.title} - OpenAgentSkill`,
      description: cluster.description,
      url: `${BASE_URL}${cluster.path}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: cluster.metaTitle,
      description: cluster.description,
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

export default async function AiAgentSkillClusterPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cluster = getSkillCluster(slug)
  if (!cluster) notFound()

  const [skills, useCase, outcomeStatsMap] = await Promise.all([
    getAllSkills('quality', undefined, 1200).catch(() => []),
    Promise.resolve(getUseCaseBySlug(cluster.useCaseSlug)),
    getAgentOutcomeStatsMap().catch((): Awaited<ReturnType<typeof getAgentOutcomeStatsMap>> => ({})),
  ])

  const rankedSkills = useCase ? selectSkillsForUseCase(skills, useCase, 16) : []
  const topSkills = rankedSkills.slice(0, 6)
  const matchedTasks = cluster.taskSlugs
    .map((taskSlug) => getAgentTaskBySlug(taskSlug))
    .filter(Boolean)
  const totalStars = rankedSkills.reduce((sum, skill) => sum + Number(skill.github_stars || 0), 0)
  const resolvePrompt = useCase?.heroPrompt || `Find the best reusable skill for ${cluster.primaryKeyword}.`

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: cluster.metaTitle,
        headline: cluster.title,
        description: cluster.description,
        url: `${BASE_URL}${cluster.path}`,
        keywords: [cluster.primaryKeyword, cluster.useCaseSlug, ...cluster.agentUseCases],
        mainEntity: rankedSkills.slice(0, 10).map((skill, index) => ({
          '@type': 'SoftwareApplication',
          position: index + 1,
          name: skill.name,
          description: skill.description,
          url: `${BASE_URL}/skills/${skill.slug}`,
          applicationCategory: skill.category,
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Math.max(1, Math.min(5, Number(skill.rating || 4.6))),
            ratingCount: Math.max(1, Number(skill.review_count || skill.github_stars || 1)),
          },
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: cluster.faq.map((entry) => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: entry.answer,
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'AI Agent Skills', item: `${BASE_URL}/ai-agent-skills` },
          { '@type': 'ListItem', position: 3, name: cluster.title, item: `${BASE_URL}${cluster.path}` },
        ],
      },
    ],
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden border-b border-border px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="brand-grain pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative mx-auto max-w-6xl">
            <nav className="mb-10 flex flex-wrap items-center gap-2 text-sm text-secondary">
              <Link href="/ai-agent-skills" className="hover:text-foreground">
                AI Agent Skills
              </Link>
              <span>/</span>
              <span className="text-foreground">{cluster.eyebrow}</span>
            </nav>

            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <p className="mb-5 font-mono text-xs uppercase tracking-[0.24em] text-secondary">
                  {cluster.eyebrow}
                </p>
                <h1 className="max-w-4xl text-balance font-display text-4xl font-normal leading-[0.98] sm:text-5xl lg:text-7xl">
                  {cluster.title}
                </h1>
                <p className="mt-6 max-w-3xl text-pretty text-lg leading-relaxed text-secondary sm:text-xl">
                  {cluster.description}
                </p>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-secondary">
                  Built for {cluster.searchIntent.charAt(0).toLowerCase() + cluster.searchIntent.slice(1)}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/api/agent/resolve?task=${encodeURIComponent(resolvePrompt)}&agent=codex&max_risk=medium&format=text`}
                    prefetch={false}
                    className="border border-foreground bg-foreground px-5 py-3 text-center text-sm font-semibold text-background transition-opacity hover:opacity-85"
                  >
                    Resolve via agent API
                  </Link>
                  <Link
                    href={`/skills?useCase=${encodeURIComponent(cluster.useCaseSlug)}&sort=quality`}
                    className="border border-border bg-card px-5 py-3 text-center text-sm font-semibold transition-colors hover:border-foreground"
                  >
                    Browse matching skills
                  </Link>
                </div>
              </div>

              <div className="grid gap-px border border-border bg-border text-center sm:grid-cols-2">
                <div className="bg-background p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">Matched</p>
                  <p className="mt-3 font-display text-3xl font-normal">{rankedSkills.length}</p>
                </div>
                <div className="bg-background p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">Stars</p>
                  <p className="mt-3 font-display text-3xl font-normal">{formatCompactNumber(totalStars)}</p>
                </div>
                {cluster.proof.slice(0, 2).map((item) => (
                  <div key={item.label} className="bg-background p-5">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">{item.label}</p>
                    <p className="mt-3 font-display text-3xl font-normal">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                Agent jobs
              </p>
              <h2 className="font-display text-3xl font-normal leading-tight sm:text-4xl">
                Start from a real workflow, not a keyword.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-secondary sm:text-base">
                These pages are built for high-intent search and for agents that need a structured shortlist with install commands, trust signals, audit links, and real outcome evidence before installing third-party code.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {cluster.agentUseCases.map((item, index) => (
                <div key={item} className="border border-border bg-card p-5">
                  <p className="font-mono text-xs text-secondary">{String(index + 1).padStart(2, '0')}</p>
                  <p className="mt-3 text-sm leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {matchedTasks.length > 0 && (
          <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
            <div className="mx-auto max-w-6xl">
              <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                    Task routes
                  </p>
                  <h2 className="font-display text-3xl font-normal leading-tight sm:text-4xl">
                    Task pages agents can call.
                  </h2>
                </div>
                <Link href="/tasks" className="text-sm text-secondary underline underline-offset-4 hover:text-foreground">
                  View all tasks
                </Link>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {matchedTasks.map((task) => task && (
                  <Link
                    key={task.slug}
                    href={`/tasks/${task.slug}`}
                    className="group flex min-h-[220px] flex-col justify-between border border-border bg-card p-5 transition-colors hover:border-foreground"
                  >
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-secondary">
                        {task.shortTitle}
                      </p>
                      <h3 className="mt-4 font-display text-2xl font-normal leading-tight group-hover:text-secondary">
                        {task.title}
                      </h3>
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-secondary">
                        {task.intent}
                      </p>
                    </div>
                    <span className="mt-6 text-xs font-semibold text-emerald-800 group-hover:text-foreground">
                      Open task
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                  Ranked shortlist
                </p>
                <h2 className="font-display text-3xl font-normal leading-tight sm:text-4xl">
                  High-signal skills to inspect first.
                </h2>
              </div>
              <Link
                href={`/best/${cluster.useCaseSlug}`}
                className="text-sm text-secondary underline underline-offset-4 hover:text-foreground"
              >
                Open best list
              </Link>
            </div>

            {topSkills.length === 0 ? (
              <div className="border border-border bg-card p-8">
                <h3 className="font-display text-2xl font-normal">No strong matches yet.</h3>
                <p className="mt-3 text-sm leading-relaxed text-secondary">
                  The GitHub discovery pipeline is still expanding this scenario.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {topSkills.map((skill, index) => {
	                  const manifest = convertSkillRecordToManifest(skill)
	                  const outcomeStats = outcomeStatsMap[skill.slug] || null
	                  const quality = getSkillQualityProfile(skill, outcomeStats)
	                  const trust = getSkillTrustProfile(skill, false, null, outcomeStats)
	                  const proven = getAgentProvenProfile(outcomeStats)

                  return (
                    <article key={skill.slug} className="min-w-0 border border-border bg-card p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-secondary">#{String(index + 1).padStart(2, '0')}</p>
                          <Link href={`/skills/${skill.slug}`} className="group mt-2 block min-w-0">
                            <h3 className="text-balance font-display text-2xl font-normal leading-tight group-hover:text-secondary">
                              {skill.name}
                            </h3>
                          </Link>
                        </div>
                        <span className="shrink-0 border border-border px-2.5 py-1 font-mono text-xs text-secondary">
                          {formatCompactNumber(skill.github_stars || 0)} stars
                        </span>
                      </div>
                      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-secondary">
                        {skill.description}
                      </p>
	                      <div className="mt-5 grid grid-cols-3 gap-px border border-border bg-border text-center">
	                        <div className="bg-background p-3">
	                          <p className="font-mono text-lg">{quality.score}</p>
	                          <p className="mt-1 text-[10px] uppercase text-secondary">Quality</p>
	                        </div>
                        <div className="bg-background p-3">
                          <p className="font-mono text-lg">{trust.score}</p>
                          <p className="mt-1 text-[10px] uppercase text-secondary">Trust</p>
	                        </div>
	                        <div className="bg-background p-3">
	                          <p className="font-mono text-lg">{proven.metrics.totalOutcomes > 0 ? proven.score : '—'}</p>
	                          <p className="mt-1 text-[10px] uppercase text-secondary">Proven</p>
	                        </div>
	                      </div>
	                      <div className="mt-5 flex flex-wrap gap-3 text-xs font-mono text-secondary">
	                        <span>{skill.category}</span>
	                        <span>{formatDate(skill.github_last_pushed_at || skill.updated_at)} push</span>
	                        <span>{skill.license || 'Unknown license'}</span>
	                        <span>{proven.label}</span>
	                      </div>
                      <div className="mt-5 min-w-0">
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
          </div>
        </section>

        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                Evaluation
              </p>
              <h2 className="font-display text-3xl font-normal leading-tight sm:text-4xl">
                How to choose the right skill.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {cluster.evaluationSignals.map((signal) => (
                <div key={signal} className="border border-border bg-card p-5">
                  <p className="text-sm leading-relaxed">{signal}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
              Questions
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {cluster.faq.map((entry) => (
                <article key={entry.question} className="border border-border bg-card p-5">
                  <h2 className="font-display text-xl font-normal leading-tight">{entry.question}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{entry.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-2">
            {cluster.related.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border border-border bg-card px-3 py-2 text-xs font-semibold text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
