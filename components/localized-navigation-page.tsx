import Link from 'next/link'
import { ArrowRight, FileCode2, SearchCheck } from 'lucide-react'
import { MarketingButtonLink, MarketingHero, MarketingMetricStrip } from '@/components/marketing-page'
import { AGENT_TASKS } from '@/lib/agent-tasks'
import { getAllSkills, getSkillsBySlugs, type SkillRecord } from '@/lib/db/skills'
import {
  getLocalizedNavigationContent,
  getLocalizedTaskTitle,
} from '@/lib/i18n/localized-navigation-pages'
import {
  getLocalizedNavigationHref,
  type LocalizedCorePageSlug,
  type MarketLocale,
} from '@/lib/i18n/market-routing'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import { getApprovedRegistrySkillCount, LAST_VERIFIED_APPROVED_SKILL_COUNT } from '@/lib/registry-stats'
import { selectSkillsForPack, SKILL_PACKS } from '@/lib/skill-packs'
import { getSkillTrustProfileV5 } from '@/lib/trust'

const PACK_CANDIDATE_LIMIT = 1200

function formatNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`
  return value.toLocaleString()
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

async function LocalizedTasksPage({ locale }: { locale: MarketLocale }) {
  const copy = getLocalizedNavigationContent(locale).tasks
  const registryCount = await getApprovedRegistrySkillCount(700).catch(() => null)
  const skillCount = registryCount?.count ?? LAST_VERIFIED_APPROVED_SKILL_COUNT

  return (
    <>
      <MarketingHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        actions={
          <>
            <MarketingButtonLink href={getLocalizedNavigationHref('/agent', locale)} variant="primary">
              {copy.agentEntry}
            </MarketingButtonLink>
            <MarketingButtonLink href="/api/agent/tasks?format=text" prefetch={false}>
              {copy.textApi}
            </MarketingButtonLink>
          </>
        }
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: AGENT_TASKS.length, label: copy.taskMetric },
              { value: formatNumber(skillCount), label: copy.indexedSkillsMetric },
              { value: 'API', label: copy.installHandoffMetric },
            ]}
          />
        }
      />

      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {AGENT_TASKS.map((task, index) => (
            <Link
              key={task.slug}
              href={getLocalizedNavigationHref(`/tasks/${task.slug}`, locale)}
              className="group flex min-h-[250px] flex-col justify-between border border-border bg-card p-5 transition-colors hover:border-foreground"
            >
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-secondary">{String(index + 1).padStart(2, '0')}</p>
                  <span className="max-w-[60%] truncate border border-border px-2 py-1 font-mono text-[11px] text-secondary">
                    {task.useCaseSlug}
                  </span>
                </div>
                <h2 className="font-display text-2xl font-semibold leading-tight group-hover:text-[#006b4f]">
                  {getLocalizedTaskTitle(locale, task.slug, task.shortTitle)}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-secondary">{copy.taskCardDescription}</p>
              </div>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#006b4f]">
                {copy.openTask}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

async function LocalizedSkillPacksPage({ locale }: { locale: MarketLocale }) {
  const copy = getLocalizedNavigationContent(locale).packs
  const featuredSlugs = SKILL_PACKS.flatMap((pack) => pack.featuredSlugs || [])
  const [featuredSkills, candidateSkills] = await Promise.all([
    getSkillsBySlugs(featuredSlugs).catch(() => []),
    getAllSkills('quality', undefined, PACK_CANDIDATE_LIMIT).catch(() => []),
  ])
  const skills = mergeSkills(featuredSkills, candidateSkills)

  return (
    <>
      <MarketingHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        aside={
          <MarketingMetricStrip
            columns="grid-cols-3"
            items={[
              { value: SKILL_PACKS.length, label: copy.packsMetric },
              { value: skills.length.toLocaleString(), label: copy.skillsMetric },
              { value: '4', label: copy.stepsMetric },
            ]}
          />
        }
      />

      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="grid gap-4 md:grid-cols-2">
          {SKILL_PACKS.map((pack) => {
            const picks = selectSkillsForPack(skills, pack, 5)
            const bestScore = picks[0] ? getSkillQualityProfile(picks[0]).score : 0
            const localizedPack = copy.cards[pack.slug]

            return (
              <Link
                key={pack.slug}
                href={getLocalizedNavigationHref(`/skill-packs/${pack.slug}`, locale)}
                className="group flex min-h-[290px] flex-col border border-border bg-card p-5 transition-colors hover:border-foreground sm:p-6"
              >
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-secondary">{copy.workflow}</p>
                    <h2 className="mt-2 font-display text-2xl font-semibold leading-tight group-hover:text-[#006b4f]">
                      {localizedPack?.title || pack.shortTitle}
                    </h2>
                  </div>
                  <span className="w-fit shrink-0 border border-border px-2 py-1 font-mono text-xs text-secondary">
                    {picks.length} {copy.picks}
                  </span>
                </div>
                <p className="min-h-16 text-sm leading-relaxed text-secondary">
                  {localizedPack?.description || pack.description}
                </p>
                <div className="mt-auto grid grid-cols-3 gap-px border border-border bg-border text-xs">
                  <div className="min-w-0 bg-background p-3">
                    <div className="font-mono text-foreground">{bestScore || '-'}</div>
                    <div className="mt-1 truncate text-secondary">{copy.topScore}</div>
                  </div>
                  <div className="min-w-0 bg-background p-3">
                    <div className="font-mono text-foreground">{formatCompactNumber(picks[0]?.github_stars || 0)}</div>
                    <div className="mt-1 truncate text-secondary">{copy.topStars}</div>
                  </div>
                  <div className="min-w-0 bg-background p-3">
                    <div className="font-mono text-foreground">{pack.workflowSteps.length}</div>
                    <div className="mt-1 truncate text-secondary">{copy.workflow}</div>
                  </div>
                </div>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#006b4f]">
                  {copy.openPack}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </>
  )
}

async function LocalizedComparePage({ locale }: { locale: MarketLocale }) {
  const copy = getLocalizedNavigationContent(locale).compare
  const skills = await getAllSkills('quality', undefined, 6).catch(() => [])

  return (
    <>
      <MarketingHero eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-secondary">{copy.platformComparison}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href={getLocalizedNavigationHref('/compare/openagentskill-vs-agentskills-io', locale)}
            className="border border-border bg-card p-5 transition-colors hover:border-foreground"
          >
            <h2 className="font-display text-xl font-semibold">OpenAgentSkill vs AgentSkills.io</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">{copy.agentskillsDescription}</p>
          </Link>
          <Link
            href={getLocalizedNavigationHref('/compare/openagentskill-vs-skills-sh', locale)}
            className="border border-border bg-card p-5 transition-colors hover:border-foreground"
          >
            <h2 className="font-display text-xl font-semibold">OpenAgentSkill vs skills.sh</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">{copy.skillsShDescription}</p>
          </Link>
        </div>
      </section>
      <section className="border-t border-border bg-card/35">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
          <div className="mb-6">
            <h2 className="font-display text-3xl font-normal">{copy.popularSkills}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary">{copy.popularSkillsDescription}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => {
              const quality = getSkillQualityProfile(skill)
              const trust = getSkillTrustProfileV5(skill)

              return (
                <Link
                  key={skill.slug}
                  href={getLocalizedNavigationHref(`/skills/${skill.slug}`, locale)}
                  className="group border border-border bg-background p-5 transition-colors hover:border-foreground"
                >
                  <h3 className="font-display text-xl font-semibold group-hover:text-[#006b4f]">{skill.name}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-secondary">{skill.description}</p>
                  <div className="mt-5 grid grid-cols-3 gap-px border border-border bg-border text-center text-xs">
                    <div className="bg-background p-2"><span className="font-mono">{quality.score}</span><span className="mt-1 block text-secondary">{copy.quality}</span></div>
                    <div className="bg-background p-2"><span className="font-mono">{trust.score}</span><span className="mt-1 block text-secondary">{copy.trust}</span></div>
                    <div className="bg-background p-2"><span className="font-mono">{formatCompactNumber(skill.github_stars || 0)}</span><span className="mt-1 block text-secondary">{copy.stars}</span></div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

function LocalizedApiDocsPage({ locale }: { locale: MarketLocale }) {
  const copy = getLocalizedNavigationContent(locale).apiDocs
  const endpoints = [
    { label: copy.agentResolve, description: copy.agentResolveDescription, method: 'GET', path: '/api/agent/resolve?task=your+task&format=text', icon: SearchCheck },
    { label: copy.registry, description: copy.registryDescription, method: 'GET', path: '/api/registry/search?task=your+task', icon: FileCode2 },
    { label: copy.outcomes, description: copy.outcomesDescription, method: 'POST', path: '/api/agent/outcome', icon: ArrowRight },
  ]

  return (
    <>
      <MarketingHero eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <div className="mx-auto max-w-5xl px-6 py-10 sm:py-14">
        <section>
          <h2 className="font-display text-3xl font-normal">{copy.baseUrls}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {['https://www.openagentskill.com/api/registry', 'https://www.openagentskill.com/api/agent', 'https://www.openagentskill.com/api/skills'].map((url) => (
              <code key={url} className="min-w-0 break-all border border-border bg-card p-4 font-mono text-xs leading-6 text-secondary">{url}</code>
            ))}
          </div>
        </section>

        <section className="mt-12 border-y border-border py-10">
          <h2 className="font-display text-3xl font-normal">{copy.responseFormats}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <article className="border border-border bg-card p-5">
              <code className="font-mono text-sm">format=json</code>
              <p className="mt-3 text-sm leading-6 text-secondary">{copy.jsonDescription}</p>
            </article>
            <article className="border border-border bg-card p-5">
              <code className="font-mono text-sm">format=text</code>
              <p className="mt-3 text-sm leading-6 text-secondary">{copy.textDescription}</p>
            </article>
          </div>
        </section>

        <section className="pt-10">
          <h2 className="font-display text-3xl font-normal">{copy.endpointOverview}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {endpoints.map((endpoint) => {
              const Icon = endpoint.icon
              return (
                <article key={endpoint.path} className="flex min-w-0 flex-col border border-border bg-card p-5">
                  <Icon className="h-5 w-5 text-[#006b4f]" aria-hidden="true" />
                  <h3 className="mt-5 font-display text-xl font-semibold">{endpoint.label}</h3>
                  <p className="mt-3 text-sm leading-6 text-secondary">{endpoint.description}</p>
                  <code className="mt-5 block break-all border border-border bg-background p-3 font-mono text-xs leading-6 text-secondary">
                    <span className="mr-2 font-semibold text-foreground">{endpoint.method}</span>{endpoint.path}
                  </code>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </>
  )
}

export async function LocalizedNavigationPage({
  locale,
  page,
}: {
  locale: MarketLocale
  page: LocalizedCorePageSlug
}) {
  if (page === 'tasks') return <LocalizedTasksPage locale={locale} />
  if (page === 'skill-packs') return <LocalizedSkillPacksPage locale={locale} />
  if (page === 'compare') return <LocalizedComparePage locale={locale} />
  if (page === 'api-docs') return <LocalizedApiDocsPage locale={locale} />
  return null
}
