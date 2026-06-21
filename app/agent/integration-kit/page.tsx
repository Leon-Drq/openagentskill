import type { Metadata } from 'next'
import Link from 'next/link'
import {
  MarketingButtonLink,
  MarketingHero,
  MarketingMetricStrip,
  MarketingPageShell,
} from '@/components/marketing-page'
import { getAgentIntegrationKit } from '@/lib/agent-integration-kit'

export const metadata: Metadata = {
  title: 'Agent Integration Kit - OpenAgentSkill',
  description:
    'Copy-paste templates and API contracts for connecting Codex, Claude Code, Cursor, and other agents to OpenAgentSkill.',
  alternates: {
    canonical: 'https://www.openagentskill.com/agent/integration-kit',
  },
  openGraph: {
    title: 'Agent Integration Kit - OpenAgentSkill',
    description: 'Let an agent resolve a task into the right reusable skill, trust signals, and install handoff.',
    url: 'https://www.openagentskill.com/agent/integration-kit',
    type: 'website',
  },
}

export default function AgentIntegrationKitPage() {
  const kit = getAgentIntegrationKit()

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Agent Integration Kit"
        title="Add OpenAgentSkill to your agent."
        description="Use these copy-paste templates and API contracts to let Codex, Claude Code, Cursor, or another agent resolve tasks into reusable skills before building from scratch."
        actions={
          <>
            <MarketingButtonLink href="/api/agent/integration-kit?format=text" variant="primary" prefetch={false}>
              Open text kit
            </MarketingButtonLink>
            <MarketingButtonLink href="/api/agent/resolve?task=scrape+pricing+pages&agent=codex&max_risk=medium&format=text" prefetch={false}>
              Try resolve
            </MarketingButtonLink>
            <MarketingButtonLink href="/openapi.json" prefetch={false}>
              OpenAPI
            </MarketingButtonLink>
          </>
        }
        aside={
          <MarketingMetricStrip
            columns="grid-cols-2"
            items={[
              { value: kit.supported_agents.length, label: 'Agent templates' },
              { value: kit.stable_response_fields.length, label: 'Stable fields' },
              { value: 'v1', label: 'Kit version' },
              { value: 'API', label: 'Install handoff' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-secondary">Canonical flow</p>
            <h2 className="font-display text-2xl font-normal leading-tight">The minimum contract for agent adoption.</h2>
            <p className="mt-3 text-sm leading-6 text-secondary">
              Agents should not scrape the UI or pick random repositories. They should call the resolver, inspect the handoff, then install only after the safety gate is acceptable.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-[8px] border border-border bg-border md:grid-cols-3">
            {kit.recommended_flow.slice(0, 6).map((step, index) => (
              <div key={step} className="bg-background p-5">
                <p className="font-mono text-xs text-secondary">{String(index + 1).padStart(2, '0')}</p>
                <p className="mt-3 text-sm leading-6">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-b border-border py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-secondary">Copy templates</p>
              <h2 className="font-display text-2xl font-normal">Codex, Claude Code, and Cursor setup.</h2>
            </div>
            <Link href="/api/agent/integration-kit" prefetch={false} className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
              JSON contract
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {kit.supported_agents.map((agent) => (
              <article key={agent.id} className="flex min-w-0 flex-col rounded-[8px] border border-border bg-card">
                <div className="border-b border-border p-5">
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">{agent.surface}</p>
                  <h3 className="mt-3 font-display text-2xl font-normal">{agent.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-secondary">{agent.best_for.join(' / ')}</p>
                </div>
                <div className="space-y-3 p-5">
                  {agent.setup_steps.map((step, index) => (
                    <div key={step} className="grid grid-cols-[28px_1fr] gap-3 text-sm leading-6">
                      <span className="font-mono text-xs text-secondary">{index + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto border-t border-border p-5">
                  <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-secondary">Prompt</p>
                  <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-[8px] border border-border bg-background p-4 font-mono text-xs leading-5 text-secondary">
                    {agent.copy_prompt}
                  </pre>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 py-10 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-secondary">Stable fields</p>
            <h2 className="font-display text-2xl font-normal leading-tight">What an agent should read from Resolve.</h2>
            <p className="mt-3 text-sm leading-6 text-secondary">
              These fields are intended as the stable integration surface for tools. The UI can change; this contract should stay predictable.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[8px] border border-border bg-card p-5">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-secondary">Response fields</p>
              <ul className="space-y-2 text-sm leading-6">
                {kit.stable_response_fields.map((field) => (
                  <li key={field}>
                    <code className="rounded-[6px] border border-border bg-background px-2 py-1 text-xs">{field}</code>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[8px] border border-border bg-card p-5">
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-secondary">Safety rules</p>
              <ul className="space-y-3 text-sm leading-6 text-secondary">
                {kit.safety_rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </MarketingPageShell>
  )
}
