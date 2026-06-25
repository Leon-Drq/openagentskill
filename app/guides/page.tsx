import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
import { getAllSkills } from '@/lib/db/skills'
import { GROWTH_GUIDES } from '@/lib/seo/growth-guides'
import { formatCompactNumber } from '@/lib/quality'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Agent Skills Guides',
  description:
    'Practical OpenAgentSkill guides for finding, comparing, and installing AI agent skills for Claude Code, Codex, web scraping, RAG, and agent workflows.',
  alternates: {
    canonical: 'https://www.openagentskill.com/guides',
  },
  openGraph: {
    title: 'Agent Skills Guides - OpenAgentSkill',
    description: 'Find the right Agent Skills with practical best-of, installation, and comparison guides.',
    url: 'https://www.openagentskill.com/guides',
    type: 'website',
  },
}

const intentLabels: Record<string, string> = {
  best: 'Best-of guides',
  install: 'Installation guides',
  compare: 'Comparison guides',
  standard: 'Ecosystem guides',
}

export default async function GuidesPage() {
  const skills = await getAllSkills('quality', undefined, 1200).catch(() => [])
  const totalStars = skills.reduce((sum, skill) => sum + Number(skill.github_stars || 0), 0)
  const groupedGuides = GROWTH_GUIDES.reduce<Record<string, typeof GROWTH_GUIDES>>((groups, guide) => {
    groups[guide.intent] = [...(groups[guide.intent] || []), guide]
    return groups
  }, {})

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Guides"
        title="Practical guides for choosing agent skills."
        description="OpenAgentSkill guides turn search intent into action: best skills for a workflow, install paths for a platform, and side-by-side comparisons for real agent builders."
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: GROWTH_GUIDES.length, label: 'Guides' },
              { value: skills.length.toLocaleString(), label: 'Skills' },
              { value: formatCompactNumber(totalStars), label: 'Stars' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
        <section className="border-b border-border py-10">
          <div className="grid gap-4 lg:grid-cols-3">
            {GROWTH_GUIDES.slice(0, 3).map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group flex min-h-[260px] flex-col justify-between border border-border bg-card p-5 transition-colors hover:border-foreground"
              >
                <div>
                  <p className="mb-3 text-xs uppercase tracking-widest text-secondary">{guide.eyebrow}</p>
                  <h2 className="font-display text-2xl font-semibold leading-tight group-hover:text-secondary">
                    {guide.shortTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{guide.description}</p>
                </div>
                <div className="mt-8 flex flex-wrap gap-2">
                  <span className="border border-border px-2 py-1 text-xs font-mono text-secondary">
                    {guide.intent}
                  </span>
                  {guide.platformLabel && (
                    <span className="border border-border px-2 py-1 text-xs font-mono text-secondary">
                      {guide.platformLabel}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-10 py-10">
          {Object.entries(groupedGuides).map(([intent, guides]) => (
            <div key={intent}>
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-widest text-secondary">{intent}</p>
                  <h2 className="font-display text-2xl font-semibold">{intentLabels[intent] || 'Guides'}</h2>
                </div>
                <span className="text-sm text-secondary">{guides.length} pages</span>
              </div>

              <div className="divide-y divide-border border-y border-border">
                {guides.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="grid gap-3 py-5 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold">{guide.title}</h3>
                        <span className="border border-border px-2 py-0.5 text-xs text-secondary">{guide.eyebrow}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-secondary">{guide.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-mono text-secondary sm:justify-end">
                      {guide.useCaseSlug && <span>{guide.useCaseSlug}</span>}
                      {guide.platformLabel && <span>{guide.platformLabel}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </MarketingPageShell>
  )
}
