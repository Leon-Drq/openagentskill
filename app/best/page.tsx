import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills, getSkillStats, type SkillAgentStats } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import { rankSkillsForDefinition, type RankingDefinition } from '@/lib/rankings'
import { BEST_SKILL_PAGES, FEATURED_BEST_PAGES } from '@/lib/seo/growth-pages'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Top AI Agent Skills by Use Case',
  description:
    'Browse top AI agent skills for web scraping, coding agents, RAG, browser automation, data analysis, GitHub automation, and other production workflows.',
  alternates: {
    canonical: 'https://www.openagentskill.com/best',
  },
  openGraph: {
    title: 'Top AI Agent Skills by Use Case - OpenAgentSkill',
    description: 'Scenario-specific shortlists ranked by quality, trust, GitHub adoption, and freshness.',
    url: 'https://www.openagentskill.com/best',
    type: 'website',
  },
}

function toRanking(page: (typeof BEST_SKILL_PAGES)[number]): RankingDefinition {
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

export default async function BestSkillsPage() {
  const [skills, statsMap] = await Promise.all([
    getAllSkills('quality').catch(() => []),
    getSkillStats().catch((): Record<string, SkillAgentStats> => ({})),
  ])
  const totalStars = skills.reduce((sum, skill) => sum + Number(skill.github_stars || 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="border-b border-border pb-10">
          <p className="mb-4 text-xs uppercase text-secondary">Top agent skills</p>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
                Top AI agent skills for real workflows.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
                Start from the job your agent needs to do. Each shortlist combines quality, trust, GitHub adoption,
                freshness, and install readiness so builders can move from search intent to a tested skill faster.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/skills?trust=production"
                  className="border border-foreground bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
                >
                  Browse production skills
                </Link>
                <Link
                  href="/api-docs#agent-resolve"
                  className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                >
                  Resolve by API
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{BEST_SKILL_PAGES.length}</div>
                <div className="mt-1 text-xs uppercase text-secondary">Use cases</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{skills.length.toLocaleString()}</div>
                <div className="mt-1 text-xs uppercase text-secondary">Skills</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{formatCompactNumber(totalStars)}</div>
                <div className="mt-1 text-xs uppercase text-secondary">Stars</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-b border-border py-10 lg:grid-cols-3">
          {FEATURED_BEST_PAGES.slice(0, 3).map((page) => {
            const topSkills = rankSkillsForDefinition(skills, toRanking(page), statsMap, 3)

            return (
              <Link
                key={page.slug}
                href={`/best/${page.slug}`}
                className="group flex min-h-[300px] flex-col justify-between border border-border bg-card p-5 transition-colors hover:border-foreground"
              >
                <div>
                  <p className="mb-3 text-xs uppercase text-secondary">{page.eyebrow}</p>
                  <h2 className="font-display text-2xl font-semibold leading-tight group-hover:text-secondary">
                    {page.shortTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{page.searchIntent}</p>
                </div>
                <div className="mt-8">
                  <p className="mb-3 text-xs uppercase text-secondary">Leading picks</p>
                  <div className="space-y-2">
                    {topSkills.map((item) => (
                      <div key={item.skill.slug} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate">{item.skill.name}</span>
                        <span className="shrink-0 font-mono text-xs text-secondary">{item.badge}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
        </section>

        <section className="py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase text-secondary">All best-of lists</p>
              <h2 className="font-display text-2xl font-semibold">Choose by workflow intent</h2>
            </div>
            <Link href="/skills?trust=production" className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
              Browse production candidates
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {BEST_SKILL_PAGES.map((page) => {
              const topSkill = rankSkillsForDefinition(skills, toRanking(page), statsMap, 1)[0]

              return (
                <Link
                  key={page.slug}
                  href={`/best/${page.slug}`}
                  className="border border-border bg-card p-5 transition-colors hover:border-foreground"
                >
                  <p className="text-xs uppercase text-secondary">{page.eyebrow}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold">{page.shortTitle}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-secondary">{page.description}</p>
                  {topSkill && (
                    <p className="mt-5 border-t border-border pt-4 text-xs text-secondary">
                      Leading pick: <span className="text-foreground">{topSkill.skill.name}</span>
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
