import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
import { getAllSkills, getSkillsBySlugs, type SkillRecord } from '@/lib/db/skills'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import { selectSkillsForPack, SKILL_PACKS } from '@/lib/skill-packs'

const BASE_URL = 'https://www.openagentskill.com'
const PACK_CANDIDATE_LIMIT = 1200

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Agent Skill Packs for Builders',
  description:
    'Curated AI agent skill packs for frontend engineers, design agents, SEO automation, data analysts, startup founders, and full-stack SaaS builders.',
  alternates: {
    canonical: `${BASE_URL}/skill-packs`,
  },
  openGraph: {
    title: 'AI Agent Skill Packs - OpenAgentSkill',
    description: 'Install complete packs of reusable skills for design, frontend, growth, data, founder, and SaaS agent workflows.',
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
        eyebrow="Skill packs"
        title="Install complete skill packs for real agent workflows."
        description="Packs group high-signal skills by job-to-be-done, then expose the install commands, trust scores, and workflow steps an agent needs to start using them."
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: SKILL_PACKS.length, label: 'Packs' },
              { value: skills.length.toLocaleString(), label: 'Skills' },
              { value: '4', label: 'Steps' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
        <section className="grid gap-4 py-10 md:grid-cols-2">
          {SKILL_PACKS.map((pack) => {
            const picks = selectSkillsForPack(skills, pack, 5)
            const bestScore = picks[0] ? getSkillQualityProfile(picks[0]).score : 0
            return (
              <Link
                key={pack.slug}
                href={`/skill-packs/${pack.slug}`}
                className="group border border-border bg-card p-5 transition-colors hover:border-foreground"
              >
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-secondary">{pack.eyebrow}</p>
                    <h2 className="mt-2 font-display text-2xl font-semibold group-hover:text-secondary">
                      {pack.shortTitle}
                    </h2>
                  </div>
                  <span className="w-fit border border-border px-2 py-1 font-mono text-xs text-secondary">
                    {picks.length} picks
                  </span>
                </div>
                <p className="min-h-16 text-sm leading-relaxed text-secondary">{pack.description}</p>
                <div className="mt-5 grid grid-cols-3 gap-px border border-border bg-border text-xs">
                  <div className="bg-background p-3">
                    <div className="font-mono text-foreground">{bestScore || '-'}</div>
                    <div className="mt-1 text-secondary">Top score</div>
                  </div>
                  <div className="bg-background p-3">
                    <div className="font-mono text-foreground">{formatCompactNumber(picks[0]?.github_stars || 0)}</div>
                    <div className="mt-1 text-secondary">Top stars</div>
                  </div>
                  <div className="bg-background p-3">
                    <div className="font-mono text-foreground">{pack.workflowSteps.length}</div>
                    <div className="mt-1 text-secondary">Workflow</div>
                  </div>
                </div>
              </Link>
            )
          })}
        </section>
      </div>
    </MarketingPageShell>
  )
}
