import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDown, ArrowRight, Braces, Layers, ListOrdered, ScanSearch } from 'lucide-react'
import { MarketingPageShell } from '@/components/marketing-page'
import { getAllSkills, getSkillsBySlugs, type SkillRecord } from '@/lib/db/skills'
import { getCuratedSkillFallback } from '@/lib/skill-fallbacks'
import { selectSkillsForPack, SKILL_PACKS } from '@/lib/skill-packs'

const BASE_URL = 'https://www.openagentskill.com'
const PACK_CANDIDATE_LIMIT = 1200

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Installable AI Agent Skill Packs',
  description:
    'Installable AI agent skill packs for frontend engineers, design agents, SEO automation, data analysts, startup founders, and full-stack SaaS builders. Each includes an agent-readable plan and audit links.',
  alternates: {
    canonical: `${BASE_URL}/skill-packs`,
  },
  openGraph: {
    title: 'Installable AI Agent Skill Packs - OpenAgentSkill',
    description: 'Open a role-specific pack with an install order, audit links, and a machine-readable Agent plan.',
    url: `${BASE_URL}/skill-packs`,
    type: 'website',
  },
}

function mergeSkills(...pools: SkillRecord[][]) {
  const seen = new Set<string>()
  const merged: SkillRecord[] = []

  for (const pool of pools) {
    for (const skill of pool) {
      if (seen.has(skill.slug)) continue
      seen.add(skill.slug)
      merged.push(skill)
    }
  }

  return merged
}

