import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketingButtonLink, MarketingHero, MarketingMetricStrip, MarketingPageShell } from '@/components/marketing-page'
import { XAttributionTracker } from '@/components/x-attribution-tracker'
import { getXShortlist, getXShortlistInstallCommand, getXShortlistStars, isXShortlistLane } from '@/lib/x/shortlist'

const BASE_URL = 'https://www.openagentskill.com'

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lane: string }>
}): Promise<Metadata> {
  const { lane } = await params
  if (!isXShortlistLane(lane)) return { title: 'Skill Shortlist Not Found' }

  const shortlist = await getXShortlist(lane).catch(() => null)
  if (!shortlist || shortlist.picks.length < 3) return { title: 'Skill Shortlist Not Found' }
  const url = `${BASE_URL}/shortlists/${lane}`
  const image = `${url}/opengraph-image`

  return {
    title: shortlist.config.title,
    description: shortlist.config.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${shortlist.config.title} - OpenAgentSkill`,
      description: shortlist.config.description,
      url,
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: shortlist.config.title, type: 'image/png' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: shortlist.config.title,
      description: shortlist.config.description,
      images: [{ url: image, alt: shortlist.config.title }],
    },
  }
}

export default async function XShortlistPage({
  params,
}: {
  params: Promise<{ lane: string }>
}) {
  const { lane } = await params
  if (!isXShortlistLane(lane)) notFound()
  const shortlist = await getXShortlist(lane)
  if (shortlist.picks.length < 3) notFound()

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: shortlist.config.title,
    description: shortlist.config.description,
    numberOfItems: shortlist.picks.length,
    itemListElement: shortlist.picks.map((pick, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${BASE_URL}/skills/${pick.skill.slug}`,
      name: pick.skill.name,
      description: pick.reason,
    })),
  }

  return (
    <MarketingPageShell>
      <XAttributionTracker anchorSkillSlug={shortlist.picks[0].skill.slug} lane={shortlist.lane} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MarketingHero
        eyebrow={shortlist.config.eyebrow}
        title={shortlist.config.title}
        description={shortlist.config.description}
        actions={
          <>
            <MarketingButtonLink href={shortlist.config.skillHref} variant="primary">Browse related skills</MarketingButtonLink>
            <MarketingButtonLink href="/resolve">Describe a task</MarketingButtonLink>
          </>
        }
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: shortlist.picks.length, label: 'Selected skills' },
              { value: 'Audit', label: 'Public review' },
              { value: 'Ready', label: 'Install paths' },
            ]}
          />
        }
      />

      <div className="mx-auto max-w-6xl px-6">
        <section className="grid gap-px border-x border-b border-border bg-border md:grid-cols-3">
          {[
            ['Task-first', 'Each skill is here for a job in the workflow, not because its repository is merely popular.'],
            ['Reviewable', 'Open the public audit before adding a skill to a real workspace.'],
            ['Reusable', 'Every pick has an install handoff and an agent-readable detail page.'],
          ].map(([label, copy]) => (
            <div key={label} className="bg-background p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-[#006b4f]">{label}</p>
              <p className="mt-3 text-sm leading-relaxed text-secondary">{copy}</p>
            </div>
          ))}
        </section>

        <section className="py-12 sm:py-16">
          <div className="mb-7 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">The shortlist</p>
              <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">Useful before the next blank prompt.</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-secondary">Selected from public repositories with a direct skill or workflow signal, usable documentation, and a reviewable install path.</p>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {shortlist.picks.map((pick, index) => {
              const installCommand = getXShortlistInstallCommand(pick.skill)
              return (
                <article key={pick.skill.slug} className="grid min-w-0 gap-5 py-7 lg:grid-cols-[74px_minmax(0,1fr)_280px]">
                  <div className="font-mono text-2xl tabular-nums text-secondary">0{index + 1}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="border border-[#006b4f]/30 bg-[#006b4f]/10 px-2 py-1 font-mono text-xs text-[#006b4f]">{pick.role}</span>
                      <span className="font-mono text-xs text-secondary">{getXShortlistStars(pick.skill)}</span>
                    </div>
                    <Link href={`/skills/${pick.skill.slug}`} className="mt-4 block w-fit max-w-full">
                      <h3 className="font-display text-2xl font-semibold leading-tight [overflow-wrap:anywhere] transition-colors hover:text-secondary sm:text-3xl">{pick.skill.name}</h3>
                    </Link>
                    <p className="mt-3 max-w-2xl break-words text-sm leading-relaxed text-secondary">{pick.reason}. {pick.skill.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(pick.skill.tags || []).slice(0, 4).map((tag) => (
                        <span key={tag} className="max-w-full truncate border border-border px-2 py-1 font-mono text-xs text-secondary">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <aside className="min-w-0 border border-border bg-card p-4">
                    <div className="grid grid-cols-2 gap-px border border-border bg-border text-center">
                      <div className="bg-card p-3">
                        <div className="font-mono text-lg text-foreground">{pick.qualityScore}</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-secondary">Quality</div>
                      </div>
                      <div className="bg-card p-3">
                        <div className="font-mono text-lg text-foreground">Review</div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-secondary">Before install</div>
                      </div>
                    </div>
                    <code className="mt-4 block break-words border border-border bg-background p-3 font-mono text-xs leading-relaxed text-secondary [overflow-wrap:anywhere]">{installCommand}</code>
                    <Link href={`/skills/${pick.skill.slug}/audit`} className="mt-3 block border border-border px-3 py-2 text-center text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground">Open audit</Link>
                  </aside>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </MarketingPageShell>
  )
}
