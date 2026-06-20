import type { Metadata } from 'next'
import Link from 'next/link'
import {
  MarketingButtonLink,
  MarketingHero,
  MarketingMetricStrip,
  MarketingPageShell,
} from '@/components/marketing-page'
import { getAllSkills, getSkillStats, type SkillAgentStats } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import { rankSkillsForDefinition, type RankingDefinition } from '@/lib/rankings'
import { BEST_SKILL_PAGES, FEATURED_BEST_PAGES } from '@/lib/seo/growth-pages'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'

export const dynamic = 'force-dynamic'
const BEST_PAGE_QUERY_TIMEOUT_MS = 2000

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

export default async function BestSkillsPage() {
  const [skills, statsMap] = await Promise.all([
    withTimeout(getAllSkills('quality', undefined, 1200), BEST_PAGE_QUERY_TIMEOUT_MS, 'best skills query')
      .catch(() => CURATED_SKILL_SNAPSHOT),
    withTimeout(getSkillStats(), BEST_PAGE_QUERY_TIMEOUT_MS, 'best stats query')
      .catch((): Record<string, SkillAgentStats> => ({})),
  ])
  const totalStars = skills.reduce((sum, skill) => sum + Number(skill.github_stars || 0), 0)

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Top agent skills"
        title="Top AI agent skills for real workflows."
        description="Start from the job your agent needs to do. Each shortlist combines quality, trust, GitHub adoption, freshness, and install readiness so builders can move from search intent to a tested skill faster."
        actions={
          <>
            <MarketingButtonLink href="/resolve" variant="primary">
              Resolve a task
            </MarketingButtonLink>
            <MarketingButtonLink href="/api-docs#agent-resolve">
              Resolve by API
            </MarketingButtonLink>
          </>
        }
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: BEST_SKILL_PAGES.length, label: 'Use cases' },
              { value: skills.length.toLocaleString(), label: 'Skills' },
              { value: formatCompactNumber(totalStars), label: 'Stars' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
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
      </div>
    </MarketingPageShell>
  )
}
