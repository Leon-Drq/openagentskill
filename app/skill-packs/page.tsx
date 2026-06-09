import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills } from '@/lib/db/skills'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import { selectSkillsForPack, SKILL_PACKS } from '@/lib/skill-packs'

const BASE_URL = 'https://www.openagentskill.com'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Agent Skill Packs for Builders',
  description:
    'Curated AI agent skill packs for frontend engineers, SEO automation, data analysts, startup founders, and full-stack SaaS builders.',
  alternates: {
    canonical: `${BASE_URL}/skill-packs`,
  },
  openGraph: {
    title: 'AI Agent Skill Packs - OpenAgentSkill',
    description: 'Install complete packs of reusable skills for real agent workflows.',
    url: `${BASE_URL}/skill-packs`,
    type: 'website',
  },
}

export default async function SkillPacksPage() {
  const skills = await getAllSkills('quality').catch(() => [])

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
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="border-b border-border pb-12">
          <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Skill packs</p>
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <h1 className="font-display text-4xl font-bold leading-tight text-balance sm:text-6xl">
                Install complete skill packs for real agent workflows.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
                Packs group high-signal skills by job-to-be-done, then expose the install commands, trust scores, and
                workflow steps an agent needs to start using them.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{SKILL_PACKS.length}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Packs</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{skills.length.toLocaleString()}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Skills</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">4</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Steps</div>
              </div>
            </div>
          </div>
        </section>

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
      </main>

      <SiteFooter />
    </div>
  )
}
