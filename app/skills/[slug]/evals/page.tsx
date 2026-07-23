import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { InstallCommand } from '@/components/install-command'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getRelatedSkills, getSkillEventStats } from '@/lib/db/skills'
import { buildSkillEvalProfile, type SkillEvalCheckStatus, type SkillEvalStatus } from '@/lib/skill-evals'
import { getSkillBySlugOrFallback, isCuratedSkillFallback } from '@/lib/skill-fallbacks'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const skill = await getSkillBySlugOrFallback(slug)
  if (!skill) return { title: 'Skill Eval Not Found' }

  const pageUrl = `https://www.openagentskill.com/skills/${skill.slug}/evals`
  return {
    title: `${skill.name} Eval Report | OpenAgentSkill`,
    description: `Pre-install Trust + Eval report for ${skill.name}: task fit, install safety, trust score, audit warnings, and validation steps.`,
    alternates: {
      canonical: pageUrl,
    },
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title: `${skill.name} Eval Report - OpenAgentSkill`,
      description: `Read the OpenAgentSkill eval contract before installing ${skill.name} into an AI agent workflow.`,
      url: pageUrl,
      type: 'article',
    },
  }
}

function statusTone(status: SkillEvalStatus) {
  if (status === 'passed') return 'border-[#006b4f] text-[#006b4f]'
  if (status === 'review') return 'border-amber-300 text-amber-700'
  return 'border-red-300 text-red-700'
}

function checkTone(status: SkillEvalCheckStatus) {
  if (status === 'pass') return 'border-[#006b4f] text-[#006b4f]'
  if (status === 'warn') return 'border-amber-300 text-amber-700'
  if (status === 'fail') return 'border-red-300 text-red-700'
  return 'border-border text-secondary'
}

function riskTone(risk: string) {
  if (risk === 'low') return 'border-[#006b4f] text-[#006b4f]'
  if (risk === 'medium') return 'border-amber-300 text-amber-700'
  return 'border-red-300 text-red-700'
}

function formatStatus(status: SkillEvalStatus) {
  if (status === 'passed') return 'Passed'
  if (status === 'review') return 'Needs review'
  return 'Failed'
}

