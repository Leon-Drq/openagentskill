import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills, type SkillRecord } from '@/lib/db/skills'

const BASE_URL = 'https://www.openagentskill.com'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Agent Skills Directory for Codex, Claude Code, and Cursor',
  description:
    'Browse a searchable AI agent skills directory with quality, trust, audit, GitHub adoption, and install signals for Codex, Claude Code, Cursor, and other agent workflows.',
  alternates: {
    canonical: `${BASE_URL}/agent-skills-directory`,
  },
  openGraph: {
    title: 'AI Agent Skills Directory for Codex, Claude Code, and Cursor',
    description:
      'Browse reliable AI agent skills with quality, trust, audit, GitHub adoption, and install signals.',
    url: `${BASE_URL}/agent-skills-directory`,
    type: 'website',
  },
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}K`
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

function getInstallCommand(skill: SkillRecord) {
  return skill.install_command || `npx skills add ${skill.github_repo}`
}

export default async function AgentSkillsDirectoryPage() {
  const skills = await getAllSkills('quality').catch(() => [])
  const topSkills = skills.slice(0, 12)
  const categories = Array.from(new Set(skills.map((skill) => skill.category).filter(Boolean))).slice(0, 12)

  const itemListData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'AI Agent Skills Directory',
    url: `${BASE_URL}/agent-skills-directory`,
    numberOfItems: topSkills.length,
    itemListElement: topSkills.map((skill, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${BASE_URL}/skills/${skill.slug}`,
      name: skill.name,
      description: skill.description,
    })),
  }

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'AI Agent Skills Directory', item: `${BASE_URL}/agent-skills-directory` },
    ],
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 text-xs uppercase tracking-widest text-secondary">AI Agent Skills Directory</p>
            <h1 className="max-w-4xl text-balance font-display text-4xl font-bold leading-tight sm:text-6xl">
              Browse reusable skills for AI agents.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-secondary sm:text-xl">
              OpenAgentSkill indexes reusable skills for Codex, Claude Code, Cursor, browser automation, data workflows, RAG, coding agents, and more.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/skills"
                className="border border-foreground bg-foreground px-5 py-3 text-center text-sm font-semibold text-background transition-opacity hover:opacity-85"
              >
                Search all skills
              </Link>
              <Link
                href="/audits"
                className="border border-border px-5 py-3 text-center text-sm font-semibold transition-colors hover:border-foreground"
              >
                View audit reports
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-border px-4 py-10 sm:px-6">
          <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-3">
            <div className="border border-border bg-card p-5">
              <p className="font-display text-3xl font-bold">{formatCompact(skills.length)}+</p>
              <p className="mt-2 text-sm text-secondary">indexed skill candidates</p>
            </div>
            <div className="border border-border bg-card p-5">
              <p className="font-display text-3xl font-bold">Trust</p>
              <p className="mt-2 text-sm text-secondary">quality, audit, and maintenance signals</p>
            </div>
            <div className="border border-border bg-card p-5">
              <p className="font-display text-3xl font-bold">API</p>
              <p className="mt-2 text-sm text-secondary">agent-facing recommendation endpoint</p>
            </div>
          </div>
        </section>

        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Top skills</p>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">High-signal agent skills to start with</h2>
              </div>
              <Link href="/skills" className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
                Open full directory
              </Link>
            </div>

            <div className="divide-y divide-border border border-border">
              {topSkills.map((skill, index) => (
                <Link
                  key={skill.slug}
                  href={`/skills/${skill.slug}`}
                  className="grid gap-4 p-4 transition-colors hover:bg-muted/40 sm:grid-cols-[3rem_1fr_auto] sm:items-center sm:p-5"
                >
                  <span className="font-mono text-lg text-secondary">#{index + 1}</span>
                  <div className="min-w-0">
                    <h3 className="font-display text-xl font-semibold">{skill.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-secondary">{skill.description}</p>
                    <div className="mt-3 break-all border border-border bg-background px-2 py-1.5 font-mono text-xs text-secondary">
                      {getInstallCommand(skill)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-mono text-secondary sm:justify-end">
                    <span className="border border-border px-2 py-1">{formatCompact(skill.github_stars || 0)} stars</span>
                    <span className="border border-border px-2 py-1">{Math.round(Number(skill.quality_score || 0))}/100 quality</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Categories</p>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Browse by agent workflow</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Link
                  key={category}
                  href={`/skills?category=${encodeURIComponent(category)}`}
                  className="border border-border px-3 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
    </div>
  )
}
