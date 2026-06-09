import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GrowthSkillList } from '@/components/growth-skill-list'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import { AGENT_PROFILES, getAgentProfile, rankSkillsForAgent } from '@/lib/seo/growth-directories'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return AGENT_PROFILES.map((profile) => ({ agent: profile.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agent: string }>
}): Promise<Metadata> {
  const { agent: slug } = await params
  const profile = getAgentProfile(slug)
  if (!profile) return { title: 'Agent Skills Not Found' }

  return {
    title: `Best ${profile.name} Skills for AI Agents`,
    description: `${profile.description} Ranked by OpenAgentSkill workflow fit, quality, trust, adoption, and freshness.`,
    alternates: {
      canonical: `https://www.openagentskill.com/agents/${profile.slug}`,
    },
    openGraph: {
      title: `Best ${profile.name} Skills - OpenAgentSkill`,
      description: profile.description,
      url: `https://www.openagentskill.com/agents/${profile.slug}`,
      type: 'website',
    },
  }
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agent: string }>
}) {
  const { agent: slug } = await params
  const profile = getAgentProfile(slug)
  if (!profile) notFound()

  const skills = await getAllSkills('quality').catch(() => [])
  const ranked = rankSkillsForAgent(skills, profile, 48)
  const totalStars = ranked.reduce((sum, item) => sum + Number(item.skill.github_stars || 0), 0)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Best ${profile.name} Skills`,
    description: profile.description,
    url: `https://www.openagentskill.com/agents/${profile.slug}`,
    mainEntity: ranked.slice(0, 10).map((item) => ({
      '@type': 'SoftwareApplication',
      position: item.rank,
      name: item.skill.name,
      url: `https://www.openagentskill.com/skills/${item.skill.slug}`,
      applicationCategory: item.skill.category,
    })),
  }

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-secondary">
          <Link href="/agents" className="hover:text-foreground">Agents</Link>
          <span>/</span>
          <span className="text-foreground">{profile.name}</span>
        </nav>

        <section className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-secondary">{profile.eyebrow}</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
              Best {profile.name} skills for agent workflows.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{profile.description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/best"
                className="border border-foreground bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
              >
                Browse all best lists
              </Link>
              <Link
                href="/official"
                className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Official skills
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{ranked.length}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Ranked</div>
            </div>
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{formatCompactNumber(totalStars)}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Stars</div>
            </div>
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{ranked[0]?.badge.replace(' fit', '') || '-'}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Top fit</div>
            </div>
          </div>
        </section>

        <section className="border-b border-border py-10">
          <div className="grid gap-px bg-border md:grid-cols-3">
            {profile.workflows.map((workflow) => (
              <div key={workflow} className="bg-background p-5">
                <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Workflow</p>
                <p className="font-display text-xl font-semibold">{workflow}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-10">
          <div className="mb-6">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">{profile.shortName} shortlist</p>
            <h2 className="font-display text-2xl font-semibold">Skills ranked for this agent</h2>
          </div>
          <GrowthSkillList items={ranked} />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
