import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
import { getAllSkills } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import { AGENT_PROFILES, rankSkillsForAgent } from '@/lib/seo/growth-directories'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Agent Skills by Agent | Claude Code, Codex, Cursor, Copilot',
  description:
    'Find AI agent skills for Claude Code, Codex, Cursor, GitHub Copilot, Windsurf, Gemini, Cline, AMP, and Antigravity.',
  alternates: {
    canonical: 'https://www.openagentskill.com/agents',
  },
  openGraph: {
    title: 'AI Agent Skills by Agent - OpenAgentSkill',
    description: 'Agent-specific skill shortlists ranked by workflow fit, quality, trust, and adoption.',
    url: 'https://www.openagentskill.com/agents',
    type: 'website',
  },
}

export default async function AgentsHubPage() {
  const skills = await getAllSkills('quality', undefined, 1200).catch(() => [])
  const summaries = AGENT_PROFILES.map((profile) => {
    const ranked = rankSkillsForAgent(skills, profile, 6)
    const totalStars = ranked.reduce((sum, item) => sum + Number(item.skill.github_stars || 0), 0)
    return { profile, ranked, totalStars }
  })

  const totalMatches = summaries.reduce((sum, summary) => sum + summary.ranked.length, 0)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'AI Agent Skills by Agent',
    description: metadata.description,
    url: 'https://www.openagentskill.com/agents',
    mainEntity: summaries.map((summary, index) => ({
      '@type': 'CollectionPage',
      position: index + 1,
      name: `${summary.profile.name} skills`,
      url: `https://www.openagentskill.com/agents/${summary.profile.slug}`,
    })),
  }

  return (
    <MarketingPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MarketingHero
        eyebrow="Agent fit"
        title="Find skills for the agent you actually use."
        description="Claude Code, Codex, Cursor, Copilot, Windsurf, Gemini, Cline, AMP, and Antigravity each have different workflow needs. These pages rank skills by agent fit plus quality, trust, adoption, and freshness."
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: AGENT_PROFILES.length, label: 'Agents' },
              { value: totalMatches, label: 'Shortlisted' },
              { value: formatCompactNumber(skills.length), label: 'Indexed' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
        <section className="grid gap-3 py-10 md:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => (
            <Link
              key={summary.profile.slug}
              href={`/agents/${summary.profile.slug}`}
              className="group flex min-h-[270px] flex-col justify-between border border-border bg-card p-5 transition-colors hover:border-foreground"
            >
              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">{summary.profile.eyebrow}</p>
                <h2 className="font-display text-2xl font-semibold group-hover:text-secondary">{summary.profile.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-secondary">{summary.profile.description}</p>
              </div>
              <div className="mt-8">
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Leading picks</p>
                <div className="space-y-2">
                  {summary.ranked.slice(0, 3).map((item) => (
                    <div key={item.skill.slug} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{item.skill.name}</span>
                      <span className="shrink-0 font-mono text-xs text-secondary">{item.badge}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </MarketingPageShell>
  )
}
