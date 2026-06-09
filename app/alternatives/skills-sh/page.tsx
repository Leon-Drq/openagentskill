import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export const metadata: Metadata = {
  title: 'Best skills.sh Alternatives for AI Agent Skill Discovery',
  description:
    'Compare skills.sh alternatives for discovering, ranking, evaluating, and installing AI agent skills. See where OpenAgentSkill fits.',
  alternates: {
    canonical: 'https://www.openagentskill.com/alternatives/skills-sh',
  },
  openGraph: {
    title: 'skills.sh Alternatives - OpenAgentSkill',
    description: 'A practical guide to AI agent skill directories, rankings, trust checks, and discovery workflows.',
    url: 'https://www.openagentskill.com/alternatives/skills-sh',
    type: 'website',
  },
}

const alternatives = [
  {
    name: 'OpenAgentSkill',
    href: '/',
    bestFor: 'Search-driven discovery, best-of lists, alternatives, official pages, and trust/quality evaluation.',
    limitation: 'It complements CLI install telemetry rather than replacing every package-manager workflow.',
  },
  {
    name: 'skills.sh',
    href: 'https://www.skills.sh/',
    bestFor: 'CLI-centered skill distribution, install-count leaderboards, official maker pages, and README badges.',
    limitation: 'Less focused on task-specific decision pages and side-by-side replacement analysis.',
  },
  {
    name: 'AgentSkills.io',
    href: 'https://agentskills.io/',
    bestFor: 'Understanding the Agent Skills specification and conceptual documentation.',
    limitation: 'More documentation-oriented than growth-ranking or decision-intelligence oriented.',
  },
  {
    name: 'SkillPad',
    href: 'https://skillpad.dev/',
    bestFor: 'Visual browsing and lightweight skill management workflows.',
    limitation: 'Less focused on search-scale comparison pages and trust-scored rankings.',
  },
]

export default function SkillsShAlternativesPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'skills.sh Alternatives',
    description: metadata.description,
    url: 'https://www.openagentskill.com/alternatives/skills-sh',
    mainEntity: alternatives.map((item, index) => ({
      '@type': 'SoftwareApplication',
      position: index + 1,
      name: item.name,
      url: item.href,
      applicationCategory: 'AI agent skill discovery',
    })),
  }

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="border-b border-border pb-10">
          <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Alternatives</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
            Best skills.sh alternatives for agent skill discovery.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
            If skills.sh is the CLI-centered package and leaderboard layer, OpenAgentSkill is the search and decision
            layer: compare options, inspect trust, browse official creators, and find skills by agent or workflow.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/compare/openagentskill-vs-skills-sh"
              className="border border-foreground bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
            >
              Compare OpenAgentSkill vs skills.sh
            </Link>
            <Link
              href="/best"
              className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
            >
              Browse best skill lists
            </Link>
          </div>
        </section>

        <section className="py-10">
          <div className="divide-y divide-border border-y border-border">
            {alternatives.map((item, index) => {
              const external = item.href.startsWith('https://')
              const content = (
                <article className="grid gap-5 py-7 lg:grid-cols-[auto_1fr_240px]">
                  <div className="font-mono text-2xl text-secondary tabular-nums">#{index + 1}</div>
                  <div>
                    <h2 className="font-display text-2xl font-semibold">{item.name}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-secondary">{item.bestFor}</p>
                    <p className="mt-3 text-sm leading-relaxed">Tradeoff: {item.limitation}</p>
                  </div>
                  <div className="flex items-start lg:justify-end">
                    <span className="border border-border px-3 py-1 font-mono text-xs text-secondary">
                      {item.name === 'OpenAgentSkill' ? 'Recommended' : external ? 'External' : 'Directory'}
                    </span>
                  </div>
                </article>
              )

              return external ? (
                <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer" className="block hover:bg-muted/30">
                  {content}
                </a>
              ) : (
                <Link key={item.name} href={item.href} className="block hover:bg-muted/30">
                  {content}
                </Link>
              )
            })}
          </div>
        </section>

        <section className="grid gap-3 border-y border-border py-10 md:grid-cols-3">
          <Link href="/trending" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Trending</p>
            <h2 className="font-display text-xl font-semibold">Activity-ranked skills</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">Find skills gaining evaluation intent.</p>
          </Link>
          <Link href="/official" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Official</p>
            <h2 className="font-display text-xl font-semibold">Maker pages</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">Browse recognized ecosystem creators.</p>
          </Link>
          <Link href="/agents" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Agents</p>
            <h2 className="font-display text-xl font-semibold">Claude, Codex, Cursor</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">Choose skills by the agent you use.</p>
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
