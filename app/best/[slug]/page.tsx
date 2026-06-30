import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InstallCommand } from '@/components/install-command'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAgentProvenProfile } from '@/lib/agent-proven'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { convertSkillRecordToManifest, getAgentOutcomeStatsMap, getAllSkills, type SkillOutcomeStats } from '@/lib/db/skills'
import { formatCompactNumber, getPlatformHints, getSkillQualityProfile } from '@/lib/quality'
import {
  getRankingCompareHref,
  rankSkillsForDefinition,
  type RankingDefinition,
} from '@/lib/rankings'
import { BEST_SKILL_PAGES, getBestSkillPage } from '@/lib/seo/growth-pages'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'
import { getSkillTrustProfile } from '@/lib/trust'
import { getUseCaseBySlug, getUseCasesForSkill } from '@/lib/use-cases'

export const dynamic = 'force-dynamic'
const BEST_PAGE_QUERY_TIMEOUT_MS = 2000

export function generateStaticParams() {
  return BEST_SKILL_PAGES.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = getBestSkillPage(slug)
  if (!page) return { title: 'Best Skills Not Found' }

  return {
    title: page.title,
    description: `${page.description} Ranked with OpenAgentSkill quality, trust, GitHub adoption, and maintenance signals.`,
    alternates: {
      canonical: `https://www.openagentskill.com/best/${page.slug}`,
    },
    openGraph: {
      title: `${page.title} - OpenAgentSkill`,
      description: page.description,
      url: `https://www.openagentskill.com/best/${page.slug}`,
      type: 'website',
    },
  }
}

