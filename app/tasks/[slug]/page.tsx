import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InstallCommand } from '@/components/install-command'
import { SkillInstallTargets } from '@/components/skill-install-targets'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAgentTaskBySlug, selectSkillsForTask } from '@/lib/agent-tasks'
import { getAllSkills, getSkillsBySlugs, searchSkills, type SkillRecord } from '@/lib/db/skills'
import { getSkillInstallTargets } from '@/lib/install-targets'
import { getUseCaseBySlug } from '@/lib/use-cases'

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const task = getAgentTaskBySlug(slug)
  if (!task) return { title: 'Task Not Found' }

  return {
    title: `${task.title} - AI Agent Skill Task`,
    description: task.description,
    alternates: {
      canonical: `https://www.openagentskill.com/tasks/${task.slug}`,
    },
    openGraph: {
      title: `${task.title} - OpenAgentSkill`,
      description: task.description,
      url: `https://www.openagentskill.com/tasks/${task.slug}`,
      type: 'website',
    },
  }
}

function formatNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`
  return value.toLocaleString()
}

function mergeSkillCandidates(...pools: SkillRecord[][]) {
  const bySlug = new Map<string, SkillRecord>()

  for (const pool of pools) {
    for (const skill of pool) {
      if (!bySlug.has(skill.slug)) bySlug.set(skill.slug, skill)
    }
  }

  return [...bySlug.values()]
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const task = getAgentTaskBySlug(slug)
  if (!task) notFound()

  const [featuredSkills, matchedSkills, broadSkills, useCase] = await Promise.all([
    task.featuredSlugs?.length ? getSkillsBySlugs(task.featuredSlugs).catch(() => []) : Promise.resolve([]),
    searchSkills(task.keywords.join(' '), 180).catch(() => []),
    getAllSkills('quality', undefined, 180).catch(() => []),
    Promise.resolve(getUseCaseBySlug(task.useCaseSlug)),
  ])
  const skills = mergeSkillCandidates(featuredSkills, matchedSkills, broadSkills)
  const ranked = selectSkillsForTask(skills, task, 12)
  const top = ranked[0]?.skill || null
  const alternatives = ranked.slice(1, 7)
  const installTargets = top ? getSkillInstallTargets(top) : []

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: task.title,
    description: task.description,
    url: `https://www.openagentskill.com/tasks/${task.slug}`,
    mainEntity: ranked.slice(0, 10).map((item, index) => ({
      '@type': 'SoftwareApplication',
      position: index + 1,
      name: item.skill.name,
      url: `https://www.openagentskill.com/skills/${item.skill.slug}`,
      applicationCategory: item.skill.category,
    })),
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-secondary">
          <Link href="/tasks" className="hover:text-foreground">Tasks</Link>
          <span>/</span>
          <span className="text-foreground">{task.shortTitle}</span>
        </nav>

        <section className="grid gap-10 border-b border-border pb-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="mb-4 text-xs uppercase text-secondary">{useCase?.eyebrow || 'Agent task'}</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">
              {task.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{task.description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/api/agent/resolve?task=${encodeURIComponent(task.agentPrompt)}&agent=codex&max_risk=medium&format=text`}
                prefetch={false}
                className="border border-foreground bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
              >
                Resolve via API
              </Link>
              <Link
                href={`/use-cases/${task.useCaseSlug}`}
                className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Open scenario
              </Link>
              <Link
                href={`/api/agent/tasks/${task.slug}?format=text`}
                prefetch={false}
                className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Text version
              </Link>
            </div>
          </div>

          <div className="border border-border bg-card p-5">
            <p className="mb-3 text-xs uppercase text-secondary">Agent prompt</p>
            <p className="text-base leading-relaxed">{task.agentPrompt}</p>
            <div className="mt-5 grid gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{ranked.length}</div>
                <div className="mt-1 text-xs uppercase text-secondary">Matched skills</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{top ? formatNumber(top.github_stars || 0) : '0'}</div>
                <div className="mt-1 text-xs uppercase text-secondary">Top stars</div>
              </div>
            </div>
          </div>
        </section>

        {top ? (
          <>
            <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="mb-3 text-xs uppercase text-secondary">Best first install</p>
                <h2 className="font-display text-3xl font-semibold">{top.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-secondary">{top.description}</p>
                <div className="mt-5 flex flex-wrap gap-3 text-xs font-mono text-secondary">
                  <span>{formatNumber(top.github_stars || 0)} stars</span>
                  <span>{Math.round(Number(top.quality_score || 0))} quality</span>
                  <span>{top.category}</span>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/skills/${top.slug}`}
                    className="border border-border px-4 py-2 text-sm transition-colors hover:border-foreground"
                  >
                    Open skill page
                  </Link>
                  <Link
                    href={`/api/skills/${top.slug}/install?format=text`}
                    prefetch={false}
                    className="border border-border px-4 py-2 text-sm transition-colors hover:border-foreground"
                  >
                    Install handoff
                  </Link>
                </div>
              </div>
              <div className="min-w-0">
                <InstallCommand command={top.install_command || `npx skills add ${top.github_repo}`} skillSlug={top.slug} />
              </div>
            </section>

            {installTargets.length > 0 && (
              <section className="border-b border-border py-10">
                <SkillInstallTargets skillSlug={top.slug} targets={installTargets} />
              </section>
            )}
          </>
        ) : (
          <section className="border-b border-border py-10">
            <div className="border border-border p-8">
              <h2 className="font-display text-2xl font-semibold">No strong match yet.</h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                The GitHub discovery pipeline is still expanding this task area.
              </p>
            </div>
          </section>
        )}

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase text-secondary">Decision guide</p>
            <h2 className="font-display text-2xl font-semibold">Use and avoid conditions</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-border bg-card p-5">
              <h3 className="font-display text-xl font-semibold">Success criteria</h3>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-secondary">
                {task.successCriteria.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="border border-border bg-card p-5">
              <h3 className="font-display text-xl font-semibold">Do not use when</h3>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-secondary">
                {task.avoidWhen.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {alternatives.length > 0 && (
          <section className="py-10">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 text-xs uppercase text-secondary">Alternatives</p>
                <h2 className="font-display text-2xl font-semibold">Compare before installing</h2>
              </div>
              <Link href={`/compare?skills=${encodeURIComponent(ranked.slice(0, 4).map((item) => item.skill.slug).join(','))}`} className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
                Compare top 4
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {alternatives.map(({ skill, score }) => (
                <Link
                  key={skill.slug}
                  href={`/skills/${skill.slug}`}
                  className="border border-border bg-card p-5 transition-colors hover:border-foreground"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl font-semibold">{skill.name}</h3>
                    <span className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-secondary">
                      {Math.round(score)}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-secondary">{skill.description}</p>
                  <div className="mt-5 flex flex-wrap gap-3 text-xs font-mono text-secondary">
                    <span>{formatNumber(skill.github_stars || 0)} stars</span>
                    <span>{skill.category}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
