import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getAllSkills, getSkillsBySlugs, type SkillRecord } from '@/lib/db/skills'
import { getPrimaryInstallCommand } from '@/lib/install-targets'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import { getCuratedSkillFallback } from '@/lib/skill-fallbacks'
import { getSkillTrustProfile } from '@/lib/trust'
import { buildSkillPackInstallPlan, getSkillPackBySlug, selectSkillsForPack, SKILL_PACKS } from '@/lib/skill-packs'

const BASE_URL = 'https://www.openagentskill.com'
const PACK_CANDIDATE_LIMIT = 1200

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return SKILL_PACKS.map((pack) => ({ slug: pack.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const pack = getSkillPackBySlug(slug)
  if (!pack) return { title: 'Skill Pack Not Found' }

  return {
    title: pack.title,
    description: pack.description,
    alternates: {
      canonical: `${BASE_URL}/skill-packs/${pack.slug}`,
    },
    openGraph: {
      title: `${pack.title} - OpenAgentSkill`,
      description: pack.description,
      url: `${BASE_URL}/skill-packs/${pack.slug}`,
      type: 'website',
    },
  }
}

function mergeSkills(...pools: SkillRecord[][]) {
  const seen = new Set<string>()
  const merged: SkillRecord[] = []

  for (const pool of pools) {
    for (const skill of pool) {
      if (seen.has(skill.slug)) continue
      seen.add(skill.slug)
      merged.push(skill)
    }
  }

  return merged
}

export default async function SkillPackDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const pack = getSkillPackBySlug(slug)
  if (!pack) notFound()

  const [featuredSkills, candidateSkills] = await Promise.all([
    getSkillsBySlugs(pack.featuredSlugs || []).catch(() => []),
    getAllSkills('quality', undefined, PACK_CANDIDATE_LIMIT).catch(() => []),
  ])
  const featuredFallbacks = (pack.featuredSlugs || [])
    .map((featuredSlug) => getCuratedSkillFallback(featuredSlug))
    .filter((skill): skill is SkillRecord => Boolean(skill))
  const skills = mergeSkills(featuredSkills, featuredFallbacks, candidateSkills)
  const picks = selectSkillsForPack(skills, pack, 10)
  const installPlan = buildSkillPackInstallPlan(pack, picks, { limit: 4 })

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: pack.title,
    description: pack.description,
    url: `${BASE_URL}/skill-packs/${pack.slug}`,
    itemListElement: picks.map((skill, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${BASE_URL}/skills/${skill.slug}`,
      item: {
        '@type': 'SoftwareApplication',
        name: skill.name,
        description: skill.description,
        applicationCategory: skill.category,
        codeRepository: skill.repository,
      },
    })),
  }

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-secondary">
          <Link href="/skill-packs" className="hover:text-foreground">Skill packs</Link>
          <span>/</span>
          <span className="text-foreground">{pack.shortTitle}</span>
        </nav>

        <section className="border-b border-border pb-10">
          <p className="mb-4 text-xs uppercase tracking-widest text-secondary">{pack.eyebrow}</p>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="font-display text-4xl font-bold leading-tight text-balance sm:text-6xl">
                {pack.title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{pack.description}</p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary">{pack.persona}</p>
            </div>
            <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{picks.length}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Skills</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{pack.workflowSteps.length}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Steps</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{formatCompactNumber(picks[0]?.github_stars || 0)}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Top stars</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 border-b border-border py-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Workflow</p>
            <h2 className="font-display text-2xl font-semibold">How the pack gets used</h2>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {pack.workflowSteps.map((step, index) => (
              <li key={step.title} className="border border-border bg-card p-4">
                <span className="mb-3 block font-mono text-sm text-secondary">0{index + 1}</span>
                <h3 className="font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-4 border-b border-border py-10 md:grid-cols-2">
          <div className="border border-border p-5">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Best for</p>
            <ul className="space-y-2 text-sm leading-relaxed text-secondary">
              {pack.bestFor.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="border border-border p-5">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Avoid when</p>
            <ul className="space-y-2 text-sm leading-relaxed text-secondary">
              {pack.avoidWhen.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </section>

        <section className="grid gap-6 border-b border-border py-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Agent install plan</p>
            <h2 className="font-display text-2xl font-semibold">A machine-readable plan agents can execute.</h2>
            <p className="mt-4 text-sm leading-relaxed text-secondary">
              The pack API returns install order, audit URLs, review checklist, and the outcome feedback contract. Agents
              can use this page as context, then call the API for the exact JSON plan.
            </p>
            <Link
              href={`/api/agent/packs/${pack.slug}?limit=6&format=text`}
              className="mt-5 inline-flex w-full justify-center border border-border px-4 py-2.5 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground sm:w-auto"
              prefetch={false}
            >
              Open text plan
            </Link>
          </div>

          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <div className="border border-border bg-card p-5">
              <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Install order</p>
              <ol className="space-y-4">
                {installPlan.selected_skills.map((skill) => (
                  <li key={skill.slug} className="min-w-0">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 font-mono text-xs text-secondary">0{skill.rank}</span>
                      <div className="min-w-0">
                        <Link href={`/skills/${skill.slug}`} className="font-semibold hover:text-secondary">
                          {skill.name}
                        </Link>
                        <p className="mt-1 text-xs leading-relaxed text-secondary">
                          Trust {skill.trust_score}/100 · Audit {skill.audit_score}/100 · {skill.risk_level}
                        </p>
                        <code className="mt-2 block break-words border border-border bg-background p-2 font-mono text-xs leading-relaxed text-secondary [overflow-wrap:anywhere]">
                          {skill.install_command}
                        </code>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="border border-border bg-card p-5">
              <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Review checklist</p>
              <ul className="space-y-3 text-sm leading-relaxed text-secondary">
                {installPlan.review_checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="mt-5 border border-border bg-background p-3">
                <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Outcome endpoint</p>
                <code className="block break-words font-mono text-xs leading-relaxed text-secondary [overflow-wrap:anywhere]">
                  {installPlan.outcome_feedback.method} {installPlan.outcome_feedback.endpoint}
                </code>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Recommended skills</p>
              <h2 className="font-display text-2xl font-semibold">Installable shortlist for this pack</h2>
            </div>
            <Link
              href={`/api/agent/packs/${pack.slug}`}
              className="w-full border border-border px-4 py-2.5 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground sm:w-auto"
            >
              Open pack API
            </Link>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {picks.map((skill, index) => {
              const quality = getSkillQualityProfile(skill)
              const trust = getSkillTrustProfile(skill)
              const audit = buildSkillAudit(skill)
              return (
                <article key={skill.slug} className="grid gap-5 py-7 lg:grid-cols-[auto_1fr_300px]">
                  <div className="font-mono text-2xl text-secondary tabular-nums">#{index + 1}</div>
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Link href={`/skills/${skill.slug}`} className="min-w-0">
                        <h3 className="font-display text-2xl font-semibold leading-tight hover:text-secondary">
                          {skill.name}
                        </h3>
                      </Link>
                      <span className="border border-border px-2 py-0.5 font-mono text-xs text-secondary">
                        Quality {quality.score}
                      </span>
                      <span className="border border-border px-2 py-0.5 font-mono text-xs text-secondary">
                        Trust {trust.score}
                      </span>
                      <span className="border border-border px-2 py-0.5 font-mono text-xs text-secondary">
                        Audit {audit.audit_score}
                      </span>
                    </div>
                    <p className="max-w-3xl text-sm leading-relaxed text-secondary">{skill.description}</p>
                    <div className="mt-4 flex flex-wrap gap-4 font-mono text-xs text-secondary">
                      <span>{formatCompactNumber(skill.github_stars || 0)} stars</span>
                      <span>{auditRiskLabel(audit.risk_level)}</span>
                      <span>{skill.license || 'Unknown license'}</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="border border-border bg-card p-3">
                      <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Install</p>
                      <code className="block break-words font-mono text-xs leading-relaxed [overflow-wrap:anywhere]">
                        {getPrimaryInstallCommand(skill)}
                      </code>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      <Link
                        href={`/skills/${skill.slug}`}
                        className="border border-foreground bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background transition-opacity hover:opacity-85"
                      >
                        Skill page
                      </Link>
                      <Link
                        href={`/skills/${skill.slug}/audit`}
                        className="border border-border px-4 py-2.5 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                      >
                        Audit report
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