function toRanking(page: NonNullable<ReturnType<typeof getBestSkillPage>>): RankingDefinition {
  return {
    slug: `best-${page.slug}-skills`,
    title: page.title,
    shortTitle: page.shortTitle,
    eyebrow: page.eyebrow,
    description: page.description,
    kind: 'use-case',
    useCaseSlug: page.useCaseSlug,
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

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export default async function BestSkillDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = getBestSkillPage(slug)
  if (!page) notFound()

  const useCase = getUseCaseBySlug(page.useCaseSlug)
  const ranking = toRanking(page)
  const [skills, statsMap] = await Promise.all([
    withTimeout(getAllSkills('quality', undefined, 1200), BEST_PAGE_QUERY_TIMEOUT_MS, 'best skills query')
      .catch(() => CURATED_SKILL_SNAPSHOT),
    withTimeout(getAgentOutcomeStatsMap(), BEST_PAGE_QUERY_TIMEOUT_MS, 'best outcome stats query')
      .catch((): Record<string, SkillOutcomeStats> => ({})),
  ])
  const rankedSkills = rankSkillsForDefinition(skills, ranking, statsMap, 30)
  const compareHref = getRankingCompareHref(rankedSkills)
  const topSkill = rankedSkills[0]?.skill
  const topProven = topSkill ? getAgentProvenProfile(statsMap[topSkill.slug] || null) : null
  const faqEntries = [
    {
      question: `How does OpenAgentSkill rank ${page.shortTitle.toLowerCase()}?`,
      answer:
        'The ranking combines workflow fit, quality score, trust profile, GitHub adoption, maintenance freshness, and whether a clear install path exists.',
    },
    {
      question: 'Should I install the top skill immediately?',
      answer:
        'No. Treat the list as a shortlist, open the skill detail page, inspect the repository and license, then test the install command in a sandbox workflow.',
    },
    {
      question: 'Can my agent consume this ranking through an API?',
      answer:
        `Yes. Use /api/skills/search with the related task or /api/agent/rankings?slug=${ranking.slug} to fetch ranked skill data.`,
    },
  ]

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: page.title,
        description: page.description,
        url: `https://www.openagentskill.com/best/${page.slug}`,
        mainEntity: rankedSkills.slice(0, 10).map((item) => ({
          '@type': 'SoftwareApplication',
          position: item.rank,
          name: item.skill.name,
          url: `https://www.openagentskill.com/skills/${item.skill.slug}`,
          applicationCategory: item.skill.category,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqEntries.map((entry) => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: entry.answer,
          },
        })),
      },
    ],
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
          <Link href="/best" className="hover:text-foreground">Best skills</Link>
          <span>/</span>
          <span className="text-foreground">{page.shortTitle}</span>
        </nav>

        <section className="grid gap-10 border-b border-border pb-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-secondary">{page.eyebrow}</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">{page.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{page.description}</p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary">
              {page.audience} Ranked from the OpenAgentSkill index using quality, trust, freshness, adoption, and install readiness.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {page.primaryKeyword && (
                <span className="border border-border px-2.5 py-1 font-mono text-xs text-secondary">
                  {page.primaryKeyword}
                </span>
              )}
              {page.agentSurface && (
                <span className="border border-border px-2.5 py-1 font-mono text-xs text-secondary">
                  {page.agentSurface}
                </span>
              )}
            </div>
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
                href={`/skills?useCase=${encodeURIComponent(page.useCaseSlug)}&trust=production`}
                className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Filter production candidates
              </Link>
              <Link
                href={`/resolve?task=${encodeURIComponent(page.exampleTasks?.[0] || page.searchIntent)}`}
                className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Resolve this workflow
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px self-end border border-border bg-border text-center sm:grid-cols-4">
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
              <div className="font-mono text-2xl">{topSkill ? getSkillTrustProfile(topSkill, false, null, statsMap[topSkill.slug] || null).score : 0}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Top trust</div>
            </div>
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{topProven && topProven.metrics.totalOutcomes > 0 ? topProven.score : '—'}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Agent proven</div>
            </div>
          </div>
        </section>

        {useCase && (
          <section className="border-b border-border py-10">
            <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Search intent</p>
                <h2 className="font-display text-2xl font-semibold">{page.searchIntent}</h2>
                <p className="mt-3 text-sm leading-relaxed text-secondary">
                  These pages are generated from real registry records. The list below is not a generic article; every row links to a skill profile with install, trust, audit, and risk fields.
                </p>
              </div>
              <div className="grid gap-px bg-border md:grid-cols-3">
                {(page.exampleTasks?.length ? page.exampleTasks : useCase.workflows).slice(0, 3).map((workflow) => (
                  <Link
                    key={workflow}
                    href={`/resolve?task=${encodeURIComponent(workflow)}`}
                    className="bg-background p-5 transition-colors hover:bg-card"
                  >
                    <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Resolve task</p>
                    <p className="font-display text-xl font-semibold">{workflow}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="py-10">
          {rankedSkills.length === 0 ? (
            <div className="border border-border p-8">
              <h2 className="font-display text-2xl font-semibold">No matching skills yet.</h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                The indexer is still expanding this workflow category.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {rankedSkills.map((item) => {
                const skill = item.skill
                const manifest = convertSkillRecordToManifest(skill)
	                const quality = getSkillQualityProfile(skill, statsMap[skill.slug] || null)
	                const trust = getSkillTrustProfile(skill, false, null, statsMap[skill.slug] || null)
	                const proven = getAgentProvenProfile(statsMap[skill.slug] || null)
	                const audit = buildSkillAudit(skill)
                const platforms = [...new Set([...(skill.frameworks || []), ...getPlatformHints(skill)])]
                const skillUseCases = getUseCasesForSkill(skill, 2)
                const scenario =
                  skillUseCases.find((candidate) => candidate.slug === page.useCaseSlug)?.agentTasks[0] ||
                  skillUseCases[0]?.agentTasks[0] ||
                  page.exampleTasks?.[0] ||
                  page.searchIntent
                const installCommand = manifest.technical.installCommand || `npx skills add ${skill.github_repo || skill.slug}`

                return (
                  <article key={skill.slug} className="grid gap-5 py-7 lg:grid-cols-[auto_1fr_280px]">
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
                          Trust {trust.score}
                        </span>
	                        <span className="border border-border px-2 py-0.5 text-xs font-mono text-secondary">
	                          {quality.label} {quality.score}
	                        </span>
	                        <span className="border border-border px-2 py-0.5 text-xs font-mono text-secondary">
	                          Agent Proven {proven.metrics.totalOutcomes > 0 ? proven.score : '—'}
	                        </span>
	                        <span className="border border-border px-2 py-0.5 text-xs font-mono text-secondary">
	                          Audit {audit.audit_score} · {auditRiskLabel(audit.risk_level)}
                        </span>
                      </div>
                      <p className="max-w-3xl text-sm leading-relaxed text-secondary">{skill.description}</p>
                      <p className="mt-3 max-w-3xl text-sm leading-relaxed">{item.reason}</p>
                      <div className="mt-4 border border-border bg-card p-3">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">Best suited scenario</p>
                        <p className="mt-2 text-sm leading-relaxed text-secondary">{scenario}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono text-secondary">
                        <span>{formatCompactNumber(skill.github_stars || 0)} stars</span>
	                        <span>{formatDate(skill.github_last_pushed_at || skill.updated_at)} push</span>
	                        <span>{trust.label}</span>
	                        <span>{proven.label}</span>
	                        {platforms.slice(0, 2).map((platform) => <span key={platform}>{platform}</span>)}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/alternatives/${skill.slug}`}
                          className="border border-border px-2.5 py-1 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
                        >
                          Alternatives
                        </Link>
                        <Link
                          href={`/compare?skills=${encodeURIComponent([skill.slug, ...rankedSkills.filter((row) => row.skill.slug !== skill.slug).slice(0, 3).map((row) => row.skill.slug)].join(','))}`}
                          className="border border-border px-2.5 py-1 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
                        >
                          Compare
                        </Link>
                        <Link
                          href={`/skills/${skill.slug}/audit`}
                          className="border border-border px-2.5 py-1 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
                        >
                          Audit
                        </Link>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <InstallCommand
                        command={installCommand}
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
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Selection method</p>
              <h2 className="font-display text-2xl font-semibold">How this list is ranked</h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
	                OpenAgentSkill scores each candidate against the workflow keywords, then balances fit with GitHub stars,
	                quality signals, trust profile, Agent Proven outcome evidence, maintenance freshness, and whether there is a clear install path.
              </p>
            </div>
            <div className="grid gap-3">
              {faqEntries.map((entry) => (
                <div key={entry.question} className="border border-border bg-card p-5">
                  <h3 className="font-display text-lg font-semibold">{entry.question}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{entry.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
