import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'OpenAgentSkill vs skills.sh | Agent Skill Discovery Comparison',
  description:
    'Compare OpenAgentSkill and skills.sh for discovering, ranking, evaluating, and installing AI agent skills.',
  alternates: {
    canonical: 'https://www.openagentskill.com/compare/openagentskill-vs-skills-sh',
  },
  openGraph: {
    title: 'OpenAgentSkill vs skills.sh',
    description: 'A practical comparison of two AI agent skill discovery models.',
    url: 'https://www.openagentskill.com/compare/openagentskill-vs-skills-sh',
    type: 'article',
  },
}

const comparisonRows = [
  {
    signal: 'Primary job',
    openAgentSkill: 'Find the right skill for a task, inspect quality and trust, compare alternatives, then install.',
    skillsSh: 'Install and discover skills through a CLI-centered leaderboard and package-management flow.',
  },
  {
    signal: 'Ranking model',
    openAgentSkill: 'Quality, trust, GitHub adoption, freshness, use-case fit, alternatives, and OpenAgentSkill activity.',
    skillsSh: 'Install telemetry, trending lists, hot lists, and official ecosystem pages.',
  },
  {
    signal: 'Best for',
    openAgentSkill: 'Search traffic, buyer-style evaluation, “best skills” queries, trust review, and replacement decisions.',
    skillsSh: 'CLI users who already know they want to install a skill package.',
  },
  {
    signal: 'Differentiator',
    openAgentSkill: 'Decision intelligence: why a skill is good, what it is similar to, and where it fits.',
    skillsSh: 'Distribution mechanics: install counts, badges, and the skills CLI ecosystem.',
  },
  {
    signal: 'Growth loop',
    openAgentSkill: 'SEO pages, comparison pages, official pages, README trust badges, and skill detail pages.',
    skillsSh: 'CLI telemetry, install badges, official maker pages, and leaderboard repeat visits.',
  },
]

export default async function OpenAgentSkillVsSkillsShPage() {
  const skills = await getAllSkills('quality').catch(() => [])
  const totalStars = skills.reduce((sum, skill) => sum + Number(skill.github_stars || 0), 0)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'OpenAgentSkill vs skills.sh',
    description: metadata.description,
    url: 'https://www.openagentskill.com/compare/openagentskill-vs-skills-sh',
    publisher: {
      '@type': 'Organization',
      name: 'OpenAgentSkill',
      url: 'https://www.openagentskill.com',
    },
  }

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="border-b border-border pb-10">
          <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Comparison</p>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
                OpenAgentSkill vs skills.sh.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
                skills.sh is strong at CLI distribution and install telemetry. OpenAgentSkill is built as the decision
                layer: best lists, alternatives, trust checks, official makers, and agent-specific shortlists.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{formatCompactNumber(skills.length)}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Indexed</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{formatCompactNumber(totalStars)}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Stars</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">5</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Growth hubs</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="w-44 p-4 text-xs uppercase tracking-widest text-secondary">Signal</th>
                  <th className="p-4 font-display text-xl font-semibold">OpenAgentSkill</th>
                  <th className="p-4 font-display text-xl font-semibold">skills.sh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comparisonRows.map((row) => (
                  <tr key={row.signal}>
                    <td className="p-4 align-top text-xs uppercase tracking-widest text-secondary">{row.signal}</td>
                    <td className="p-4 align-top leading-relaxed">{row.openAgentSkill}</td>
                    <td className="p-4 align-top leading-relaxed text-secondary">{row.skillsSh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-3 border-y border-border py-10 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/best" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Best lists</p>
            <h2 className="font-display text-xl font-semibold">Start from the task</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">Use-case pages for scraping, coding, RAG, QA, and more.</p>
          </Link>
          <Link href="/trending" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Trending</p>
            <h2 className="font-display text-xl font-semibold">Find momentum</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">OpenAgentSkill activity plus trust and quality signals.</p>
          </Link>
          <Link href="/official" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Official</p>
            <h2 className="font-display text-xl font-semibold">Trust the maker</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">Technology-maker pages for recognized skill publishers.</p>
          </Link>
          <Link href="/alternatives/skills-sh" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Alternatives</p>
            <h2 className="font-display text-xl font-semibold">Compare directories</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">See how OpenAgentSkill fits beside skills.sh.</p>
          </Link>
        </section>

        <section className="py-10">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Recommendation</p>
              <h2 className="font-display text-2xl font-semibold">Use both layers, but search with OpenAgentSkill.</h2>
            </div>
            <div className="space-y-4 text-sm leading-relaxed text-secondary">
              <p>
                skills.sh is excellent when the user is already inside the skills CLI ecosystem. OpenAgentSkill is better
                when the user is still deciding what to use, comparing options, or searching Google for a task-specific skill.
              </p>
              <p>
                That is why OpenAgentSkill focuses on pages like “best web scraping skills”, “Crawl4AI alternatives”,
                official maker pages, and agent-specific shortlists. Those pages turn search intent into a practical shortlist.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
