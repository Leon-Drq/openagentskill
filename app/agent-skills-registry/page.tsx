import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills } from '@/lib/db/skills'

const BASE_URL = 'https://www.openagentskill.com'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Agent Skills Registry & Recommendation API',
  description:
    'OpenAgentSkill is npm-style discovery for AI agent skills: a registry, audit layer, and recommendation API that helps agents find and install the right skill automatically.',
  alternates: {
    canonical: `${BASE_URL}/agent-skills-registry`,
  },
  openGraph: {
    title: 'AI Agent Skills Registry & Recommendation API',
    description:
      'npm-style discovery for AI agent skills: search, compare, audit, and recommend the right skill automatically.',
    url: `${BASE_URL}/agent-skills-registry`,
    type: 'website',
  },
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}K`
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

export default async function AgentSkillsRegistryPage() {
  const skills = await getAllSkills('quality').catch(() => [])
  const topSkills = skills.slice(0, 5)

  const faq = [
    {
      question: 'Is OpenAgentSkill only a directory?',
      answer:
        'No. The directory is the human-facing surface. The core product is an agent-facing registry and recommendation API that helps agents choose skills from a task description.',
    },
    {
      question: 'Why compare OpenAgentSkill to npm?',
      answer:
        'npm gives developers a searchable package registry. OpenAgentSkill applies the same idea to AI agent skills: discover a reusable capability, inspect signals, then install it into a workflow.',
    },
    {
      question: 'Can agents call OpenAgentSkill directly?',
      answer:
        'Yes. Agents and apps can call /api/agent/recommend and /api/agent/skills to retrieve ranked skill recommendations and install commands.',
    },
  ]

  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  const apiData = {
    '@context': 'https://schema.org',
    '@type': 'WebAPI',
    name: 'OpenAgentSkill Recommendation API',
    url: `${BASE_URL}/agent-skills-registry`,
    endpointUrl: `${BASE_URL}/api/agent/recommend`,
    documentation: `${BASE_URL}/api-docs`,
    description: 'Recommendation API for helping AI agents find and install the right reusable skill automatically.',
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 text-xs uppercase tracking-widest text-secondary">AI Agent Skills Registry</p>
            <h1 className="max-w-4xl text-balance font-display text-4xl font-bold leading-tight sm:text-6xl">
              npm-style discovery for AI agent skills.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-secondary sm:text-xl">
              Let your AI agent find and install the right skill automatically with a registry, audit layer, and recommendation API.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/api-docs"
                className="border border-foreground bg-foreground px-5 py-3 text-center text-sm font-semibold text-background transition-opacity hover:opacity-85"
              >
                View API docs
              </Link>
              <Link
                href="/skills"
                className="border border-border px-5 py-3 text-center text-sm font-semibold transition-colors hover:border-foreground"
              >
                Browse registry
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Recommendation API</p>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Turn a task into an installable skill shortlist.</h2>
              <p className="mt-4 text-sm leading-relaxed text-secondary">
                Instead of manually browsing a directory, an agent can describe what it needs and receive ranked skills with install commands, repositories, use cases, readiness notes, and risk signals.
              </p>
            </div>
            <div className="overflow-hidden border border-border bg-card">
              <div className="border-b border-border bg-foreground px-4 py-3 font-mono text-xs text-background">
                GET /api/agent/recommend
              </div>
              <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-secondary sm:text-sm">
{`curl "https://www.openagentskill.com/api/agent/recommend?task=scrape+websites+and+extract+tables&limit=4"`}
              </pre>
            </div>
          </div>
        </section>

        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-px border border-border bg-border md:grid-cols-4">
              {[
                ['Registry', `${formatCompact(skills.length)}+ indexed skills with repository and install metadata.`],
                ['Audit', 'Trust, quality, maintenance, and risk signals before installation.'],
                ['Recommend', 'Task-based ranking for agents and agent-building apps.'],
                ['Install', 'npm-style install commands and repository paths for real workflows.'],
              ].map(([title, copy]) => (
                <div key={title} className="bg-background p-5">
                  <h2 className="font-display text-lg font-semibold">{title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Registry examples</p>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">Skills agents can discover from the registry</h2>
              </div>
              <Link href="/agent-skills-directory" className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
                Open directory page
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              {topSkills.map((skill) => (
                <Link
                  key={skill.slug}
                  href={`/skills/${skill.slug}`}
                  className="border border-border bg-card p-4 transition-colors hover:border-foreground"
                >
                  <h3 className="font-display text-lg font-semibold">{skill.name}</h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-secondary">{skill.description}</p>
                  <p className="mt-4 font-mono text-xs text-secondary">{formatCompact(skill.github_stars || 0)} stars</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-4 md:grid-cols-3">
              {faq.map((item) => (
                <div key={item.question} className="border border-border bg-card p-5">
                  <h2 className="font-display text-lg font-semibold">{item.question}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(apiData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
      />
    </div>
  )
}
