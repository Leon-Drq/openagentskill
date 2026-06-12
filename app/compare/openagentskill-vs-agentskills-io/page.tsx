import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'OpenAgentSkill vs AgentSkills.io | AI Agent Skill Registry Comparison',
  description:
    'Compare OpenAgentSkill and AgentSkills.io for AI agent skill discovery, registry APIs, rankings, install handoffs, and agent-readable metadata.',
  alternates: {
    canonical: 'https://www.openagentskill.com/compare/openagentskill-vs-agentskills-io',
  },
  openGraph: {
    title: 'OpenAgentSkill vs AgentSkills.io',
    description: 'A practical comparison of AI agent skill documentation and registry infrastructure.',
    url: 'https://www.openagentskill.com/compare/openagentskill-vs-agentskills-io',
    type: 'article',
  },
}

const comparisonRows = [
  {
    signal: 'Core idea',
    openAgentSkill: 'A searchable registry and install layer that helps agents discover, compare, and use reusable skills.',
    agentSkills: 'A strong conceptual and documentation hub around the Agent Skills format and ecosystem.',
  },
  {
    signal: 'Primary user',
    openAgentSkill: 'Agents and builders who need ranked skill shortlists for a concrete task.',
    agentSkills: 'Humans learning the specification, concepts, and examples around agent skills.',
  },
  {
    signal: 'Agent API',
    openAgentSkill: 'Registry endpoints for search, recommendation, manifest, install handoff, audits, packs, and rankings.',
    agentSkills: 'Documentation-first browsing and reference material.',
  },
  {
    signal: 'Evaluation model',
    openAgentSkill: 'GitHub stars, freshness, quality score, trust checks, audit warnings, use-case fit, and install readiness.',
    agentSkills: 'Useful ecosystem context, but less focused on side-by-side decision scoring.',
  },
  {
    signal: 'Best for',
    openAgentSkill: 'Task-to-skill selection, SEO landing pages, agent-readable metadata, and install workflow handoff.',
    agentSkills: 'Understanding what Agent Skills are and why the format matters.',
  },
  {
    signal: 'Positioning',
    openAgentSkill: 'npm for AI Agent Skills: discover, compare, install, and compose skills automatically.',
    agentSkills: 'A reference destination for the skill concept and examples.',
  },
]

export default async function OpenAgentSkillVsAgentSkillsIoPage() {
  const skills = await getAllSkills('quality').catch(() => [])
  const totalStars = skills.reduce((sum, skill) => sum + Number(skill.github_stars || 0), 0)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'OpenAgentSkill vs AgentSkills.io',
    description: metadata.description,
    url: 'https://www.openagentskill.com/compare/openagentskill-vs-agentskills-io',
    publisher: {
      '@type': 'Organization',
      name: 'OpenAgentSkill',
      url: 'https://www.openagentskill.com',
    },
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="relative -mx-4 overflow-hidden border-b border-border px-4 pb-10 pt-2 sm:-mx-6 sm:px-6">
          <div className="brand-grain pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="mb-5 font-mono text-xs uppercase tracking-[0.24em] text-secondary">Comparison</p>
              <h1 className="max-w-4xl font-display text-4xl font-normal leading-[0.98] text-balance md:text-6xl">
                OpenAgentSkill vs AgentSkills.io.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-secondary">
                AgentSkills.io is a useful reference for the skill concept. OpenAgentSkill is built as the registry layer:
                agents can query, rank, compare, and install skills for real tasks.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/api/registry"
                  className="border border-foreground bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
                >
                  Open Registry API
                </Link>
                <Link
                  href="/use-cases"
                  className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                >
                  Browse use cases
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{formatCompactNumber(skills.length)}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Skills</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{formatCompactNumber(totalStars)}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Stars</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">API</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Registry</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[840px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="w-44 p-4 text-xs uppercase tracking-widest text-secondary">Signal</th>
                  <th className="p-4 font-display text-xl font-semibold">OpenAgentSkill</th>
                  <th className="p-4 font-display text-xl font-semibold">AgentSkills.io</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comparisonRows.map((row) => (
                  <tr key={row.signal}>
                    <td className="p-4 align-top text-xs uppercase tracking-widest text-secondary">{row.signal}</td>
                    <td className="p-4 align-top leading-relaxed">{row.openAgentSkill}</td>
                    <td className="p-4 align-top leading-relaxed text-secondary">{row.agentSkills}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-3 border-y border-border py-10 md:grid-cols-3">
          <Link href="/api-docs" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Registry</p>
            <h2 className="font-display text-xl font-semibold">Agent-readable APIs</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              Search, recommend, fetch manifests, and return install handoffs.
            </p>
          </Link>
          <Link href="/compare/openagentskill-vs-skills-sh" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Compare</p>
            <h2 className="font-display text-xl font-semibold">OpenAgentSkill vs skills.sh</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              Compare registry discovery with CLI-centered distribution.
            </p>
          </Link>
          <Link href="/best" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">SEO</p>
            <h2 className="font-display text-xl font-semibold">Best skill lists</h2>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              Turn task intent into ranked, installable shortlists.
            </p>
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
