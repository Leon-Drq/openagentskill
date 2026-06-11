import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills } from '@/lib/db/skills'
import { formatCompactNumber } from '@/lib/quality'
import { buildManualXMainText, buildManualXReplyText, buildXIntentUrl } from '@/lib/x/poster'

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
    description: 'Ready-to-share OpenAgentSkill Update drafts for high-quality AI agent skills.',
    url: 'https://www.openagentskill.com/x-kit',
    type: 'website',
  },
}

export default async function XKitPage() {
  const skills = await getAllSkills('quality').catch(() => [])
  const candidates = skills
    .filter((skill) => Number(skill.github_stars || 0) >= 500)
    .slice(0, 8)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="border-b border-border pb-10">
          <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-secondary">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <span className="text-foreground">X Growth Kit</span>
          </nav>
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="mb-4 text-xs uppercase text-secondary">OpenAgentSkill Update</p>
              <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
                Share useful skills with a stronger story.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
                Each draft turns a registry listing into a concrete agent use case, then links back to the canonical skill page for discovery and attribution.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{candidates.length}</div>
                <div className="mt-1 text-xs uppercase text-secondary">Drafts</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{formatCompactNumber(candidates.reduce((sum, skill) => sum + Number(skill.github_stars || 0), 0))}</div>
                <div className="mt-1 text-xs uppercase text-secondary">Stars</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">0</div>
                <div className="mt-1 text-xs uppercase text-secondary">API credits</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10">
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
                        Reply draft
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
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
