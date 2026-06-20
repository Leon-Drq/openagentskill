import type { Metadata } from 'next'
import Link from 'next/link'
import { AgentResolveWorkbench } from '@/components/agent-resolve-workbench'
import {
  MarketingFeatureGrid,
  MarketingHero,
  MarketingMetricStrip,
  MarketingPageShell,
} from '@/components/marketing-page'

export const metadata: Metadata = {
  title: 'Resolve AI Agent Tasks into Skills',
  description:
    'Describe a task and let OpenAgentSkill recommend the right reusable AI agent skill with install command, Trust Score, audit notes, safety gate, and alternatives.',
  alternates: {
    canonical: 'https://www.openagentskill.com/resolve',
  },
  openGraph: {
    title: 'Resolve AI Agent Tasks into Skills - OpenAgentSkill',
    description:
      'Turn a task into one safe skill plan: recommended skill, alternatives, install command, trust score, audit notes, and safety policy.',
    url: 'https://www.openagentskill.com/resolve',
    type: 'website',
  },
}

const capabilities = [
  {
    label: 'Task fit',
    title: 'Matches the job your agent needs to do',
    copy: 'Searches scenario, tags, repository metadata, category, and use-case signals before choosing a skill.',
  },
  {
    label: 'Trust',
    title: 'Ranks by quality, adoption, and maintenance',
    copy: 'Combines GitHub stars, freshness, license clarity, install readiness, and OpenAgentSkill Trust Score.',
  },
  {
    label: 'Install',
    title: 'Returns agent-ready handoffs',
    copy: 'Provides CLI command, target agent prompt, detail page, audit page, and safer next steps.',
  },
]

export default async function ResolvePage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>
}) {
  const params = await searchParams
  const initialTask = params.task || ''

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'OpenAgentSkill Resolve',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    url: 'https://www.openagentskill.com/resolve',
    description:
      'Resolve AI agent tasks into reusable skills with Trust Score, audit notes, alternatives, and install commands.',
  }

  return (
    <MarketingPageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <MarketingHero
        eyebrow="Agent skill resolver"
        title="Describe the task. Get the right reusable skill."
        description={
          <>
            OpenAgentSkill turns vague agent work into a concrete install plan: recommended skill, alternatives,
            Trust Score, audit notes, safety policy, and target-specific handoff.
          </>
        }
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: '1', label: 'Best skill' },
              { value: '4', label: 'Alternatives' },
              { value: 'API', label: 'Agent ready' },
            ]}
          />
        }
      />

        <section className="border-b border-border bg-card/35">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <MarketingFeatureGrid items={capabilities} />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
          <AgentResolveWorkbench initialTask={initialTask} />
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-10 md:grid-cols-3">
            <Link href="/api/agent/resolve?task=analyze%20stock%20news&format=text" prefetch={false} className="border border-border bg-card p-5 transition-colors hover:border-foreground/40">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Plain text API</p>
              <h2 className="mt-3 font-display text-xl font-normal">Agent-readable response</h2>
              <p className="mt-3 text-sm leading-6 text-secondary">Use text output when an agent or CLI needs the decision without rendering JSON.</p>
            </Link>
            <Link href="/api-docs#agent-resolve" className="border border-border bg-card p-5 transition-colors hover:border-foreground/40">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Schema</p>
              <h2 className="mt-3 font-display text-xl font-normal">OpenAPI contract</h2>
              <p className="mt-3 text-sm leading-6 text-secondary">Inspect request parameters, response fields, and recommended integration flow.</p>
            </Link>
            <Link href="/skills?trust=production" className="border border-border bg-card p-5 transition-colors hover:border-foreground/40">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Human browse</p>
              <h2 className="mt-3 font-display text-xl font-normal">Review the registry</h2>
              <p className="mt-3 text-sm leading-6 text-secondary">Browse production candidates with the same trust, safety, and supply signals.</p>
            </Link>
          </div>
        </section>
    </MarketingPageShell>
  )
}
