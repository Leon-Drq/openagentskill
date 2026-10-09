import type { Metadata } from 'next'
import Link from '@/components/crawl-link'
import { ArrowDown, ArrowRight, BookOpen, Code2, Search, Video } from 'lucide-react'
import { NavigationHubLinks } from '@/components/navigation-hub-links'
import { MarketingPageShell } from '@/components/marketing-page'
import { getAllSkills, getSkillsBySlugs } from '@/lib/db/skills'
import { SKILL_STACKS } from '@/lib/collections'
import { USE_CASES, selectSkillsForUseCase } from '@/lib/use-cases'
import { groupUseCases } from '@/lib/use-case-directory'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'AI Agent Skill Use Cases',
  description:
    'Explore OpenAgentSkill use-case guides for web scraping, coding agents, RAG, browser automation, document processing, data analysis, testing, security, and more.',
  alternates: {
    canonical: 'https://www.openagentskill.com/use-cases',
  },
  openGraph: {
    title: 'AI Agent Skill Use Cases — OpenAgentSkill',
    description: 'Find the right AI agent skills by practical workflow and job-to-be-done.',
    url: 'https://www.openagentskill.com/use-cases',
    type: 'website',
  },
}

const startingPoints = [
  { slug: 'coding-agents', label: 'Build and review code', detail: 'From a repository to a pull request', icon: Code2 },
  { slug: 'video-creation', label: 'Create a video', detail: 'From a prompt to a finished edit', icon: Video },
  { slug: 'research-agents', label: 'Research a topic', detail: 'From scattered sources to a clear report', icon: BookOpen },
]

