import { Metadata } from 'next'
import {
  MarketingButtonLink,
  MarketingHero,
  MarketingPageShell,
} from '@/components/marketing-page'

export const metadata: Metadata = {
  title: 'OpenAgentSkill CLI - Resolve and install AI agent skills',
  description:
    'Use the OpenAgentSkill CLI contract to resolve tasks into safe skill install plans for Codex, Claude Code, Cursor, and agent workflows.',
  alternates: {
    canonical: 'https://www.openagentskill.com/cli',
  },
}

const commands = [
  {
    label: 'Resolve',
    title: 'Resolve a task into one safe install plan',
    command: 'openagentskill resolve "scrape competitor pricing pages" --agent codex --max-risk medium',
    copy: 'Calls /api/agent/resolve and returns the selected skill, alternatives, safety profile, and install prompt.',
  },
  {
    label: 'Install',
    title: 'Fetch target-specific install handoffs',
    command: 'openagentskill install crawl4ai --agent claude-code',
    copy: 'Returns Codex, Claude Code, Cursor, and CLI install handoffs from the canonical skill record.',
  },
  {
    label: 'Evaluate',
    title: 'Check registry recommendation quality',
    command: 'openagentskill evals',
    copy: 'Runs the public recommendation benchmark so ranking changes can be checked before deployment.',
  },
  {
    label: 'Outcome',
    title: 'Report whether the skill worked',
    command: 'openagentskill outcome resolve_... --skill crawl4ai --task "scrape pricing pages" --agent codex --outcome success --install-used',
    copy: 'Posts the result back to /api/agent/outcome so Trust Score v4 and rankings learn from real agent runs.',
  },
]

const contract = `{
  "task": "review a pull request and summarize risky changes",
  "agent": "codex",
  "constraints": {
    "max_risk": "medium",
    "needs_install_command": true,
    "min_stars": 500
  }
}`

const lockfile = `{
  "version": 1,
  "skills": {
    "crawl4ai": {
      "source": "github.com/unclecode/crawl4ai",
      "audit_score": 92,
      "safety_score": 80,
      "resolved_at": "2026-06-10T00:00:00.000Z"
    }
  }
}`

export default function CliPage() {
  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="CLI contract"
        title="Resolve, audit, and install agent skills from the terminal."
        description={
          <>
            OpenAgentSkill CLI turns a natural-language task into a selected skill, safety policy decision,
            target-specific install handoff, and audit trail.
          </>
        }
        actions={
          <>
            <MarketingButtonLink href="/api-docs" variant="primary">
              View API contract
            </MarketingButtonLink>
            <MarketingButtonLink
              href="/api/agent/resolve?task=scrape+pricing+pages&agent=codex&format=text"
              prefetch={false}
            >
              Try resolve endpoint
            </MarketingButtonLink>
          </>
        }
      />

        <section className="min-w-0 border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-4 px-6 py-12 sm:py-14 md:grid-cols-2 xl:grid-cols-4">
            {commands.map((item) => (
              <article key={item.label} className="min-w-0 border border-border bg-card p-5">
                <p className="font-mono text-xs uppercase text-secondary">{item.label}</p>
                <h2 className="mt-3 font-display text-2xl font-semibold leading-tight">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-secondary">{item.copy}</p>
                <pre className="mt-5 max-w-full overflow-x-auto border border-border bg-background p-3 font-mono text-xs leading-relaxed text-secondary">
                  <code>{item.command}</code>
                </pre>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="font-mono text-xs uppercase text-secondary">Resolve API</p>
            <h2 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
              The CLI is a thin layer over the agent control plane.
            </h2>
            <p className="mt-5 text-base leading-7 text-secondary">
              The important product surface is the decision object: selected skill, alternatives, policy result,
              safety score, install plan, benchmark link, and outcome event. Agents can call the same endpoint
              directly without opening a browser, then report the result after one narrow run.
            </p>
          </div>

          <div className="grid min-w-0 gap-4">
            <div className="min-w-0 border border-border bg-card p-5">
              <p className="mb-3 font-mono text-xs uppercase text-secondary">Request</p>
              <pre className="max-w-full overflow-x-auto border border-border bg-background p-4 font-mono text-xs leading-relaxed text-secondary">
                <code>{contract}</code>
              </pre>
            </div>
            <div className="min-w-0 border border-border bg-card p-5">
              <p className="mb-3 font-mono text-xs uppercase text-secondary">Future lockfile</p>
              <pre className="max-w-full overflow-x-auto border border-border bg-background p-4 font-mono text-xs leading-relaxed text-secondary">
                <code>{lockfile}</code>
              </pre>
            </div>
          </div>
        </section>
    </MarketingPageShell>
  )
}
