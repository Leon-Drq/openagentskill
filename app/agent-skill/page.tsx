import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingButtonLink, MarketingHero, MarketingPageShell } from '@/components/marketing-page'
import { USE_CASES } from '@/lib/use-cases'

const BASE_URL = 'https://www.openagentskill.com'

export const metadata: Metadata = {
  title: 'What Is an Agent Skill? Definition, Examples, and Registry',
  description:
    'An agent skill is a reusable capability an AI agent can discover, evaluate, install, and use. Learn how agent skills work and how OpenAgentSkill helps agents find the right skill automatically.',
  alternates: {
    canonical: `${BASE_URL}/agent-skill`,
  },
  openGraph: {
    title: 'What Is an Agent Skill? Definition, Examples, and Registry',
    description:
      'Learn how AI agent skills work, how agents discover and install them, and why a skill registry matters for Codex, Claude Code, Cursor, and other agent workflows.',
    url: `${BASE_URL}/agent-skill`,
    type: 'article',
  },
}

const faq = [
  {
    question: 'What is an agent skill?',
    answer:
      'An agent skill is a reusable capability package that helps an AI agent complete a specific task, such as web scraping, code review, document processing, data analysis, browser automation, or workflow automation.',
  },
  {
    question: 'How is an agent skill different from a normal tool?',
    answer:
      'A normal tool is usually called by a human or hard-coded integration. An agent skill is designed to be discovered, evaluated, installed, and reused by AI agents inside a workflow.',
  },
  {
    question: 'Why does an agent skill registry matter?',
    answer:
      'A registry lets agents search across reusable skills, compare trust and quality signals, inspect audit data, and choose a skill before installing it.',
  },
]

export default function AgentSkillPage() {
  const featuredUseCases = USE_CASES.slice(0, 6)
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'What Is an Agent Skill?',
      description: metadata.description,
      url: `${BASE_URL}/agent-skill`,
      publisher: {
        '@type': 'Organization',
        name: 'OpenAgentSkill',
        url: BASE_URL,
      },
    },
    {
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
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Agent Skill', item: `${BASE_URL}/agent-skill` },
      ],
    },
  ]

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Agent skill definition"
        title="What is an agent skill?"
        description="An agent skill is a reusable capability that an AI agent can discover, evaluate, install, and use to complete a specific workflow."
        actions={
          <>
            <MarketingButtonLink href="/agent-skills-registry" variant="primary">
              Explore the registry
            </MarketingButtonLink>
            <MarketingButtonLink href="/api-docs">
              View the recommendation API
            </MarketingButtonLink>
          </>
        }
      />

        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Core idea</p>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Skills turn agent capability into reusable software.</h2>
            </div>
            <div className="space-y-5 text-base leading-relaxed text-secondary">
              <p>
                A skill can contain instructions, scripts, prompts, examples, metadata, and installation guidance. The useful part is not only the code; it is the reusable decision about how an agent should perform a task.
              </p>
              <p>
                OpenAgentSkill focuses on the registry layer: helping agents and builders find the right skill, compare alternatives, inspect audit signals, and install with a clear command or repository path.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Agent workflow</p>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">How an agent should choose a skill</h2>
            </div>
            <div className="grid gap-px border border-border bg-border md:grid-cols-4">
              {[
                ['Discover', 'Search the registry from a task description or workflow intent.'],
                ['Compare', 'Check quality, GitHub adoption, freshness, platform fit, and alternatives.'],
                ['Audit', 'Review risk notes, trust tier, metadata issues, and installation readiness.'],
                ['Install', 'Copy the install command or repository path and test the skill in one workflow.'],
              ].map(([title, copy]) => (
                <div key={title} className="bg-background p-5">
                  <h3 className="font-display text-lg font-semibold">{title}</h3>
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
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Examples</p>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">Common agent skill categories</h2>
              </div>
              <Link href="/use-cases" className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
                View all use cases
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featuredUseCases.map((useCase) => (
                <Link
                  key={useCase.slug}
                  href={`/use-cases/${useCase.slug}`}
                  className="border border-border bg-card p-5 transition-colors hover:border-foreground"
                >
                  <p className="mb-3 text-xs uppercase tracking-widest text-secondary">{useCase.eyebrow}</p>
                  <h3 className="font-display text-xl font-semibold">{useCase.shortTitle}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-secondary">{useCase.description}</p>
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
      {structuredData.map((item) => (
        <script
          key={item['@type']}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </MarketingPageShell>
  )
}
