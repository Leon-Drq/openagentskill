import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GrowthSkillList } from '@/components/growth-skill-list'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import {
  OFFICIAL_CREATORS,
  getOfficialCreator,
  getSkillsForOfficialCreator,
} from '@/lib/seo/growth-directories'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return OFFICIAL_CREATORS.map((creator) => ({ creator: creator.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ creator: string }>
}): Promise<Metadata> {
  const { creator: slug } = await params
  const creator = getOfficialCreator(slug)
  if (!creator) return { title: 'Official Creator Not Found' }

  return {
    title: `${creator.name} AI Agent Skills`,
    description: `${creator.description} Ranked with OpenAgentSkill quality, trust, GitHub adoption, and maintenance signals.`,
    alternates: {
      canonical: `https://www.openagentskill.com/official/${creator.slug}`,
    },
    openGraph: {
      title: `${creator.name} AI Agent Skills - OpenAgentSkill`,
      description: creator.description,
      url: `https://www.openagentskill.com/official/${creator.slug}`,
      type: 'website',
    },
  }
}

export default async function OfficialCreatorPage({
  params,
}: {
  params: Promise<{ creator: string }>
}) {
  const { creator: slug } = await params
  const creator = getOfficialCreator(slug)
  if (!creator) notFound()

  const skills = await getAllSkills('quality').catch(() => [])
  const ranked = getSkillsForOfficialCreator(skills, creator, 48)
  const totalStars = ranked.reduce((sum, item) => sum + Number(item.skill.github_stars || 0), 0)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${creator.name} AI Agent Skills`,
    description: creator.description,
    url: `https://www.openagentskill.com/official/${creator.slug}`,
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
          <Link href="/official" className="hover:text-foreground">Official</Link>
          <span>/</span>
          <span className="text-foreground">{creator.name}</span>
        </nav>

        <section className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-secondary">{creator.focus}</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
              {creator.name} AI agent skills.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{creator.description}</p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary">
              This page matches skills to known {creator.name} repository owners and ranks them by quality, trust,
              adoption, freshness, and install readiness.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{ranked.length}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Skills</div>
            </div>
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{formatCompactNumber(totalStars)}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Stars</div>
            </div>
            <div className="bg-background p-4">
              <div className="font-mono text-2xl">{ranked[0]?.badge.split(' · ')[1] || '-'}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Top quality</div>
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Ranked official skills</p>
              <h2 className="font-display text-2xl font-semibold">Best {creator.name} skill candidates</h2>
            </div>
            <Link href="/compare/openagentskill-vs-skills-sh" className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
              Compare discovery models
            </Link>
          </div>
          <GrowthSkillList items={ranked} />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
