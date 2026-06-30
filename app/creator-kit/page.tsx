import type { Metadata } from 'next'
import Link from 'next/link'
import {
  MarketingButtonLink,
  MarketingFeatureGrid,
  MarketingHero,
  MarketingMetricStrip,
  MarketingPageShell,
} from '@/components/marketing-page'
import { getAgentProvenProfile } from '@/lib/agent-proven'
import { getAgentOutcomeStatsMap, getAllSkills } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Creator Kit for AI Agent Skills',
  description:
    'README badges, canonical skill pages, Agent Proven badges, X share drafts, and claim links for AI agent skill creators.',
  alternates: {
    canonical: 'https://www.openagentskill.com/creator-kit',
  },
  openGraph: {
    title: 'OpenAgentSkill Creator Kit',
    description:
      'Turn a listed skill into a shareable, auditable, agent-readable asset with badges, canonical pages, and X growth links.',
    url: 'https://www.openagentskill.com/creator-kit',
    type: 'website',
  },
}

const features = [
  {
    label: 'README badges',
    title: 'Show trust where developers decide',
    copy: 'Add Trust, Audit, Agent Proven, and GitHub star badges to the project README with links back to the canonical listing.',
  },
  {
    label: 'Share cards',
    title: 'Use one canonical URL for launches',
    copy: 'Every skill page has Open Graph metadata and X share routes for concise launch posts and creator replies.',
  },
  {
    label: 'Claim loop',
    title: 'Let authors improve the listing',
    copy: 'Creators can submit fixes, clarify install commands, improve metadata, and point users to the safest workflow.',
  },
]

function badgeMarkdown(slug: string) {
  return `[![OpenAgentSkill Trust](https://www.openagentskill.com/api/badge/${slug}?metric=trust&label=Trust)](https://www.openagentskill.com/skills/${slug})
[![OpenAgentSkill Audit](https://www.openagentskill.com/api/badge/${slug}?metric=audit&label=Audit)](https://www.openagentskill.com/skills/${slug}/audit)
[![Agent Proven](https://www.openagentskill.com/api/badge/${slug}?metric=proven&label=Agent%20Proven)](https://www.openagentskill.com/skills/${slug})`
}

function xDraft(name: string, slug: string, stars: number) {
  return `Added to OpenAgentSkill: ${name}

Reusable skill for AI agents.
${formatCompactNumber(stars)} GitHub stars.

Trust, audit, install handoff, and Agent Proven signals:
https://www.openagentskill.com/skills/${slug}`
}

export default async function CreatorKitPage() {
  const [skills, outcomeStatsMap] = await Promise.all([
    getAllSkills('stars', undefined, 16).catch(() => []),
    getAgentOutcomeStatsMap().catch((): Awaited<ReturnType<typeof getAgentOutcomeStatsMap>> => ({})),
  ])
  const featured = skills.filter((skill) => Number(skill.github_stars || 0) >= 500).slice(0, 6)
  const sample = featured[0]

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Creator growth kit"
        title="Make every skill page worth sharing."
        description={
          <>
            OpenAgentSkill gives creators a canonical listing, README badges, an audit page, an install handoff, and a
            shareable X draft so agent-skill projects can earn trust and qualified traffic.
          </>
        }
        actions={
          <>
            <MarketingButtonLink href="/submit" variant="primary">
              Submit or claim a skill
            </MarketingButtonLink>
            <MarketingButtonLink href="/api-docs#skill-badges">
              Badge API docs
            </MarketingButtonLink>
          </>
        }
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: '4', label: 'Badge types' },
              { value: 'X', label: 'Share drafts' },
              { value: 'Audit', label: 'Trust page' },
            ]}
          />
        }
      />

      <section className="border-b border-border bg-card/35">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <MarketingFeatureGrid items={features} />
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Copy into README</p>
            <h2 className="mt-3 font-display text-3xl font-normal leading-tight">Trust, audit, and Agent Proven badges.</h2>
            <p className="mt-4 text-sm leading-6 text-secondary">
              Use the skill slug after the listing is live. The badges are SVG, cacheable, and link back to the canonical
              OpenAgentSkill page so developers and agents can inspect install risk before trying the skill.
            </p>
          </div>
          <pre className="min-w-0 overflow-x-auto rounded-[8px] border border-border bg-card p-4 text-xs leading-6 text-secondary">
            <code>{badgeMarkdown(sample?.slug || 'your-skill-slug')}</code>
          </pre>
        </div>
      </section>

      <section className="border-b border-border bg-[#fbfaf7]">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Creator-ready examples</p>
              <h2 className="mt-3 font-display text-3xl font-normal leading-tight">High-signal skills with share assets.</h2>
            </div>
            <Link href="/x-kit" className="text-sm text-secondary underline underline-offset-4 hover:text-foreground">
              Open X Growth Kit
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {featured.map((skill) => {
              const trust = getSkillTrustProfile(skill, false, null, outcomeStatsMap[skill.slug] || null)
              const proven = getAgentProvenProfile(outcomeStatsMap[skill.slug] || null)

              return (
                <article key={skill.slug} className="border border-border bg-background p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/skills/${skill.slug}`} className="group block min-w-0">
                        <h3 className="text-balance font-display text-2xl font-normal leading-tight group-hover:text-secondary">
                          {skill.name}
                        </h3>
                      </Link>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-secondary">{skill.description}</p>
                    </div>
                    <span className="shrink-0 rounded-[999px] border border-border px-3 py-1 font-mono text-[11px] text-secondary">
                      {formatCompactNumber(skill.github_stars || 0)} stars
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-px border border-border bg-border text-center">
                    <div className="bg-card p-3">
                      <p className="font-mono text-lg">{trust.score}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase text-secondary">Trust</p>
                    </div>
                    <div className="bg-card p-3">
                      <p className="font-mono text-lg">{proven.metrics.totalOutcomes > 0 ? proven.score : '-'}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase text-secondary">Proven</p>
                    </div>
                    <div className="bg-card p-3">
                      <p className="font-mono text-lg">{skill.license || 'Unknown'}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase text-secondary">License</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Link
                      href={`/api/badge/${skill.slug}?metric=proven&label=Agent%20Proven`}
                      prefetch={false}
                      className="rounded-[8px] border border-border px-3 py-2 text-center text-xs font-semibold text-secondary transition-colors hover:border-foreground hover:text-foreground"
                    >
                      Preview Proven badge
                    </Link>
                    <Link
                      href={`/api/x/share?skill_slug=${encodeURIComponent(skill.slug)}`}
                      prefetch={false}
                      className="rounded-[8px] border border-border px-3 py-2 text-center text-xs font-semibold text-secondary transition-colors hover:border-foreground hover:text-foreground"
                    >
                      Generate X draft
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Launch copy</p>
            <h2 className="mt-3 font-display text-3xl font-normal leading-tight">A concise X draft for each listing.</h2>
            <p className="mt-4 text-sm leading-6 text-secondary">
              Keep the post human, short, and useful. Put the canonical OpenAgentSkill URL in the post when you want the
              card, or move it to the first reply when the post needs to read like a native recommendation.
            </p>
          </div>
          <pre className="min-w-0 overflow-x-auto rounded-[8px] border border-border bg-card p-4 text-sm leading-7 text-secondary whitespace-pre-wrap">
            <code>{xDraft(sample?.name || 'Your Skill', sample?.slug || 'your-skill-slug', Number(sample?.github_stars || 0))}</code>
          </pre>
        </div>
      </section>
    </MarketingPageShell>
  )
}
