import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Braces, Github, SearchCheck, ShieldCheck } from 'lucide-react'
import {
  MarketingButtonLink,
  MarketingFeatureGrid,
  MarketingHero,
  MarketingPageShell,
} from '@/components/marketing-page'

const SITE_URL = 'https://www.openagentskill.com'

export const metadata: Metadata = {
  title: 'About OpenAgentSkill',
  description:
    'OpenAgentSkill is an open registry, trust layer, and recommendation API that helps AI agents discover, compare, audit, install, and evaluate reusable skills.',
  alternates: {
    canonical: `${SITE_URL}/openagentskill`,
  },
  openGraph: {
    title: 'About OpenAgentSkill',
    description:
      'The public identity, product contract, research sources, and official links for OpenAgentSkill.',
    url: `${SITE_URL}/openagentskill`,
    type: 'website',
  },
}

const officialLinks = [
  {
    label: 'Website',
    value: 'openagentskill.com',
    href: SITE_URL,
  },
  {
    label: 'GitHub',
    value: 'Leon-Drq/openagentskill',
    href: 'https://github.com/Leon-Drq/openagentskill',
  },
  {
    label: 'X',
    value: '@openagentskill',
    href: 'https://x.com/openagentskill',
  },
  {
    label: 'Machine identity',
    value: '.well-known/openagentskill.json',
    href: '/.well-known/openagentskill.json',
  },
]

const productContract = [
  {
    label: 'Resolve',
    title: 'Describe the job, not a package name',
    copy: 'The Resolve API classifies task intent and returns a primary skill, alternatives, fit evidence, and a policy decision.',
  },
  {
    label: 'Review',
    title: 'Inspect trust before installation',
    copy: 'Public audit pages expose maintenance, license, documentation, install safety, permission, and repository signals.',
  },
  {
    label: 'Report',
    title: 'Learn from the real agent run',
    copy: 'Outcome reports record success, failure, setup friction, risk blocks, relevance, and output quality for future rankings.',
  },
]

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${SITE_URL}/openagentskill#about`,
    url: `${SITE_URL}/openagentskill`,
    name: 'About OpenAgentSkill',
    description:
      'Official facts, product contract, research sources, and links for OpenAgentSkill.',
    mainEntity: {
      '@id': `${SITE_URL}/#organization`,
    },
    isPartOf: {
      '@id': `${SITE_URL}/#website`,
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'OpenAgentSkill',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'About',
        item: `${SITE_URL}/openagentskill`,
      },
    ],
  },
]

export default function OpenAgentSkillPage() {
  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Official entity profile"
        title="OpenAgentSkill, in one citable page."
        description={
          <>
            OpenAgentSkill is an open registry, trust layer, and recommendation API for reusable AI agent skills. It
            helps agents find a task-fit skill, review risk, prepare an install handoff, and report what happened after
            a real run.
          </>
        }
        actions={
          <>
            <MarketingButtonLink href="/resolve" variant="primary">
              Resolve a task
            </MarketingButtonLink>
            <MarketingButtonLink href="https://github.com/Leon-Drq/openagentskill" target="_blank" rel="noopener noreferrer">
              <Github className="mr-2 h-4 w-4" aria-hidden="true" />
              View GitHub
            </MarketingButtonLink>
          </>
        }
        aside={
          <div className="overflow-hidden rounded-[8px] border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">Canonical definition</p>
            </div>
            <p className="p-5 font-display text-2xl font-normal leading-snug">
              The decision and install layer between an agent task and a reusable skill.
            </p>
          </div>
        }
      />

      <section className="border-b border-border bg-card/35">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <MarketingFeatureGrid items={productContract} />
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Official identity</p>
            <h2 className="mt-3 font-display text-3xl font-normal leading-tight">One spelling. One canonical domain.</h2>
            <p className="mt-4 text-sm leading-6 text-secondary">
              Use <strong className="font-semibold text-foreground">OpenAgentSkill</strong> as the product and
              organization name. Use the canonical website below when citing the registry, API, audits, or research.
            </p>
          </div>

          <dl className="overflow-hidden rounded-[8px] border border-border bg-card">
            {officialLinks.map((item) => (
              <div
                key={item.label}
                className="grid gap-2 border-b border-border px-5 py-4 last:border-b-0 sm:grid-cols-[150px_1fr] sm:items-center"
              >
                <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-secondary">{item.label}</dt>
                <dd className="min-w-0">
                  <a
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-flex max-w-full items-center gap-1.5 break-all text-sm font-semibold underline decoration-border underline-offset-4 hover:decoration-foreground"
                  >
                    {item.value}
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-b border-border bg-[#fbfaf7]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-5 md:grid-cols-3">
            <Link href="/api-docs" className="group rounded-[8px] border border-border bg-background p-5 transition-colors hover:border-foreground/40">
              <Braces className="h-5 w-5 text-[#006b4f]" aria-hidden="true" />
              <h2 className="mt-5 font-display text-2xl font-normal">Public API contract</h2>
              <p className="mt-3 text-sm leading-6 text-secondary">Resolve, audit, manifest, install, outcome, and ranking endpoints.</p>
            </Link>
            <Link href="/reports/state-of-agent-skills-2026" className="group rounded-[8px] border border-border bg-background p-5 transition-colors hover:border-foreground/40">
              <SearchCheck className="h-5 w-5 text-[#006b4f]" aria-hidden="true" />
              <h2 className="mt-5 font-display text-2xl font-normal">Original ecosystem data</h2>
              <p className="mt-3 text-sm leading-6 text-secondary">A transparent report with methodology, JSON, CSV, and skill-level evidence.</p>
            </Link>
            <Link href="/safety" className="group rounded-[8px] border border-border bg-background p-5 transition-colors hover:border-foreground/40">
              <ShieldCheck className="h-5 w-5 text-[#006b4f]" aria-hidden="true" />
              <h2 className="mt-5 font-display text-2xl font-normal">Trust boundaries</h2>
              <p className="mt-3 text-sm leading-6 text-secondary">Scores support decisions; source review and sandboxed execution remain necessary.</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Suggested citation</p>
            <h2 className="mt-3 font-display text-3xl font-normal leading-tight">A stable description for articles and AI answers.</h2>
          </div>
          <blockquote className="rounded-[8px] border border-border bg-card p-6 text-base leading-7 text-secondary">
            “OpenAgentSkill is an open registry, trust layer, and recommendation API for reusable AI agent skills. It
            helps agents discover, compare, audit, install, and evaluate skills before and after a real task.”
            <footer className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
              OpenAgentSkill · {SITE_URL}
            </footer>
          </blockquote>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl rounded-[8px] border border-border bg-card p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Transparent limitation</p>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-secondary">
            OpenAgentSkill indexes third-party repositories. A listing, Trust Score, or audit is decision support, not
            a warranty. Candidate listings are not equivalent to verified maintainer claims or Agent Proven evidence.
            Review source code, permissions, dependencies, and license terms before production installation.
          </p>
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
