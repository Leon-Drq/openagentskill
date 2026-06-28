import type { Metadata } from 'next'
import Link from 'next/link'
import { AgentResolveWorkbench } from '@/components/agent-resolve-workbench'
import {
  MarketingFeatureGrid,
  MarketingHero,
  MarketingMetricStrip,
  MarketingPageShell,
} from '@/components/marketing-page'
import { resolveAgentSkill } from '@/lib/agent-resolve'

type ResolveResult = Awaited<ReturnType<typeof resolveAgentSkill>>

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

function normalizeRisk(value: string | undefined) {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'medium'
}

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

function ResolveDecisionCard({ result }: { result: ResolveResult }) {
  const recommendation = result.recommendation
  const selected = result.selected
  const trust = recommendation?.trust_score_v4 || recommendation?.trust_score_v3 || recommendation?.trust_score_v2
  if (!recommendation || !selected) return null

  const outcomeSignals = recommendation.trust_score_v4?.outcomes
  const outcomeSummary = outcomeSignals?.total
    ? `${outcomeSignals.total} outcomes, ${outcomeSignals.successRate ?? 'unknown'}% success`
    : 'Needs first agent outcome'

  return (
    <section className="border-b border-border bg-card/45">
      <div className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
        <div className="overflow-hidden rounded-[10px] border border-border bg-background shadow-[0_20px_60px_rgba(22,20,16,0.05)]">
          <div className="grid gap-px bg-border lg:grid-cols-[1.2fr_0.8fr]">
            <div className="bg-background p-5 sm:p-7">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Resolved decision</p>
              <h2 className="mt-4 max-w-3xl font-display text-3xl font-normal leading-tight sm:text-4xl">
                {recommendation.best_skill.name}
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-secondary">
                {recommendation.best_skill.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  `${selected.match_score}/100 task fit`,
                  `${trust?.score ?? '—'}/100 Trust`,
                  `${selected.audit.audit_score}/100 audit`,
                  outcomeSummary,
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-[999px] border border-border bg-card px-3 py-1 font-mono text-[11px] text-secondary"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Install</p>
                  <code className="mt-3 block break-words rounded-[8px] border border-border bg-card p-3 font-mono text-xs leading-5 [overflow-wrap:anywhere]">
                    {recommendation.install.command}
                  </code>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Safety gate</p>
                  <div className="mt-3 rounded-[8px] border border-border bg-card p-3 text-sm leading-6 text-secondary">
                    <strong className="text-foreground">{recommendation.safety_gate.label}</strong>
                    <br />
                    {recommendation.safety_gate.recommended_action}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/skills/${recommendation.best_skill.slug}`}
                  className="rounded-[8px] bg-[#006b4f] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Open skill
                </Link>
                <Link
                  href={`/skills/${recommendation.best_skill.slug}/audit`}
                  className="rounded-[8px] border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-foreground/50"
                >
                  Audit page
                </Link>
                <Link
                  href={`/api/agent/resolve?task=${encodeURIComponent(result.task)}&agent=${encodeURIComponent(result.agent)}&max_risk=${encodeURIComponent(result.constraints.max_risk || 'medium')}&format=text`}
                  prefetch={false}
                  className="rounded-[8px] border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-foreground/50"
                >
                  Text API
                </Link>
              </div>
            </div>

            <aside className="bg-[#fbfaf7] p-5 sm:p-7">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Why this pick</p>
              <ul className="mt-4 space-y-3">
                {recommendation.why_recommended.slice(0, 5).map((reason) => (
                  <li key={reason} className="border-b border-border pb-3 text-sm leading-6 text-secondary last:border-b-0">
                    {reason}
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-[8px] border border-border bg-background p-4">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Outcome loop</p>
                <p className="mt-2 text-sm leading-6 text-secondary">
                  After one narrow run, report the result so Trust Score v4 and Agent-Proven rankings learn from real use.
                </p>
                {result.feedback?.cli_example ? (
                  <code className="mt-3 block break-words font-mono text-[11px] leading-5 text-secondary [overflow-wrap:anywhere]">
                    {result.feedback.cli_example}
                  </code>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  )
}

export default async function ResolvePage({
  searchParams,
}: {
  searchParams: Promise<{
    task?: string | string[]
    agent?: string | string[]
    max_risk?: string | string[]
    min_stars?: string | string[]
    live?: string | string[]
  }>
}) {
  const params = await searchParams
  const initialTask = normalizeParam(params.task)
  const initialAgent = normalizeParam(params.agent) || 'codex'
  const maxRisk = normalizeRisk(normalizeParam(params.max_risk))
  const minStars = Number(normalizeParam(params.min_stars) || 0)
  const live = normalizeParam(params.live) === 'true'
  const initialResult = initialTask
    ? await resolveAgentSkill({
        task: initialTask,
        agent: initialAgent,
        constraints: {
          max_risk: maxRisk,
          needs_install_command: true,
          min_stars: Number.isFinite(minStars) ? minStars : 0,
        },
        live,
      }).catch(() => null)
    : null

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

        {initialResult ? <ResolveDecisionCard result={initialResult} /> : null}

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
