import type { Metadata } from 'next'
import Link from 'next/link'
import {
  MarketingButtonLink,
  MarketingHero,
  MarketingMetricStrip,
  MarketingPageShell,
} from '@/components/marketing-page'
import { AGENT_TASKS, FEATURED_AGENT_TASKS } from '@/lib/agent-tasks'
import { withTimeout } from '@/lib/async'
import { getAllSkills } from '@/lib/db/skills'
import {
  HIGH_STAR_DISCOVERY_DOMAINS,
  HIGH_STAR_QUERY_POOL_SIZE,
  HIGH_STAR_SKILL_COVERAGE_TARGET,
} from '@/lib/indexer/high-star-import'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Agent Entry - OpenAgentSkill',
  description:
    'Agent-first entry point for OpenAgentSkill: resolve tasks, browse task pages, read the manifest, fetch OpenAPI, and inspect the GitHub discovery pipeline.',
  alternates: {
    canonical: 'https://www.openagentskill.com/agent',
  },
  openGraph: {
    title: 'Agent Entry - OpenAgentSkill',
    description: 'The agent-readable map for resolving, auditing, and installing AI agent skills.',
    url: 'https://www.openagentskill.com/agent',
    type: 'website',
  },
}

function endpointRows() {
  return [
    {
      label: 'Resolve task',
      method: 'POST',
      href: '/api/agent/resolve',
      description: 'Task to selected skill, alternatives, policy decision, safety profile, install plan, and install receipt.',
    },
    {
      label: 'Install receipt',
      method: 'GET',
      href: '/api/agent/receipt?task=scrape+pricing+pages&agent=codex&format=text',
      description: 'Stable pre-install record with selected skill, install policy, risk notes, alternatives, and outcome event id.',
    },
    {
      label: 'Integration kit',
      method: 'GET',
      href: '/api/agent/integration-kit',
      description: 'Codex, Claude Code, and Cursor setup templates plus stable Resolve response fields.',
    },
    {
      label: 'Task catalog',
      method: 'GET',
      href: '/api/agent/tasks',
      description: 'Structured task definitions with Resolve API URLs.',
    },
    {
      label: 'Skill detail',
      method: 'GET',
      href: '/api/agent/skills/crawl4ai',
      description: 'Agent-readable skill profile with trust, audit, install targets, and URLs.',
    },
    {
      label: 'Install handoff',
      method: 'GET',
      href: '/api/skills/crawl4ai/install?format=text',
      description: 'Plain text command, agent prompt, and safety checklist.',
    },
    {
      label: 'Manifest',
      method: 'GET',
      href: '/.well-known/agent-manifest.json',
      description: 'Machine-readable site contract for agent discovery.',
    },
    {
      label: 'OpenAPI',
      method: 'GET',
      href: '/openapi.json',
      description: 'API schema for tools and agent runtimes.',
    },
    {
      label: 'IndexNow',
      method: 'POST',
      href: '/api/indexnow/submit',
      description: 'Protected growth automation endpoint for notifying search engines after new skill pages are published.',
    },
  ]
}

