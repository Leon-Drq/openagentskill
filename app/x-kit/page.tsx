import type { Metadata } from 'next'
import Link from 'next/link'
import {
  MarketingHero,
  MarketingMetricStrip,
  MarketingPageShell,
} from '@/components/marketing-page'
import { getAllSkills } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import { buildCommunityIndexedReplyText, buildManualXMainText, buildManualXReplyText, buildXIntentUrl } from '@/lib/x/poster'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'OpenAgentSkill X Growth Kit',
  description:
    'Generate scenario-led X drafts for high-quality AI agent skills from the OpenAgentSkill registry.',
  alternates: {
    canonical: 'https://www.openagentskill.com/x-kit',
  },
  openGraph: {
    title: 'OpenAgentSkill X Growth Kit',
    description: 'Ready-to-share curator-style drafts for high-quality AI agent skills.',
    url: 'https://www.openagentskill.com/x-kit',
    type: 'website',
  },
}

export default async function XKitPage() {
  const skills = await getAllSkills('quality', undefined, 1200).catch(() => [])
  const candidates = skills
    .filter((skill) => Number(skill.github_stars || 0) >= 500)
    .slice(0, 8)

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Curator notes"
        title="Share useful skills with a more human story."
        description="Each draft starts with a practical observation, explains the agent use case, then links back to the canonical skill page for discovery and attribution."
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: candidates.length, label: 'Drafts' },
              {
                value: formatCompactNumber(
                  candidates.reduce((sum, skill) => sum + Number(skill.github_stars || 0), 0)
                ),
                label: 'Stars',
              },
              { value: 'OAuth', label: 'Reply path' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
        <section className="py-10">
          <div className="mb-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border border-border bg-card p-5">
              <p className="mb-2 text-xs uppercase text-secondary">Creator reply loop</p>
              <h2 className="font-display text-2xl font-semibold">Turn X discovery into claimable listings.</h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                When a creator shares a useful skill, add the public listing, then generate an attribution-first reply
                that invites them to claim it. Public links stay draft-only; protected automation can post after X OAuth.
              </p>
            </div>
            <div className="min-w-0 border border-border bg-background p-5">
              <p className="mb-3 text-xs uppercase text-secondary">Reply APIs</p>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-[8px] border border-border bg-card p-4 font-mono text-xs leading-relaxed text-secondary">
                <code>{`GET  /api/x/reply?skill_slug=crawl4ai&tweet_url=https://x.com/user/status/123
POST /api/x/reply`}</code>
              </pre>
            </div>
          </div>

          {candidates.length === 0 ? (
            <div className="border border-border p-8">
              <h2 className="font-display text-2xl font-semibold">No share candidates yet.</h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                The importer is still collecting skills with 500+ stars.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {candidates.map((skill) => {
                const mainText = buildManualXMainText(skill)
                const replyText = buildManualXReplyText(skill)
                const creatorReplyText = buildCommunityIndexedReplyText(skill)

                return (
                  <article key={skill.slug} className="flex min-w-0 flex-col border border-border bg-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase text-secondary">{skill.category}</p>
                        <Link href={`/skills/${skill.slug}`} className="mt-1 block font-display text-xl font-semibold hover:text-secondary">
                          {skill.name}
                        </Link>
                      </div>
                      <span className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-secondary">
                        {formatCompactNumber(skill.github_stars || 0)} stars
                      </span>
                    </div>

                    <pre className="mt-5 whitespace-pre-wrap break-words rounded-[8px] border border-border bg-background p-4 font-mono text-xs leading-relaxed text-secondary">
                      {mainText}
                    </pre>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <a
                        href={buildXIntentUrl(mainText)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-foreground bg-foreground px-3 py-2 text-center text-sm font-semibold text-background transition-opacity hover:opacity-80"
                      >
                        Open X draft
                      </a>
                      <Link
                        href={`/api/x/share?skill_slug=${encodeURIComponent(skill.slug)}`}
                        prefetch={false}
                        className="border border-border px-3 py-2 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                      >
                        JSON draft API
                      </Link>
                    </div>

                    <details className="mt-4 border-t border-border pt-4">
                      <summary className="cursor-pointer text-xs font-semibold text-secondary hover:text-foreground">
                        Link reply draft
                      </summary>
                      <pre className="mt-3 whitespace-pre-wrap break-words rounded-[8px] border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-secondary">
                        {replyText}
                      </pre>
                      <a
                        href={buildXIntentUrl(replyText)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block border border-border px-3 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                      >
                        Open reply draft
                      </a>
                    </details>

                    <details className="mt-3 border-t border-border pt-4">
                      <summary className="cursor-pointer text-xs font-semibold text-secondary hover:text-foreground">
                        Creator claim reply
                      </summary>
                      <pre className="mt-3 whitespace-pre-wrap break-words rounded-[8px] border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-secondary">
                        {creatorReplyText}
                      </pre>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <a
                          href={buildXIntentUrl(creatorReplyText)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border border-border px-3 py-2 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                        >
                          Open creator reply
                        </a>
                        <Link
                          href={`/api/x/reply?skill_slug=${encodeURIComponent(skill.slug)}&tweet_url=https://x.com/user/status/123`}
                          prefetch={false}
                          className="border border-border px-3 py-2 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                        >
                          Reply API
                        </Link>
                      </div>
                    </details>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </MarketingPageShell>
  )
}