export default async function UseCasesPage() {
  const [baseline, featured] = await Promise.all([
    getAllSkills('quality', undefined, 4000).catch(() => []),
    getSkillsBySlugs(USE_CASES.flatMap(item => item.featuredSlugs || [])).catch(() => []),
  ])
  const skills = [...new Map([...baseline, ...featured].map(skill => [skill.slug, skill])).values()]
  const groups = groupUseCases(USE_CASES)
  const url = 'https://www.openagentskill.com/use-cases'
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage', '@id': `${url}#page`, url,
        name: 'AI Agent Skill Use Cases', description: metadata.description,
        mainEntity: { '@id': `${url}#directory` }, breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      {
        '@type': 'ItemList', '@id': `${url}#directory`,
        name: 'AI agent skill use-case guides', numberOfItems: USE_CASES.length,
        itemListElement: groups.flatMap(group => group.useCases).map((useCase, index) => ({
          '@type': 'ListItem', position: index + 1,
          item: { '@type': 'WebPage', name: useCase.shortTitle, description: useCase.description, url: `${url}/${useCase.slug}` },
        })),
      },
      {
        '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.openagentskill.com' },
          { '@type': 'ListItem', position: 2, name: 'Use cases', item: url },
        ],
      },
    ],
  }

  return (
    <MarketingPageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <div className="bg-[#fbfaf6] text-[#1d1b18]">
        <section className="border-b border-[#e4e0d8]">
          <div className="mx-auto max-w-6xl px-6 pb-12 pt-7 sm:pb-16">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#686259]">
              <Link href="/" className="py-2 hover:text-[#006b4f]">Home</Link>
              <span aria-hidden="true">/</span><span aria-current="page">Use cases</span>
            </nav>
            <div className="mt-8 grid gap-10 lg:grid-cols-[1.45fr_1fr] lg:items-end lg:gap-16">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#006b4f]">Start with the work</p>
                <h1 className="mt-4 font-display text-5xl font-normal leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
                  AI Agent <br className="hidden sm:block" /><em className="font-normal text-[#006b4f]">Use Cases</em>
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-[#5f5a52] sm:text-lg">
                  Find agent skills by the work you need done. Explore practical workflows, then build a shortlist of skills for your next project.
                </p>
                <form action="/skills" method="get" role="search" aria-label="Search agent skills" className="mt-7 flex items-center gap-2 rounded-[12px] border border-[#d8d2c6] bg-white p-2 shadow-sm focus-within:border-[#006b4f]">
                  <Search size={18} aria-hidden="true" className="ml-2 hidden shrink-0 text-[#686259] sm:block" />
                  <label htmlFor="use-case-search" className="sr-only">Search skills by task</label>
                  <input id="use-case-search" name="q" type="search" placeholder="What do you want to do?" className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none" />
                  <button type="submit" className="min-h-11 shrink-0 rounded-[8px] bg-[#006b4f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#00543e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006b4f]">Find skills</button>
                </form>
                <p className="mt-4 text-xs text-[#686259]">{USE_CASES.length} use cases <span aria-hidden="true" className="mx-2">·</span> {groups.length} areas of work</p>
              </div>
              <aside className="rounded-[12px] border border-[#e4e0d8] bg-[#f4f2ea] p-5 sm:p-6" aria-label="Suggested starting points">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#686259]">Pick a starting point</p>
                <div className="divide-y divide-[#e4e0d8]">
                  {startingPoints.map(({ slug, label, detail, icon: Icon }) => (
                    <Link key={slug} href={`/use-cases/${slug}`} className="group flex items-center gap-3 py-5 last:pb-1">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] border border-[#e4e0d8] bg-[#fffdf8] text-[#006b4f]"><Icon size={19} aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold group-hover:text-[#006b4f]">{label}</span><span className="mt-1 block text-xs leading-5 text-[#686259]">{detail}</span></span>
                      <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-[#686259] transition-transform group-hover:translate-x-1" />
                    </Link>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10 lg:py-14">
          <aside>
            <nav aria-label="Browse use-case groups" className="lg:sticky lg:top-24">
              <p className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#686259]">Browse by work <ArrowDown size={13} aria-hidden="true" /></p>
              <ul className="flex flex-wrap gap-2 lg:block lg:space-y-1">
                {groups.map(group => (
                  <li key={group.id}>
                    <a href={`#${group.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-[8px] border border-[#e4e0d8] bg-[#fffdf8] px-3 py-2.5 text-sm transition-colors hover:border-[#b7cabb] hover:bg-[#edf3ec] hover:text-[#006b4f] lg:border-transparent lg:bg-transparent">
                      <span>{group.title}</span><span className="font-mono text-[11px] text-[#686259]">{group.useCases.length}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-7 hidden border-t border-[#e4e0d8] pt-5 lg:block">
                <p className="text-xs leading-6 text-[#686259]">Already know the skill you need?</p>
                <Link href="/skills" className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#006b4f] hover:underline">Browse all skills <ArrowRight size={14} aria-hidden="true" /></Link>
              </div>
            </nav>
          </aside>

          <div className="min-w-0 space-y-14">
            {groups.map((group, index) => (
              <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`} className="scroll-mt-24">
                <div className="mb-6 border-b border-[#e4e0d8] pb-5">
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#006b4f]">{String(index + 1).padStart(2, '0')} <span aria-hidden="true" className="mx-2">/</span> {group.useCases.length} use cases</p>
                  <h2 id={`${group.id}-title`} className="font-display text-3xl font-normal tracking-tight sm:text-4xl">{group.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#686259]">{group.description}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {group.useCases.map(useCase => {
                    const topSkills = selectSkillsForUseCase(skills, useCase, Math.max(12, useCase.featuredSlugs?.length || 0)).slice(0, 3)
                    return (
                      <article key={useCase.slug} className="flex min-w-0 flex-col rounded-[12px] border border-[#e4e0d8] bg-[#fffdf8] p-5 transition-colors hover:border-[#b7cabb] sm:p-6">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#686259]">{useCase.eyebrow}</p>
                        <h3 className="mt-2 font-display text-2xl font-normal leading-tight">
                          <Link href={`/use-cases/${useCase.slug}`} className="group flex min-h-11 items-center justify-between gap-3 py-1 hover:text-[#006b4f]">
                            {useCase.shortTitle}<ArrowRight size={18} aria-hidden="true" className="shrink-0 text-[#006b4f] transition-transform group-hover:translate-x-1" />
                          </Link>
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#5f5a52]">{useCase.description}</p>
                        <ul aria-label={`${useCase.shortTitle} workflow examples`} className="mb-5 mt-4 flex flex-wrap gap-2">
                          {useCase.workflows.slice(0, 2).map(workflow => <li key={workflow} className="rounded-[6px] bg-[#f1efe7] px-2.5 py-1.5 text-[11px] leading-4 text-[#5f5a52]">{workflow}</li>)}
                        </ul>
                        <div className="mt-auto border-t border-[#e4e0d8] pt-4">
                          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#686259]">Skills to explore</p>
                          {topSkills.length ? (
                            <ul>
                              {topSkills.map(skill => <li key={skill.slug}><Link href={`/skills/${skill.slug}`} className="block break-words py-2 text-xs leading-5 text-[#006b4f] underline decoration-[#b7cabb] underline-offset-4 hover:decoration-[#006b4f]">{skill.name}</Link></li>)}
                            </ul>
                          ) : <p className="py-2 text-xs leading-5 text-[#686259]">Explore the guide for workflows and suggested tasks.</p>}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        <section className="border-t border-[#e4e0d8] bg-[#f4f2ea]" aria-labelledby="workflow-recipes-title">
          <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#006b4f]">From use case to workflow</p><h2 id="workflow-recipes-title" className="font-display text-3xl font-normal sm:text-4xl">Better together.</h2><p className="mt-3 text-sm leading-6 text-[#686259]">Combine complementary skills with our workflow recipes.</p></div>
              <Link href="/collections" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#006b4f] hover:underline">Browse workflow recipes <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {SKILL_STACKS.slice(0, 3).map(stack => (
                <Link key={stack.slug} href={`/collections/${stack.slug}`} className="group rounded-[12px] border border-[#e4e0d8] bg-[#fffdf8] p-6 transition-colors hover:border-[#b7cabb]">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#686259]">{stack.eyebrow}</p>
                  <h3 className="mt-3 flex items-start justify-between gap-3 font-display text-2xl font-normal group-hover:text-[#006b4f]">{stack.shortTitle}<ArrowRight size={16} aria-hidden="true" className="mt-2 shrink-0" /></h3>
                  <p className="mt-3 text-sm leading-6 text-[#686259]">{stack.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <NavigationHubLinks hub="useCases" />
      </div>
    </MarketingPageShell>
  )
}
