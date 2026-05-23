import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InstallCommand } from '@/components/install-command'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills } from '@/lib/db/skills'
import { getSkillStackBySlug, selectSkillsForStack } from '@/lib/collections'
import { getSkillQualityProfile, formatCompactNumber } from '@/lib/quality'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const stack = getSkillStackBySlug(slug)
  if (!stack) return { title: 'Skill Stack Not Found' }

  return {
    title: `${stack.title} | OpenAgentSkill`,
    description: stack.description,
    alternates: {
      canonical: `https://www.openagentskill.com/collections/${slug}`,
    },
    openGraph: {
      title: `${stack.title} — OpenAgentSkill`,
      description: stack.description,
      url: `https://www.openagentskill.com/collections/${slug}`,
      type: 'article',
    },
  }
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const stack = getSkillStackBySlug(slug)
  if (!stack) notFound()

  const allSkills = await getAllSkills('quality').catch(() => [])
  const picks = selectSkillsForStack(allSkills, stack, 8)
  const compareUrl = `/compare?skills=${encodeURIComponent(picks.slice(0, 4).map((skill) => skill.slug).join(','))}`

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 flex items-center gap-2 text-sm text-secondary">
          <Link href="/collections" className="hover:text-foreground">Collections</Link>
          <span>/</span>
          <span className="text-foreground">{stack.shortTitle}</span>
        </nav>

        <section className="border-b border-border pb-10">
          <p className="mb-4 text-xs uppercase tracking-widest text-secondary">{stack.eyebrow}</p>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="font-display text-4xl font-bold leading-tight text-balance sm:text-6xl">
                {stack.title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{stack.description}</p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-secondary">
                Built for {stack.persona}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={compareUrl}
                  className="border border-foreground bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
                >
                  Compare top picks
                </Link>
                <Link
                  href={`/skills?useCase=${stack.useCaseSlug}&quality=excellent`}
                  className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                >
                  Browse matching skills
                </Link>
              </div>
            </div>
            <div className="border border-border p-5">
              <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Outcomes</p>
              <ul className="space-y-3 text-sm text-secondary">
                {stack.outcomes.map((outcome) => (
                  <li key={outcome} className="border-l border-border pl-3">{outcome}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Workflow map</p>
            <h2 className="font-display text-2xl font-semibold">How the stack fits together</h2>
          </div>
          <div className="grid gap-px border border-border bg-border md:grid-cols-4">
            {stack.workflowSteps.map((step, index) => (
              <div key={step.title} className="bg-background p-4">
                <div className="mb-3 font-mono text-xs text-secondary">0{index + 1}</div>
                <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Recommended stack</p>
            <h2 className="font-display text-2xl font-semibold">Start with these skills</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Ranked by workflow relevance, quality score, GitHub adoption, and maintenance freshness.
            </p>
          </div>
          <div className="divide-y divide-border border border-border">
            {picks.map((skill, index) => {
              const quality = getSkillQualityProfile(skill)
              return (
                <article key={skill.slug} className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm text-secondary">#{index + 1}</span>
                        <Link href={`/skills/${skill.slug}`} className="font-display text-xl font-semibold hover:text-secondary">
                          {skill.name}
                        </Link>
                        <span className="border border-border px-2 py-0.5 text-xs font-mono text-secondary">
                          {quality.label} · {quality.score}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-secondary">{skill.description}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs font-mono text-secondary">
                        <span>{formatCompactNumber(skill.github_stars || 0)} stars</span>
                        <span>{skill.license || 'Unknown license'}</span>
                        <span>{skill.category}</span>
                      </div>
                    </div>
                    <Link
                      href={`/compare?skills=${encodeURIComponent(picks.slice(0, 3).map((item) => item.slug).concat(skill.slug).filter((value, position, values) => values.indexOf(value) === position).slice(0, 4).join(','))}`}
                      className="shrink-0 border border-border px-3 py-2 text-center text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
                    >
                      Compare
                    </Link>
                  </div>
                  {(skill.install_command || skill.github_repo) && (
                    <div className="mt-4">
                      <InstallCommand
                        command={skill.install_command || `npx skills add ${skill.github_repo}`}
                        skillSlug={skill.slug}
                        compact
                      />
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        <section className="grid gap-8 py-10 lg:grid-cols-2">
          <div className="border border-border p-5">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Ideal for</p>
            <ul className="space-y-2 text-sm leading-relaxed text-secondary">
              {stack.idealFor.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div className="border border-border p-5">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Avoid when</p>
            <ul className="space-y-2 text-sm leading-relaxed text-secondary">
              {stack.avoidWhen.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
