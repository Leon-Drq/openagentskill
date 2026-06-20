import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InstallCommand } from '@/components/install-command'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import { convertSkillRecordToManifest, getAllSkills } from '@/lib/db/skills'
import { SKILL_STACKS } from '@/lib/collections'
import { getSkillSupplyProfile } from '@/lib/supply'
import { getSkillTrustProfile } from '@/lib/trust'
import { USE_CASES, getUseCaseBySlug, selectSkillsForUseCase } from '@/lib/use-cases'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return USE_CASES.map((useCase) => ({ slug: useCase.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const useCase = getUseCaseBySlug(slug)
  if (!useCase) return { title: 'Use Case Not Found' }

  return {
    title: useCase.title,
    description: useCase.description,
    alternates: {
      canonical: `https://www.openagentskill.com/use-cases/${useCase.slug}`,
    },
    openGraph: {
      title: `${useCase.shortTitle} — OpenAgentSkill Use Cases`,
      description: useCase.description,
      url: `https://www.openagentskill.com/use-cases/${useCase.slug}`,
      type: 'website',
    },
  }
}

function formatNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`
  return value.toLocaleString()
}

function formatDate(value: string | null) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const useCase = getUseCaseBySlug(slug)
  if (!useCase) notFound()

  const allSkills = await getAllSkills('quality', undefined, 4000).catch(() => [])
  const matchedSkills = selectSkillsForUseCase(allSkills, useCase, 18)
  const enrichedSkills = matchedSkills.map((skill) => {
    const trust = getSkillTrustProfile(skill)
    const audit = buildSkillAudit(skill)
    const safety = getAgentSafetyProfile(skill, audit, {
      max_risk: 'medium',
      needs_install_command: true,
    })
    const supply = getSkillSupplyProfile(skill)

    return { skill, trust, audit, safety, supply }
  })
  const heroSkills = enrichedSkills.slice(0, 3)
  const strongTrustCount = enrichedSkills.filter((item) => item.trust.tier === 'production' || item.trust.tier === 'strong').length
  const installReadyCount = enrichedSkills.filter((item) => item.supply.install.ready).length
  const autoInstallCount = enrichedSkills.filter((item) => item.safety.auto_install_allowed).length
  const highStarCount = enrichedSkills.filter((item) => Number(item.skill.github_stars || 0) >= 500).length
  const resolveHref = `/api/agent/resolve?task=${encodeURIComponent(useCase.heroPrompt)}&agent=codex&max_risk=medium&limit=5`
  const resolveTextHref = `${resolveHref}&format=text`
  const relatedStacks = SKILL_STACKS.filter((stack) => stack.useCaseSlug === useCase.slug)
  const faqEntries = [
    {
      question: `What are the best AI agent skills for ${useCase.shortTitle.toLowerCase()}?`,
      answer:
        heroSkills.length > 0
          ? `Start by comparing ${heroSkills.map(({ skill }) => skill.name).join(', ')}. OpenAgentSkill ranks them by workflow fit, GitHub adoption, trust score, safety gate, and install readiness.`
          : `Use the matching skills list on this page as a shortlist, then inspect each repository and install path before production use.`,
    },
    {
      question: 'Can an AI agent use this page directly?',
      answer:
        `Yes. Use the linked Registry API prompt to query /api/skills/search with the task: "${useCase.heroPrompt}" and retrieve install handoff links for the top results.`,
    },
    {
      question: 'Should I install every recommended skill?',
      answer:
        'No. Start with the highest-fit skill, test it in a sandbox workflow, and add companion skills only when the task needs extra coverage.',
    },
  ]
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: useCase.title,
        description: useCase.description,
        url: `https://www.openagentskill.com/use-cases/${useCase.slug}`,
        mainEntity: matchedSkills.slice(0, 10).map((skill, index) => ({
          '@type': 'SoftwareApplication',
          position: index + 1,
          name: skill.name,
          url: `https://www.openagentskill.com/skills/${skill.slug}`,
          applicationCategory: skill.category,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqEntries.map((entry) => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: entry.answer,
          },
        })),
      },
    ],
  }

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 flex items-center gap-2 text-sm text-secondary">
          <Link href="/use-cases" className="hover:text-foreground">
            Use cases
          </Link>
          <span>/</span>
          <span className="text-foreground">{useCase.shortTitle}</span>
        </nav>

        <section className="grid gap-10 border-b border-border pb-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-secondary">{useCase.eyebrow}</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">{useCase.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{useCase.description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/skills?useCase=${useCase.slug}`}
                className="border border-foreground bg-foreground px-5 py-2 text-sm text-background transition-colors hover:bg-background hover:text-foreground"
              >
                Browse matching skills
              </Link>
              <Link
                href={`/blog/use-cases/${useCase.slug}`}
                className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Read guide
              </Link>
              <Link
                href={resolveTextHref}
                className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Resolve via Agent API
              </Link>
            </div>
          </div>

          <div className="overflow-hidden border border-border bg-card">
            <div className="p-5">
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Try this task</p>
              <p className="text-lg leading-relaxed text-foreground">{useCase.heroPrompt}</p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border text-center sm:grid-cols-3">
              {[
                { label: 'Matched', value: matchedSkills.length.toLocaleString() },
                { label: 'Strong trust', value: strongTrustCount.toLocaleString() },
                { label: 'Install ready', value: installReadyCount.toLocaleString() },
                { label: 'Auto allowed', value: autoInstallCount.toLocaleString() },
                { label: '500+ stars', value: highStarCount.toLocaleString() },
              ].map((item) => (
                <div key={item.label} className="bg-background p-4">
                  <div className="font-mono text-2xl">{item.value}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-secondary">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-5">
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Agent should be able to</p>
              <ul className="space-y-2 text-sm text-secondary">
                {useCase.agentTasks.map((task) => (
                  <li key={task} className="flex gap-2">
                    <span className="font-mono text-foreground/40">+</span>
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-px border-b border-border bg-border md:grid-cols-3">
          {[
            {
              label: 'Resolve',
              title: 'Let the agent pick',
              detail: 'Returns the best skill, alternatives, install handoff, risk summary, and safety gate.',
              href: resolveHref,
            },
            {
              label: 'Text plan',
              title: 'LLM-readable output',
              detail: 'Plain text version for Codex, Claude Code, Cursor, and custom agent runtimes.',
              href: resolveTextHref,
            },
            {
              label: 'Browse',
              title: 'Human shortlist',
              detail: 'Open the filtered registry view for this workflow and compare candidates manually.',
              href: `/skills?useCase=${useCase.slug}&sort=quality`,
            },
          ].map((item) => (
            <Link key={item.label} href={item.href} prefetch={false} className="min-w-0 bg-background p-5 transition-colors hover:bg-card">
              <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">{item.label}</p>
              <h2 className="mt-3 font-display text-xl font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-secondary">{item.detail}</p>
            </Link>
          ))}
        </section>

        {relatedStacks.length > 0 && (
          <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Recommended stack</p>
              <h2 className="font-display text-2xl font-semibold">Turn this use case into a workflow</h2>
            </div>
            <div className="grid gap-3">
              {relatedStacks.map((stack) => (
                <Link
                  key={stack.slug}
                  href={`/collections/${stack.slug}`}
                  className="border border-border bg-card p-5 transition-colors hover:border-foreground"
                >
                  <p className="text-xs uppercase tracking-widest text-secondary">{stack.eyebrow}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold">{stack.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-secondary">{stack.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Workflow map</p>
            <h2 className="font-display text-2xl font-semibold">What to build with these skills</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {useCase.workflows.map((workflow, index) => (
              <div key={workflow} className="border border-border bg-card p-4">
                <div className="font-mono text-xs text-secondary">{String(index + 1).padStart(2, '0')}</div>
                <p className="mt-2 text-sm leading-relaxed">{workflow}</p>
              </div>
            ))}
          </div>
        </section>

        {heroSkills.length > 0 && (
          <section className="border-b border-border py-10">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Best first installs</p>
                <h2 className="font-display text-2xl font-semibold">Start with high-signal skills</h2>
              </div>
              <span className="text-sm text-secondary">{matchedSkills.length} matched skills</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {heroSkills.map(({ skill, trust, audit, safety, supply }) => {
                const manifest = convertSkillRecordToManifest(skill)
                return (
                  <article key={skill.slug} className="border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <Link href={`/skills/${skill.slug}`} className="group min-w-0">
                        <h3 className="font-display text-xl font-semibold leading-tight group-hover:text-secondary">
                          {skill.name}
                        </h3>
                      </Link>
                      {skill.verified && <span className="shrink-0 border border-border px-2 py-1 text-xs font-mono">VERIFIED</span>}
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-secondary">{skill.description}</p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs font-mono text-secondary">
                      <span>{formatNumber(skill.github_stars)} stars</span>
                      <span>{trust.score} trust</span>
                      <span>{audit.audit_score} audit</span>
                      <span>{safety.safety_tier.badge}</span>
                    </div>
                    <div className="mt-4 grid gap-px border border-border bg-border text-xs sm:grid-cols-2">
                      <div className="bg-background p-3">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">Install</p>
                        <p className="mt-1 truncate font-semibold">{trust.installReadiness.label}</p>
                      </div>
                      <div className="bg-background p-3">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">Risk</p>
                        <p className="mt-1 truncate font-semibold">{auditRiskLabel(audit.risk_level)}</p>
                      </div>
                      <div className="bg-background p-3">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">Agent fit</p>
                        <p className="mt-1 truncate font-semibold">{supply.applicableAgents.slice(0, 2).join(' + ')}</p>
                      </div>
                      <div className="bg-background p-3">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">Updated</p>
                        <p className="mt-1 truncate font-semibold">{formatDate(skill.github_last_pushed_at)}</p>
                      </div>
                    </div>
                    <div className="mt-5">
                      <InstallCommand command={manifest.technical.installCommand || `npx skills add ${skill.github_repo}`} skillSlug={skill.slug} compact />
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        <section className="py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Skill shortlist</p>
              <h2 className="font-display text-2xl font-semibold">More options for this use case</h2>
            </div>
            <Link href="/skills?sort=quality" className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
              Browse full marketplace
            </Link>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {enrichedSkills.slice(3).map(({ skill, trust, audit, safety, supply }) => (
              <Link
                key={skill.slug}
                href={`/skills/${skill.slug}`}
                className="grid gap-4 py-5 transition-colors hover:bg-muted/30 lg:grid-cols-[1fr_auto] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">{skill.name}</h3>
                    <span className="border border-border px-2 py-0.5 text-xs text-secondary">{skill.category}</span>
                    <span className="border border-border px-2 py-0.5 font-mono text-xs text-secondary">
                      {supply.track.shortLabel}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-secondary">{skill.description}</p>
                  <p className="mt-2 line-clamp-1 text-xs text-secondary">
                    {trust.riskSummary.label} · {safety.safety_tier.recommended_action}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-mono text-secondary lg:justify-end">
                  <span>{formatNumber(skill.github_stars)} stars</span>
                  <span>{trust.score} trust</span>
                  <span>{audit.audit_score} audit</span>
                  <span>{safety.score} safety</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-border py-10">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">FAQ</p>
              <h2 className="font-display text-2xl font-semibold">How to choose skills for this workflow</h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                These answers are written for both human builders and agents consuming the Registry API.
              </p>
            </div>
            <div className="grid gap-3">
              {faqEntries.map((entry) => (
                <div key={entry.question} className="border border-border bg-card p-5">
                  <h3 className="font-display text-lg font-semibold">{entry.question}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{entry.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
