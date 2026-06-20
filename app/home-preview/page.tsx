import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Braces, Check, PackageCheck, Search, ShieldCheck, Sparkles, Terminal } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { GitHubStarButton } from '@/components/github-star-button'
import { SiteFooter } from '@/components/site-footer'
import { getPlatformStats } from '@/lib/db/activity'
import { getAllSkills, type SkillRecord } from '@/lib/db/skills'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Homepage Preview | OpenAgentSkill',
  description: 'A private preview of a cleaner, agent-first OpenAgentSkill homepage direction.',
  robots: {
    index: false,
    follow: false,
  },
}

const navItems = [
  { href: '#why', label: 'Why' },
  { href: '#registry', label: 'Registry' },
  { href: '#scenarios', label: 'Scenarios' },
  { href: '#compare', label: 'Compare' },
  { href: '#api', label: 'API' },
]

const registrySteps = [
  {
    icon: Search,
    label: 'Task',
    title: 'Describe the work',
    detail: 'review a PR, scrape pricing, analyze filings',
  },
  {
    icon: Braces,
    label: 'Rank',
    title: 'Query the registry',
    detail: 'fit score, freshness, stars, trust, risk',
  },
  {
    icon: ShieldCheck,
    label: 'Review',
    title: 'Inspect the handoff',
    detail: 'manifest, install command, safety notes',
  },
  {
    icon: PackageCheck,
    label: 'Install',
    title: 'Add the right skill',
    detail: 'Codex, Claude Code, Cursor, custom agents',
  },
]

const scenarios = [
  {
    href: '/use-cases/web-scraping',
    label: 'Web scraping',
    task: 'Extract structured data from messy websites.',
    skills: ['Crawl4AI', 'Firecrawl', 'browser automation'],
  },
  {
    href: '/use-cases/finance-quant',
    label: 'Finance / quant',
    task: 'Analyze filings, markets, portfolios, and strategies.',
    skills: ['OpenBB', 'Vectorbt', 'TradingAgents'],
  },
  {
    href: '/use-cases/coding-agents',
    label: 'Coding agents',
    task: 'Review repos, patch code, generate tests, verify UI.',
    skills: ['GitHub', 'Playwright', 'code review'],
  },
  {
    href: '/use-cases/sports-analytics',
    label: 'World Cup analytics',
    task: 'Build football dashboards, xG reports, and scouting flows.',
    skills: ['StatsBomb', 'Soccerdata', 'SoccerNet'],
  },
]