export default async function SkillPacksPage() {
  const featuredSlugs = SKILL_PACKS.flatMap((pack) => pack.featuredSlugs || [])
  const [featuredSkills, candidateSkills] = await Promise.all([
    getSkillsBySlugs(featuredSlugs).catch(() => []),
    getAllSkills('quality', undefined, PACK_CANDIDATE_LIMIT).catch(() => []),
  ])
  const featuredFallbacks = featuredSlugs
    .map((featuredSlug) => getCuratedSkillFallback(featuredSlug))
    .filter((skill): skill is SkillRecord => Boolean(skill))
  const skills = mergeSkills(featuredSkills, featuredFallbacks, candidateSkills)

  const url = `${BASE_URL}/skill-packs`
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage', '@id': `${url}#page`,
        name: 'AI Agent Skill Packs', description: metadata.description, url,
        mainEntity: { '@id': `${url}#directory` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      {
        '@type': 'ItemList', '@id': `${url}#directory`,
        name: 'AI agent skill packs', numberOfItems: SKILL_PACKS.length,
        itemListElement: SKILL_PACKS.map((pack, index) => ({
          '@type': 'ListItem', position: index + 1,
          item: { '@type': 'WebPage', name: pack.shortTitle, description: pack.description, url: `${url}/${pack.slug}` },
        })),
      },
      {
        '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Skill packs', item: url },
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
              <span aria-hidden="true">/</span><span aria-current="page">Skill packs</span>
            </nav>
            <div className="mt-8 grid gap-10 lg:grid-cols-[1.45fr_1fr] lg:items-end lg:gap-16">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#006b4f]">Build your agent’s toolkit</p>
                <h1 className="mt-4 font-display text-5xl font-normal leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
                  AI Agent <br /><em className="font-normal text-[#006b4f]">Skill Packs</em>
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-[#5f5a52] sm:text-lg">
                  Start with a role, then find the skills to match. Each pack brings together a focused shortlist, suggested install order, audit links, and a plan your agent can read.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <a href="#pack-directory" className="inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-[#006b4f] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#00543e]">Explore {SKILL_PACKS.length} packs <ArrowDown size={16} aria-hidden="true" /></a>
                  <Link href="/collections" className="inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-[#d8d2c6] bg-[#fffdf8] px-5 py-3 text-sm font-medium hover:border-[#006b4f] hover:text-[#006b4f]">Explore workflow recipes <ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
                <p className="mt-4 text-xs leading-5 text-[#686259]">Review each skill’s source and requirements before installing.</p>
              </div>
              <aside aria-label="What is inside a skill pack" className="rounded-[12px] border border-[#e4e0d8] bg-[#f4f2ea] p-5 sm:p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#686259]">Inside every pack</p>
                <ol className="mt-2 divide-y divide-[#e4e0d8]">
                  {[
                    { title: 'A focused shortlist', copy: 'Skills selected for a role or toolchain.', icon: Layers },
                    { title: 'Context for your review', copy: 'Source details and public audit links.', icon: ScanSearch },
                    { title: 'A suggested install order', copy: 'Workflow steps and an agent-readable plan.', icon: ListOrdered },
                  ].map(({ title, copy, icon: Icon }) => (
                    <li key={title} className="flex items-start gap-3 py-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] border border-[#e4e0d8] bg-[#fffdf8] text-[#006b4f]"><Icon size={18} aria-hidden="true" /></span>
                      <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-[#686259]">{copy}</p></div>
                    </li>
                  ))}
                </ol>
                <Link href="/api/agent/packs" prefetch={false} className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#006b4f] hover:underline"><Braces size={16} aria-hidden="true" /> Open Pack API <ArrowRight size={14} aria-hidden="true" /></Link>
              </aside>
            </div>
          </div>
        </section>

        <section id="pack-directory" aria-labelledby="pack-directory-title" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-10 sm:py-14">
          <div className="mb-7 flex flex-col justify-between gap-4 border-b border-[#e4e0d8] pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#006b4f]">{SKILL_PACKS.length} skill packs</p>
              <h2 id="pack-directory-title" className="font-display text-3xl font-normal tracking-tight sm:text-4xl">Choose your starting set.</h2>
              <p className="mt-3 text-sm leading-6 text-[#686259]">Browse the workflow, explore the skills, then open the full pack.</p>
            </div>
            <Link href="/use-cases" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium text-[#006b4f] hover:underline">Browse by use case <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {SKILL_PACKS.map(pack => {
              const picks = selectSkillsForPack(skills, pack, pack.selectionLimit || 5)
              return (
                <article key={pack.slug} aria-labelledby={`pack-${pack.slug}`} className="flex min-w-0 flex-col rounded-[12px] border border-[#e4e0d8] bg-[#fffdf8] p-5 transition-colors hover:border-[#b7cabb] sm:p-6">
                  <p className="font-mono text-[10px] uppercase leading-5 tracking-[0.12em] text-[#686259]">{pack.eyebrow}</p>
                  <h3 id={`pack-${pack.slug}`} className="mt-2 font-display text-2xl font-normal leading-tight">
                    <Link href={`/skill-packs/${pack.slug}`} className="group flex min-h-11 items-center justify-between gap-3 py-1 hover:text-[#006b4f]">{pack.shortTitle}<ArrowRight size={18} aria-hidden="true" className="shrink-0 text-[#006b4f] transition-transform group-hover:translate-x-1" /></Link>
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#5f5a52]">{pack.description}</p>
                  <div className="mt-5 rounded-[8px] bg-[#f1efe7] p-3">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#686259]">Workflow at a glance</p>
                    <ol aria-label={`${pack.shortTitle} workflow`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-6 text-[#5f5a52]">
                      {pack.workflowSteps.map((step, index) => <li key={step.title} className="inline-flex items-center gap-2"><span>{step.title}</span>{index < pack.workflowSteps.length - 1 ? <ArrowRight size={12} aria-hidden="true" className="text-[#8b857a]" /> : null}</li>)}
                    </ol>
                  </div>
                  <div className="mb-5 mt-5">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#686259]">Skills to explore</p>
                    {picks.length ? (
                      <ul className="flex flex-wrap gap-2">
                        {picks.slice(0, 3).map(skill => <li key={skill.slug} className="max-w-full"><Link href={`/skills/${skill.slug}`} prefetch={false} className="inline-block max-w-full break-words rounded-[6px] border border-[#e4e0d8] px-2.5 py-2 text-xs leading-5 text-[#006b4f] transition-colors hover:border-[#b7cabb] hover:bg-[#edf3ec]">{skill.name}</Link></li>)}
                      </ul>
                    ) : <p className="text-xs leading-5 text-[#686259]">Open the pack to explore its workflow and review checklist.</p>}
                  </div>
                  <div className="mt-auto border-t border-[#e4e0d8] pt-3">
                    <Link href={`/skill-packs/${pack.slug}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#006b4f] hover:underline">View pack &amp; install plan<span className="sr-only">: {pack.shortTitle}</span><ArrowRight size={15} aria-hidden="true" /></Link>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section aria-labelledby="more-ways-title" className="border-t border-[#e4e0d8] bg-[#f4f2ea]">
          <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#006b4f]">Keep exploring</p>
            <h2 id="more-ways-title" className="font-display text-3xl font-normal tracking-tight sm:text-4xl">Find your next workflow.</h2>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {[
                { href: '/use-cases', title: 'Start with a use case', copy: 'Find skills by the work you need done, from research to video creation.' },
                { href: '/collections', title: 'Explore workflow recipes', copy: 'See how complementary skills fit into a step-by-step workflow.' },
                { href: '/skills', title: 'Build your own toolkit', copy: 'Browse individual skills, compare their source details, and choose what fits.' },
              ].map(item => (
                <Link key={item.href} href={item.href} className="group rounded-[12px] border border-[#e4e0d8] bg-[#fffdf8] p-6 transition-colors hover:border-[#b7cabb]">
                  <h3 className="flex items-start justify-between gap-3 font-display text-2xl font-normal group-hover:text-[#006b4f]">{item.title}<ArrowRight size={16} aria-hidden="true" className="mt-2 shrink-0" /></h3>
                  <p className="mt-3 text-sm leading-6 text-[#686259]">{item.copy}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </MarketingPageShell>
  )
}
