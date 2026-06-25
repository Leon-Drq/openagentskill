import type { Metadata } from 'next'
import Link from 'next/link'
import { GrowthSkillList } from '@/components/growth-skill-list'
import { MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
import { getAllSkills } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import { getOfficialCreatorSummaries } from '@/lib/seo/growth-directories'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Official AI Agent Skills from Technology Makers | OpenAgentSkill',
  description:
    'Browse official and ecosystem-maker AI agent skills from companies and organizations such as OpenAI, Anthropic, Vercel, Microsoft, Supabase, Google, Firecrawl, and more.',
  alternates: {
    canonical: 'https://www.openagentskill.com/official',
  },
  openGraph: {
    title: 'Official AI Agent Skills - OpenAgentSkill',
    description: 'Technology-maker skill pages ranked by quality, trust, adoption, and maintenance signals.',
    url: 'https://www.openagentskill.com/official',
    type: 'website',
  },
}

export default async function OfficialSkillsPage() {
  const skills = await getAllSkills('quality', undefined, 1200).catch(() => [])
  const summaries = getOfficialCreatorSummaries(skills)
  const officialSkillCount = summaries.reduce((sum, summary) => sum + summary.skillCount, 0)
  const totalStars = summaries.reduce((sum, summary) => sum + summary.totalStars, 0)
  const topOfficialSkills = summaries
    .flatMap((summary) => summary.ranked.slice(0, 3))
    .sort((a, b) => b.score - a.score || b.skill.github_stars - a.skill.github_stars)
    .slice(0, 24)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Official AI Agent Skills',
    description: metadata.description,
    url: 'https://www.openagentskill.com/official',
    mainEntity: summaries.slice(0, 12).map((summary, index) => ({
      '@type': 'Organization',
      position: index + 1,
      name: summary.creator.name,
      url: `https://www.openagentskill.com/official/${summary.creator.slug}`,
    })),
  }

  return (
    <MarketingPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MarketingHero
        eyebrow="Official skills"
        title="Official AI agent skills from technology makers."
        description="Start with skills from recognizable ecosystem creators, then inspect quality, trust, install readiness, GitHub adoption, and maintenance before adding them to an agent workflow."
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: summaries.length, label: 'Makers' },
              { value: officialSkillCount, label: 'Skills' },
              { value: formatCompactNumber(totalStars), label: 'Stars' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
        <section className="grid gap-3 border-b border-border py-10 md:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => (
            <Link
              key={summary.creator.slug}
              href={`/official/${summary.creator.slug}`}
              className="group flex min-h-[240px] flex-col justify-between border border-border bg-card p-5 transition-colors hover:border-foreground"
            >
              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">{summary.creator.focus}</p>
                <h2 className="font-display text-2xl font-semibold group-hover:text-secondary">{summary.creator.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-secondary">{summary.creator.description}</p>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-px border border-border bg-border text-center">
                <div className="bg-background p-3">
                  <div className="font-mono text-lg">{summary.skillCount}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-secondary">Skills</div>
                </div>
                <div className="bg-background p-3">
                  <div className="font-mono text-lg">{formatCompactNumber(summary.totalStars)}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-secondary">Stars</div>
                </div>
                <div className="bg-background p-3">
                  <div className="truncate font-mono text-lg">{summary.ranked[0]?.skill.name || '-'}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-secondary">Top</div>
                </div>
              </div>
            </Link>
          ))}
        </section>

        <section className="py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Top official picks</p>
              <h2 className="font-display text-2xl font-semibold">High-confidence skills from recognized makers</h2>
            </div>
            <Link href="/trending" className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
              View trending skills
            </Link>
          </div>
          <GrowthSkillList items={topOfficialSkills} />
        </section>
      </div>
    </MarketingPageShell>
  )
}