export default async function AgentPage() {
  const skills = await withTimeout(
    getAllSkills('quality', undefined, 200),
    1000,
    'agent page skill summary'
  ).catch((error) => {
    console.warn('Agent page skill fallback:', error)
    return CURATED_SKILL_SNAPSHOT
  })
  const topSkills = skills.slice(0, 4)
  const discoveryDomains = HIGH_STAR_DISCOVERY_DOMAINS

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Agent entry"
        title="Let an agent find, trust, and install the right skill."
        description="This page is the low-noise map for agent browsers. Start with a task, resolve the best skill, inspect trust signals, then fetch an install handoff."
        actions={
          <>
            <MarketingButtonLink href="/resolve" variant="primary">
              Resolve a task
            </MarketingButtonLink>
            <MarketingButtonLink
              href="/api/agent/resolve?task=scrape+pricing+pages&agent=codex&max_risk=medium&format=text"
              prefetch={false}
            >
              Try Resolve API
            </MarketingButtonLink>
            <MarketingButtonLink href="/agent/integration-kit">
              Integration Kit
            </MarketingButtonLink>
            <MarketingButtonLink href="/llms.txt" prefetch={false}>
              llms.txt
            </MarketingButtonLink>
          </>
        }
        aside={
          <MarketingMetricStrip
            items={[
              { value: skills.length.toLocaleString(), label: 'Skills' },
              { value: AGENT_TASKS.length, label: 'Tasks' },
              { value: '1h', label: 'GitHub scan' },
              { value: 'Live', label: 'Index ping' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase text-secondary">Recommended flow</p>
            <h2 className="font-display text-2xl font-semibold">How an agent should use this registry</h2>
          </div>
          <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-4">
            {[
              ['01', 'Read /llms.txt'],
              ['02', 'Load Integration Kit'],
              ['03', 'Call Resolve API'],
              ['04', 'Fetch install receipt'],
            ].map(([step, label]) => (
              <div key={step} className="bg-card p-5">
                <p className="font-mono text-xs text-secondary">{step}</p>
                <p className="mt-3 text-sm font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase text-secondary">Task layer</p>
            <h2 className="font-display text-2xl font-semibold">High-intent task routes</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Task pages are designed for agent browsers and search traffic. They include best first install, alternatives, and decision notes.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {FEATURED_AGENT_TASKS.map((task) => (
              <Link key={task.slug} href={`/tasks/${task.slug}`} className="border border-border bg-card p-4 transition-colors hover:border-foreground">
                <p className="text-xs uppercase text-secondary">{task.useCaseSlug}</p>
                <h3 className="mt-2 font-display text-xl font-semibold">{task.shortTitle}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-secondary">{task.intent}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase text-secondary">Agent endpoints</p>
            <h2 className="font-display text-2xl font-semibold">Stable surfaces for tools</h2>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {endpointRows().map((row) => (
              <Link key={row.href} href={row.href} prefetch={false} className="grid gap-3 py-4 transition-colors hover:text-secondary md:grid-cols-[150px_1fr]">
                <div className="flex items-center gap-2">
                  <span className="border border-border px-2 py-1 font-mono text-xs">{row.method}</span>
                  <span className="font-semibold">{row.label}</span>
                </div>
                <div className="min-w-0">
                  <p className="break-all font-mono text-xs text-secondary">{row.href}</p>
                  <p className="mt-1 text-sm leading-relaxed text-secondary">{row.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-8 py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase text-secondary">Auto-discovery</p>
            <h2 className="font-display text-2xl font-semibold">GitHub collection is scaling toward 10k+ skills</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Production cron calls the indexer hourly. It imports high-star, skill-like GitHub projects across scenario groups, excludes MCP-only projects, records runs, refreshes stars, and submits fresh URLs to search indexes.
            </p>
          </div>
          <div>
            <div className="grid gap-px overflow-hidden border border-border bg-border text-center sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-card p-4">
                <div className="font-mono text-2xl">{HIGH_STAR_SKILL_COVERAGE_TARGET.toLocaleString()}+</div>
                <div className="mt-1 text-xs uppercase text-secondary">Coverage target</div>
              </div>
              <div className="bg-card p-4">
                <div className="font-mono text-2xl">{discoveryDomains.length}</div>
                <div className="mt-1 text-xs uppercase text-secondary">Scenario groups</div>
              </div>
              <div className="bg-card p-4">
                <div className="font-mono text-2xl">{HIGH_STAR_QUERY_POOL_SIZE}</div>
                <div className="mt-1 text-xs uppercase text-secondary">GitHub queries</div>
              </div>
              <div className="bg-card p-4">
                <div className="font-mono text-2xl">1h</div>
                <div className="mt-1 text-xs uppercase text-secondary">Import cadence</div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {discoveryDomains.map((domain) => (
                <div key={domain.key} className="border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs uppercase text-secondary">{domain.key}</p>
                      <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{domain.label}</h3>
                    </div>
                    <span className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-secondary">
                      {domain.query_count}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{domain.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Link href="/api/agent/discovery" prefetch={false} className="border border-border bg-card p-5 transition-colors hover:border-foreground">
                <p className="text-xs uppercase text-secondary">Status API</p>
                <h3 className="mt-2 font-display text-xl font-semibold">/api/agent/discovery</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">Public-safe scale plan, coverage matrix, thresholds, and recent run summary.</p>
              </Link>
              <Link href="/api/indexer/run" prefetch={false} className="border border-border bg-card p-5 transition-colors hover:border-foreground">
                <p className="text-xs uppercase text-secondary">Private cron</p>
                <h3 className="mt-2 font-display text-xl font-semibold">/api/indexer/run</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">Requires automation bearer token. Production Vercel Cron runs it every hour.</p>
              </Link>
              <Link href="/api/indexnow/submit" prefetch={false} className="border border-border bg-card p-5 transition-colors hover:border-foreground">
                <p className="text-xs uppercase text-secondary">Index notification</p>
                <h3 className="mt-2 font-display text-xl font-semibold">/api/indexnow/submit</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">Protected endpoint that submits newly published skill URLs and sitemap updates to IndexNow.</p>
              </Link>
            </div>
          </div>
        </section>

        {topSkills.length > 0 && (
          <section className="border-t border-border py-10">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 text-xs uppercase text-secondary">Top registry records</p>
                <h2 className="font-display text-2xl font-semibold">High-signal skills for agent routing</h2>
              </div>
              <Link href="/skills" className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
                Browse all skills
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {topSkills.map((skill) => (
                <Link key={skill.slug} href={`/skills/${skill.slug}`} className="border border-border bg-card p-4 transition-colors hover:border-foreground">
                  <h3 className="font-display text-lg font-semibold">{skill.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-secondary">{skill.description}</p>
                  <p className="mt-4 font-mono text-xs text-secondary">{skill.github_stars.toLocaleString()} stars</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </MarketingPageShell>
  )
}
