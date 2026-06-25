import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills } from '@/lib/db/skills'
import { SKILL_STACKS } from '@/lib/collections'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import { getUseCaseBySlug, selectSkillsForUseCase } from '@/lib/use-cases'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const useCase = getUseCaseBySlug(slug)
  if (!useCase) return { title: 'Guide Not Found' }

  const title = `Best ${useCase.shortTitle} skills for AI agents`
  const description = `Compare high-quality AI agent skills for ${useCase.shortTitle.toLowerCase()}, including quality signals, workflow fit, and installation paths.`

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.openagentskill.com/blog/use-cases/${slug}`,
    },
    openGraph: {
      title: `${title} — OpenAgentSkill Update`,
      description,
      url: `https://www.openagentskill.com/blog/use-cases/${slug}`,
      type: 'article',
    },
  }
}

export default async function BlogUseCaseGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const useCase = getUseCaseBySlug(slug)
  if (!useCase) notFound()

  const allSkills = await getAllSkills('quality', undefined, 1200).catch(() => [])
  const skills = selectSkillsForUseCase(allSkills, useCase, 10)
  const stacks = SKILL_STACKS.filter((stack) => stack.useCaseSlug === useCase.slug)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Best ${useCase.shortTitle} skills for AI agents`,
    description: useCase.description,
    url: `https://www.openagentskill.com/blog/use-cases/${slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'OpenAgentSkill',
      url: 'https://www.openagentskill.com',
    },
  }

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 flex items-center gap-2 text-sm text-secondary">
          <Link href="/blog" className="hover:text-foreground">Blog</Link>
          <span>/</span>
          <span className="text-foreground">{useCase.shortTitle}</span>
        </nav>

        <article>
          <header className="border-b border-border pb-10">
            <p className="mb-4 text-xs uppercase tracking-widest text-secondary">OpenAgentSkill guide</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-balance sm:text-6xl">
              Best {useCase.shortTitle.toLowerCase()} skills for AI agents
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{useCase.description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/use-cases/${useCase.slug}`}
                className="border border-foreground bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
              >
                Open use-case page
              </Link>
              <Link
                href={`/skills?useCase=${useCase.slug}&quality=excellent`}
                className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Browse excellent matches
              </Link>
            </div>
          </header>

          <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">When to use this guide</p>
              <h2 className="font-display text-2xl font-semibold">Start from the job, then shortlist the tools.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {useCase.workflows.map((workflow) => (
                <div key={workflow} className="border border-border p-4">
                  <h3 className="font-display text-lg font-semibold">{workflow}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-secondary">
                    Use quality and freshness signals to decide whether a skill belongs in this workflow.
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="border-b border-border py-10">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Shortlist</p>
                <h2 className="font-display text-2xl font-semibold">Top skills to evaluate</h2>
              </div>
              {skills.length > 1 && (
                <Link
                  href={`/compare?skills=${encodeURIComponent(skills.slice(0, 4).map((skill) => skill.slug).join(','))}`}
                  className="self-start border border-border px-4 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground sm:self-auto"
                >
                  Compare top 4
                </Link>
              )}
            </div>

            <div className="divide-y divide-border border border-border">
              {skills.map((skill, index) => {
                const quality = getSkillQualityProfile(skill)
                return (
                  <section key={skill.slug} className="p-5">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm text-secondary">#{index + 1}</span>
                      <Link href={`/skills/${skill.slug}`} className="font-display text-xl font-semibold hover:text-secondary">
                        {skill.name}
                      </Link>
                      <span className="border border-border px-2 py-0.5 text-xs font-mono text-secondary">
                        {quality.label} · {quality.score}
                      </span>
                      <span className="border border-border px-2 py-0.5 text-xs font-mono text-secondary">
                        {formatCompactNumber(skill.github_stars || 0)} stars
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-secondary">{skill.description}</p>
                    <p className="mt-3 text-sm leading-relaxed text-foreground">
                      Best fit: {quality.summary}
                    </p>
                  </section>
                )
              })}
            </div>
          </section>

          {stacks.length > 0 && (
            <section className="grid gap-8 py-10 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Related stack</p>
                <h2 className="font-display text-2xl font-semibold">Use these skills as part of a workflow.</h2>
              </div>
              <div className="grid gap-3">
                {stacks.map((stack) => (
                  <Link
                    key={stack.slug}
                    href={`/collections/${stack.slug}`}
                    className="border border-border p-5 transition-colors hover:border-foreground"
                  >
                    <p className="text-xs uppercase tracking-widest text-secondary">{stack.eyebrow}</p>
                    <h3 className="mt-2 font-display text-xl font-semibold">{stack.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-secondary">{stack.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
