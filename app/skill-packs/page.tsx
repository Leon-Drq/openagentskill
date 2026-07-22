import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingButtonLink, MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
import { getAllSkills, getSkillsBySlugs, type SkillRecord } from '@/lib/db/skills'
import { selectSkillsForPack, SKILL_PACKS } from '@/lib/skill-packs'

const BASE_URL = 'https://www.openagentskill.com'
const PACK_CANDIDATE_LIMIT = 1200

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Installable AI Agent Skill Packs | OpenAgentSkill',
  description:
    'Installable AI agent skill packs for frontend engineers, design agents, SEO automation, data analysts, startup founders, and full-stack SaaS builders. Each includes an agent-readable plan and audit links.',
  alternates: {
    canonical: `${BASE_URL}/skill-packs`,
  },
  openGraph: {
    title: 'Installable AI Agent Skill Packs - OpenAgentSkill',
    description: 'Open a role-specific pack with an install order, audit links, and a machine-readable Agent plan.',
    url: `${BASE_URL}/skill-packs`,
    type: 'website',
  },
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

export default async function SkillPacksPage() {
  const featuredSlugs = SKILL_PACKS.flatMap((pack) => pack.featuredSlugs || [])
  const [featuredSkills, candidateSkills] = await Promise.all([
    getSkillsBySlugs(featuredSlugs).catch(() => []),
    getAllSkills('quality', undefined, PACK_CANDIDATE_LIMIT).catch(() => []),
  ])
  const skills = mergeSkills(featuredSkills, candidateSkills)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'AI Agent Skill Packs',
    description: metadata.description,
    url: `${BASE_URL}/skill-packs`,
    mainEntity: SKILL_PACKS.map((pack, index) => ({
      '@type': 'ItemList',
      position: index + 1,
      name: pack.title,
      url: `${BASE_URL}/skill-packs/${pack.slug}`,
    })),
  }

  return (
    <MarketingPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MarketingHero
        eyebrow="Installable skill packs"
        title="Give your agent a vetted starting set."
        description="Packs are runnable bundles for a role or toolchain. Each one exposes a selected shortlist, install order, audit links, and a machine-readable plan your agent can use before it touches a workspace."
        actions={
          <>
            <MarketingButtonLink href="/api/agent/packs" variant="primary" prefetch={false}>Open Pack API</MarketingButtonLink>
            <MarketingButtonLink href="/collections">Explore workflow recipes</MarketingButtonLink>
          </>
        }
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: SKILL_PACKS.length, label: 'Packs' },
              { value: skills.length.toLocaleString(), label: 'Candidates' },
              { value: 'JSON', label: 'Agent plan' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
        <section className="grid gap-px border-x border-b border-border bg-border md:grid-cols-3">
          {[
            ['Selected', 'A concise, role-specific shortlist rather than an endless category page.'],
            ['Auditable', 'Every selected skill links to its trust signals and public audit context.'],
            ['Agent-readable', 'An API returns install order, review checks, and outcome feedback.'],
          ].map(([label, copy]) => (
            <div key={label} className="bg-background p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-[#006b4f]">{label}</p>
              <p className="mt-3 text-sm leading-relaxed text-secondary">{copy}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 py-10 md:grid-cols-2">
          {SKILL_PACKS.map((pack) => {
            const picks = selectSkillsForPack(skills, pack, 5)
            return (
              <Link
                key={pack.slug}
                href={`/skill-packs/${pack.slug}`}
                className="group flex min-h-[330px] flex-col border border-border bg-card p-5 transition-colors hover:border-foreground"
              >
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-secondary">Installable pack</p>
                    <h2 className="mt-2 font-display text-2xl font-semibold group-hover:text-secondary">
                      {pack.shortTitle}
                    </h2>
                  </div>
                  <span className="w-fit shrink-0 border border-[#006b4f]/30 bg-[#006b4f]/10 px-2 py-1 font-mono text-xs text-[#006b4f]">
                    Agent-ready
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-secondary">{pack.description}</p>
                <div className="mt-5 border border-border bg-background p-4">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">Pack handoff</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-secondary">
                    <span>Selected skills</span>
                    <span>Audit links</span>
                    <span>Install order</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {picks.slice(0, 3).map((skill) => (
                      <span key={skill.slug} className="max-w-full truncate border border-border px-2 py-1 font-mono text-xs text-secondary">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-auto flex items-end justify-between gap-4 pt-5">
                  <p className="text-sm text-secondary">{picks.length} selected skills</p>
                  <span className="shrink-0 text-sm font-semibold text-[#006b4f]">Open install plan →</span>
                </div>
              </Link>
            )
          })}
        </section>
      </div>
    </MarketingPageShell>
  )
}