export default async function SkillEvalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const skill = await getSkillBySlugOrFallback(slug)
  if (!skill) notFound()

  if (slug !== skill.slug) {
    permanentRedirect(`/skills/${skill.slug}/evals`)
  }

  const [eventStats, relatedSkills] = isCuratedSkillFallback(skill)
    ? [null, []]
    : await Promise.all([
        getSkillEventStats(skill.slug).catch(() => null),
        getRelatedSkills(skill.id, skill.category, 4).catch(() => []),
      ])
  const evalProfile = buildSkillEvalProfile(skill, {
    eventStats,
    alternatives: relatedSkills,
    task: `Evaluate ${skill.name} before installing it in an agent workflow`,
  })
  const requiredChecks = evalProfile.checks.filter((check) => check.required_for_auto_install)
  const optionalChecks = evalProfile.checks.filter((check) => !check.required_for_auto_install)
  const jsonEndpoint = `/api/agent/evals?slug=${encodeURIComponent(skill.slug)}`
  const textEndpoint = `${jsonEndpoint}&format=text`

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'SoftwareApplication',
      name: skill.name,
      applicationCategory: skill.category,
      url: `https://www.openagentskill.com/skills/${skill.slug}`,
      codeRepository: skill.repository || skill.github_repo,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: evalProfile.score,
      bestRating: 100,
      worstRating: 0,
    },
    author: {
      '@type': 'Organization',
      name: 'OpenAgentSkill',
    },
    datePublished: evalProfile.generated_at,
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script
        id="openagentskill-skill-eval"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(evalProfile) }}
      />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-secondary sm:text-sm">
          <Link href="/skills" className="hover:text-foreground">Skills</Link>
          <span>/</span>
          <Link href={`/skills/${skill.slug}`} className="hover:text-foreground">{skill.name}</Link>
          <span>/</span>
          <span className="text-foreground">Evals</span>
        </nav>

        <section className="border-b border-border pb-10">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.24em] text-secondary">Pre-install eval</p>
              <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[0.98] text-balance sm:text-5xl lg:text-6xl">
                {skill.name} eval report.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-secondary sm:text-lg">
                A machine-readable install decision for agents: task fit, Trust Score, Audit Score, install safety,
                permission surface, and a concrete validation plan before this skill touches a workspace.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className={`border px-3 py-1 font-mono text-xs ${statusTone(evalProfile.status)}`}>
                  {formatStatus(evalProfile.status)}
                </span>
                <span className={`border px-3 py-1 font-mono text-xs ${riskTone(evalProfile.risk_level)}`}>
                  {evalProfile.risk_level.toUpperCase()} RISK
                </span>
                <span className="border border-border px-3 py-1 font-mono text-xs text-secondary">
                  {evalProfile.decision.policy.toUpperCase()} POLICY
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-[8px] border border-border bg-card">
              <div className="grid grid-cols-2 gap-px bg-border text-center sm:grid-cols-4">
                {[
                  { label: 'Eval', value: evalProfile.score },
                  { label: 'Trust', value: evalProfile.trust.score },
                  { label: 'Audit', value: evalProfile.audit.score },
                  { label: 'Safety', value: evalProfile.safety_gate.score },
                ].map((item) => (
                  <div key={item.label} className="bg-background p-4">
                    <div className="font-mono text-3xl font-semibold leading-none">{item.value}</div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="p-5">
                <p className="font-display text-xl font-semibold">{evalProfile.decision.recommendation.replace(/_/g, ' ')}</p>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{evalProfile.decision.reason}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-8">
            <div>
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-secondary">Required gates</p>
                  <h2 className="font-display text-2xl font-semibold">Checks an agent must pass before install</h2>
                </div>
                <Link
                  href={jsonEndpoint}
                  prefetch={false}
                  className="inline-flex min-h-10 items-center justify-center rounded-[8px] border border-border px-4 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                >
                  Open JSON
                </Link>
              </div>
              <div className="grid gap-px overflow-hidden rounded-[8px] border border-border bg-border sm:grid-cols-2">
                {requiredChecks.map((check) => (
                  <div key={check.id} className="min-w-0 bg-background p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">{check.label}</p>
                        <p className="mt-2 font-mono text-3xl font-semibold">{check.score}</p>
                      </div>
                      <span className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase ${checkTone(check.status)}`}>
                        {check.status}
                      </span>
                    </div>
                    <p className="break-words text-sm leading-relaxed text-secondary [overflow-wrap:anywhere]">{check.detail}</p>
                    {check.evidence.length > 0 && (
                      <ul className="mt-4 space-y-1 border-t border-border pt-4 text-xs leading-relaxed text-secondary">
                        {check.evidence.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[8px] border border-border bg-card p-5">
                <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-secondary">Validation plan</p>
                <h2 className="font-display text-xl font-semibold">What the agent should do next</h2>
                <ol className="mt-4 space-y-3 text-sm leading-relaxed text-secondary">
                  {evalProfile.validation_plan.map((step, index) => (
                    <li key={step} className="grid grid-cols-[auto_1fr] gap-3">
                      <span className="font-mono text-foreground">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-[8px] border border-border bg-card p-5">
                <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-secondary">Do not use when</p>
                <h2 className="font-display text-xl font-semibold">Conditions that require another skill</h2>
                <ul className="mt-4 space-y-2 text-sm leading-relaxed text-secondary">
                  {evalProfile.do_not_use_when.slice(0, 6).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>

            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-secondary">Supporting checks</p>
              <h2 className="font-display text-2xl font-semibold">Trust signals behind the decision</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {optionalChecks.map((check) => (
                  <div key={check.id} className="min-w-0 rounded-[8px] border border-border bg-card p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">{check.label}</p>
                      <span className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase ${checkTone(check.status)}`}>
                        {check.status}
                      </span>
                    </div>
                    <p className="font-mono text-2xl font-semibold">{check.score}</p>
                    <p className="mt-3 break-words text-sm leading-relaxed text-secondary [overflow-wrap:anywhere]">{check.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="min-w-0 space-y-5">
            <div className="rounded-[8px] border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Install handoff</h2>
              <p className="mb-4 mt-1 text-xs leading-relaxed text-secondary">
                Use only after the eval decision and validation plan are accepted.
              </p>
              <InstallCommand command={evalProfile.install.command} skillSlug={skill.slug} compact />
            </div>

            <div className="rounded-[8px] border border-border bg-card p-5">
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-secondary">Agent endpoints</p>
              <div className="grid gap-2 text-sm">
                <Link href={jsonEndpoint} prefetch={false} className="rounded-[8px] border border-border px-3 py-2.5 text-center transition-colors hover:border-foreground">
                  Eval JSON
                </Link>
                <Link href={textEndpoint} prefetch={false} className="rounded-[8px] border border-border px-3 py-2.5 text-center transition-colors hover:border-foreground">
                  Eval text
                </Link>
                <Link href={`/api/agent/skills/${skill.slug}`} prefetch={false} className="rounded-[8px] border border-border px-3 py-2.5 text-center transition-colors hover:border-foreground">
                  Skill JSON
                </Link>
                <Link href={`/skills/${skill.slug}/audit`} className="rounded-[8px] border border-border px-3 py-2.5 text-center transition-colors hover:border-foreground">
                  Audit report
                </Link>
              </div>
            </div>

            <div className="rounded-[8px] border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Warnings</h2>
              {evalProfile.warnings.length > 0 ? (
                <ul className="mt-4 space-y-2 text-xs leading-relaxed text-secondary">
                  {evalProfile.warnings.slice(0, 8).map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-secondary">No major warnings from available metadata.</p>
              )}
            </div>

            {evalProfile.alternatives.length > 0 && (
              <div className="rounded-[8px] border border-border bg-card p-5">
                <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-secondary">Alternatives</p>
                <div className="space-y-3">
                  {evalProfile.alternatives.slice(0, 4).map((alternative) => (
                    <Link
                      key={alternative.slug}
                      href={`/skills/${alternative.slug}/evals`}
                      className="block rounded-[8px] border border-border p-3 transition-colors hover:border-foreground"
                    >
                      <p className="font-semibold">{alternative.name}</p>
                      <p className="mt-1 font-mono text-xs text-secondary">
                        Trust {alternative.trust_score} · Audit {alternative.audit_score}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
