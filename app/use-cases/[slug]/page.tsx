import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InstallCommand } from '@/components/install-command'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { convertSkillRecordToManifest, getAllSkills } from '@/lib/db/skills'
import { USE_CASES, getUseCaseBySlug, selectSkillsForUseCase } from '@/lib/use-cases'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return USE_CASES.map((useCase) => ({ slug: useCase.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const useCase = getUseCaseBySlug(slug)
  if (!useCase) return { title: 'Use Case Not Found' }

  return {
    title: useCase.title,
    description: useCase.description,
    alternates: {
      canonical: `https://www.openagentskill.com/use-cases/${useCase.slug}`,
    },
    openGraph: {
      title: `${useCase.shortTitle} — OpenAgentSkill Use Cases`,
      description: useCase.description,
      url: `https://www.openagentskill.com/use-cases/${useCase.slug}`,
      type: 'website',
    },
  }
}

function formatNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`
  return value.toLocaleString()
}

function formatDate(value: string | null) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const useCase = getUseCaseBySlug(slug)
  if (!useCase) notFound()

  const allSkills = await getAllSkills('quality').catch(() => [])
  const matchedSkills = selectSkillsForUseCase(allSkills, useCase, 18)
  const heroSkills = matchedSkills.slice(0, 3)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 flex items-center gap-2 text-sm text-secondary">
          <Link href="/use-cases" className="hover:text-foreground">
            Use cases
          </Link>
          <span>/</span>
          <span className="text-foreground">{useCase.shortTitle}</span>
        </nav>

        <section className="grid gap-10 border-b border-border pb-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-secondary">{useCase.eyebrow}</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">{useCase.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{useCase.description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/skills?q=${encodeURIComponent(useCase.keywords[0])}`}
                className="border border-foreground bg-foreground px-5 py-2 text-sm text-background transition-colors hover:bg-background hover:text-foreground"
              >
                Browse matching skills
              </Link>
              <Link
                href={`/api/agent/recommend?task=${encodeURIComponent(useCase.heroPrompt)}&format=text`}
                className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Agent API prompt
              </Link>
            </div>
          </div>

          <div className="border border-border bg-card p-5">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Try this task</p>
            <p className="text-lg leading-relaxed text-foreground">{useCase.heroPrompt}</p>
            <div className="mt-5 border-t border-border pt-5">
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Agent should be able to</p>
              <ul className="space-y-2 text-sm text-secondary">
                {useCase.agentTasks.map((task) => (
                  <li key={task} className="flex gap-2">
                    <span className="font-mono text-foreground/40">+</span>
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Workflow map</p>
            <h2 className="font-display text-2xl font-semibold">What to build with these skills</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {useCase.workflows.map((workflow, index) => (
              <div key={workflow} className="border border-border bg-card p-4">
                <div className="font-mono text-xs text-secondary">{String(index + 1).padStart(2, '0')}</div>
                <p className="mt-2 text-sm leading-relaxed">{workflow}</p>
              </div>
            ))}
          </div>
        </section>

        {heroSkills.length > 0 && (
          <section className="border-b border-border py-10">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Best first installs</p>
                <h2 className="font-display text-2xl font-semibold">Start with high-signal skills</h2>
              </div>
              <span className="text-sm text-secondary">{matchedSkills.length} matched skills</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {heroSkills.map((skill) => {
                const manifest = convertSkillRecordToManifest(skill)
                return (
                  <article key={skill.slug} className="border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <Link href={`/skills/${skill.slug}`} className="group min-w-0">
                        <h3 className="font-display text-xl font-semibold leading-tight group-hover:text-secondary">
                          {skill.name}
                        </h3>
                      </Link>
                      {skill.verified && <span className="shrink-0 border border-border px-2 py-1 text-xs font-mono">VERIFIED</span>}
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-secondary">{skill.description}</p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs font-mono text-secondary">
                      <span>{formatNumber(skill.github_stars)} stars</span>
                      <span>{Math.round(Number(skill.quality_score || 0))} quality</span>
                      <span>{formatDate(skill.github_last_pushed_at)} push</span>
                    </div>
                    <div className="mt-5">
                      <InstallCommand command={manifest.technical.installCommand || `npx skills add ${skill.github_repo}`} skillSlug={skill.slug} compact />
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        <section className="py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Skill shortlist</p>
              <h2 className="font-display text-2xl font-semibold">More options for this use case</h2>
            </div>
            <Link href="/skills?sort=quality" className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
              Browse full marketplace
            </Link>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {matchedSkills.slice(3).map((skill) => (
              <Link
                key={skill.slug}
                href={`/skills/${skill.slug}`}
                className="grid gap-3 py-5 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">{skill.name}</h3>
                    <span className="border border-border px-2 py-0.5 text-xs text-secondary">{skill.category}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-secondary">{skill.description}</p>
                </div>
                <div className="flex gap-4 text-xs font-mono text-secondary sm:justify-end">
                  <span>{formatNumber(skill.github_stars)} stars</span>
                  <span>{Math.round(Number(skill.quality_score || 0))} quality</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