const comparisonRows = [
  {
    feature: 'Built for',
    openagentskill: 'Agents choosing skills automatically',
    skillsSh: 'CLI skill discovery and installs',
    agentSkills: 'Spec and learning docs',
  },
  {
    feature: 'Core loop',
    openagentskill: 'Task -> ranked skill -> manifest -> install',
    skillsSh: 'Browse -> install package',
    agentSkills: 'Learn -> author SKILL.md',
  },
  {
    feature: 'Decision signals',
    openagentskill: 'Fit, quality, freshness, audit, trust, use case',
    skillsSh: 'Directory and package metadata',
    agentSkills: 'Concept and format guidance',
  },
  {
    feature: 'Agent API',
    openagentskill: 'Registry search, recommend, manifest, install',
    skillsSh: 'Install-centric ecosystem',
    agentSkills: 'Documentation-first',
  },
]

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}K`
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

function PreviewHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/82">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/home-preview" className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-75">
          <BrandMark className="h-7 w-7 text-foreground" />
          <span className="font-sans text-base font-semibold tracking-tight sm:text-lg">OpenAgentSkill</span>
          <span className="hidden rounded-[6px] border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-secondary md:inline-flex">
            v0.2 preview
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-secondary lg:flex" aria-label="Preview navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/api-docs"
            className="hidden h-9 items-center rounded-[8px] bg-[#e7ac3f] px-3 text-sm font-semibold text-[#17130b] transition-opacity hover:opacity-85 sm:inline-flex"
          >
            Docs
          </Link>
          <GitHubStarButton />
        </div>
      </div>
    </header>
  )
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return (
    <div className="max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">{eyebrow}</p>
      <h2 className="mt-4 font-display text-3xl font-normal leading-[1.02] text-balance sm:text-5xl">{title}</h2>
      {copy && <p className="mt-4 max-w-2xl text-base leading-7 text-secondary sm:text-lg">{copy}</p>}
    </div>
  )
}

function SkillRow({ skill, index }: { skill: SkillRecord; index: number }) {
  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="grid gap-3 border-b border-border py-4 transition-colors hover:bg-muted/40 sm:grid-cols-[32px_1fr_auto] sm:items-center"
    >
      <span className="font-mono text-sm text-secondary">{String(index + 1).padStart(2, '0')}</span>
      <span className="min-w-0">
        <span className="block font-semibold">{skill.name}</span>
        <span className="mt-1 line-clamp-1 block text-sm text-secondary">{skill.description}</span>
      </span>
      <span className="font-mono text-xs text-secondary">{formatCompact(Number(skill.github_stars || 0))} stars</span>
    </Link>
  )
}

export default async function HomePreviewPage() {
  const [stats, skills] = await Promise.all([
    getPlatformStats().catch(() => ({
      totalSkills: 3000,
      totalDownloads: 146000,
      activePlatforms: 12,
      agentSubmissions: 2600,
    })),
    getAllSkills('quality').catch(() => []),
  ])
  const featuredSkills = skills.slice(0, 5)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PreviewHeader />

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="brand-grain pointer-events-none absolute inset-0 opacity-70" />
          <div className="relative mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-24 lg:pt-28">
            <div className="max-w-5xl pb-16 sm:pb-20 lg:pb-24">
              <p className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-secondary">
                <span className="h-2 w-2 rounded-full bg-[#006b4f]" />
                Agent-native registry
                <span className="text-[#d99a2b]">/</span>
                Open skill infrastructure
              </p>
              <h1 className="mt-8 max-w-5xl font-display text-5xl font-normal leading-[0.92] text-balance sm:text-7xl lg:text-[6.9rem]">
                The skill layer for AI agents.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-secondary sm:text-xl">
                Let your AI agent find, compare, and install the right reusable skill automatically.
                OpenAgentSkill is npm for AI Agent Skills.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/api/registry"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#006b4f] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Open Registry API
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/skills"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-border bg-card px-5 text-sm font-semibold transition-colors hover:border-foreground/40"
                >
                  Browse skills
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div id="registry" className="border-t border-border">
              <div className="grid gap-px border-x border-border bg-border lg:grid-cols-4">
                {registrySteps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <div key={step.label} className="bg-background p-5 sm:p-6">
                      <div className="mb-8 flex items-center justify-between">
                        <span className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">{step.label}</span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-border bg-card">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </div>
                      <h2 className="font-display text-2xl font-normal leading-tight">{step.title}</h2>
                      <p className="mt-3 text-sm leading-6 text-secondary">{step.detail}</p>
                      <p className="mt-6 font-mono text-xs text-secondary">0{index + 1}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px border-x border-border bg-border text-center sm:grid-cols-4">
            {[
              ['Indexed skills', formatCompact(stats.totalSkills)],
              ['Downloads', `${formatCompact(stats.totalDownloads)}+`],
              ['Platforms', formatCompact(stats.activePlatforms)],
              ['Agent submissions', formatCompact(stats.agentSubmissions)],
            ].map(([label, value]) => (
              <div key={label} className="bg-background p-5 sm:p-6">
                <div className="font-mono text-2xl sm:text-3xl">{value}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.16em] text-secondary">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="why" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <SectionHeading
              eyebrow="Why it matters"
              title="A directory helps humans browse. A registry helps agents decide."
              copy="The homepage should make this distinction obvious in seconds. The product is not just a list of skills; it is the decision and install layer behind agent workflows."
            />

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Discover', 'Find skills from a task, not from a category tree.'],
                ['Evaluate', 'Rank by fit, stars, freshness, trust, and risk.'],
                ['Install', 'Return a manifest, command, and agent-safe handoff.'],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-[8px] border border-border bg-card p-5">
                  <Check className="h-4 w-4 text-[#006b4f]" aria-hidden="true" />
                  <h3 className="mt-6 font-display text-2xl font-normal">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-secondary">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="scenarios" className="border-y border-border bg-card/55">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <SectionHeading
                eyebrow="Scenarios"
                title="Start from the work, not the tool."
              />
              <Link href="/use-cases" className="inline-flex items-center gap-2 text-sm font-semibold text-secondary underline underline-offset-4 hover:text-foreground">
                View all use cases
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {scenarios.map((scenario) => (
                <Link
                  key={scenario.href}
                  href={scenario.href}
                  className="rounded-[8px] border border-border bg-background p-5 transition-colors hover:border-foreground/40 sm:p-6"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">{scenario.label}</p>
                  <h3 className="mt-4 text-xl font-semibold">{scenario.task}</h3>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {scenario.skills.map((skill) => (
                      <span key={skill} className="rounded-[6px] border border-border px-2.5 py-1 font-mono text-xs text-secondary">
                        {skill}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr]">
            <SectionHeading
              eyebrow="Featured skills"
              title="Show proof without overwhelming the first screen."
              copy="Instead of putting a long feed near the top, the new homepage can use a compact ranked list as social proof."
            />

            <div className="border-t border-border">
              {featuredSkills.length > 0 ? (
                featuredSkills.map((skill, index) => <SkillRow key={skill.slug} skill={skill} index={index} />)
              ) : (
                <div className="border-b border-border py-4 text-sm text-secondary">Featured skills will appear here.</div>
              )}
            </div>
          </div>
        </section>

        <section id="compare" className="border-y border-border bg-card/55">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
            <SectionHeading
              eyebrow="Compare"
              title="Make the category position explicit."
              copy="A comparison block helps users understand why OpenAgentSkill is more than another directory."
            />

            <div className="mt-10 overflow-x-auto rounded-[8px] border border-border bg-background">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/45">
                    <th className="w-44 p-4 font-mono text-xs uppercase tracking-[0.16em] text-secondary">Feature</th>
                    <th className="p-4 font-semibold">OpenAgentSkill</th>
                    <th className="p-4 font-semibold">skills.sh</th>
                    <th className="p-4 font-semibold">agentskills.io</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {comparisonRows.map((row) => (
                    <tr key={row.feature}>
                      <td className="p-4 font-mono text-xs uppercase tracking-[0.14em] text-secondary">{row.feature}</td>
                      <td className="p-4 leading-6">{row.openagentskill}</td>
                      <td className="p-4 leading-6 text-secondary">{row.skillsSh}</td>
                      <td className="p-4 leading-6 text-secondary">{row.agentSkills}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="api" className="relative overflow-hidden border-b border-border">
          <div className="brand-grain pointer-events-none absolute inset-0 opacity-55" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.85fr_1.15fr]">
            <SectionHeading
              eyebrow="API"
              title="The homepage should point agents to the registry contract."
              copy="Give developers a copyable endpoint early. The API is the thing that separates OpenAgentSkill from a human-only catalog."
            />

            <div className="rounded-[8px] border border-border bg-[#111111] p-4 text-[#f8f7f3] shadow-[0_18px_55px_rgba(29,27,24,0.13)] sm:p-6">
              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-white/60">
                  <Terminal className="h-4 w-4" aria-hidden="true" />
                  Registry request
                </div>
                <Sparkles className="h-4 w-4 text-[#e7ac3f]" aria-hidden="true" />
              </div>
              <pre className="overflow-x-auto font-mono text-xs leading-6 text-white/82 sm:text-sm">
                <code>{`curl "https://www.openagentskill.com/api/registry/recommend?task=analyze+SEC+filings&limit=3"

{
  "selected": "OpenBB",
  "fit": "finance / quant",
  "install": "npx skills add openbb-finance/openbb",
  "trust": "reviewed",
  "next_step": "inspect manifest, then install"
}`}</code>
              </pre>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
