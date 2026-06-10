'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Boxes, Search, ShieldCheck, Star, Terminal } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { SKILL_PACKS } from '@/lib/skill-packs'
import { USE_CASES } from '@/lib/use-cases'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

interface HomePageEnhancedProps {
  stats: {
    totalSkills: number
    totalDownloads: number
    activePlatforms: number
    agentSubmissions: number
  }
  activities: Array<{
    id: string
    event_type: string
    actor_name: string
    actor_type: string
    description: string | null
    created_at: string
  }>
  featuredSkills: Array<{
    slug: string
    name: string
    description: string
    github_stars: number
    downloads: number
  }>
}

interface Recommendation {
  rank?: number
  skill: string
  slug: string
  description?: string
  confidence: number | string
  match_label?: string
  install: string
  stats?: {
    stars: number
    downloads: number
    rating: number
    quality_score: number
  }
  decision?: {
    readiness_score: number
    readiness_label: string
    headline: string
    role: string
    adoption_stage: string
    primary_fit: string
    best_for: string[]
    risks: string[]
    proof_points: string[]
    next_steps: string[]
  }
  use_cases?: Array<{
    slug: string
    title: string
    url: string
  }>
  reasoning: string
}

interface SuggestedComposition {
  name: string
  description: string
  skills: string[]
  steps?: string[]
}

interface SuggestedStack {
  slug: string
  name: string
  url: string
  use_case: string
}

const HOME_USE_CASES = USE_CASES.slice(0, 4)
const HOME_SKILL_PACKS = SKILL_PACKS.slice(0, 5)
const VALUE_PROPS = [
  {
    label: 'Discover',
    title: 'Task-to-skill recommendations',
    description: 'Describe the workflow and get a focused shortlist instead of browsing a giant catalog.',
    Icon: Search,
  },
  {
    label: 'Evaluate',
    title: 'Trust, quality, and audit signals',
    description: 'Compare stars, maintenance, install paths, and fit signals before giving a skill to an agent.',
    Icon: ShieldCheck,
  },
  {
    label: 'Install',
    title: 'CLI plus Codex, Claude Code, and Cursor prompts',
    description: 'Move from discovery to usage with install commands and agent-ready instructions.',
    Icon: Terminal,
  },
]

const EXPLORE_LINKS = [
  { href: '/agent-skills-registry', label: 'Registry API' },
  { href: '/skill-packs', label: 'Skill packs' },
  { href: '/best', label: 'Best lists' },
  { href: '/trending', label: 'Trending' },
  { href: '/audits', label: 'Audits' },
  { href: '/guides', label: 'Guides' },
  { href: '/api-docs', label: 'API docs' },
  { href: '/submit', label: 'Submit skill' },
]

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}K`
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

export function HomePageEnhanced({ stats, featuredSkills }: HomePageEnhancedProps) {
  const { t } = useI18n()
  const [taskQuery, setTaskQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [suggestedComposition, setSuggestedComposition] = useState<SuggestedComposition | null>(null)
  const [suggestedStacks, setSuggestedStacks] = useState<SuggestedStack[]>([])
  const [searchedCount, setSearchedCount] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  const runRecommendation = async (query: string) => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery || isSearching) return
    setTaskQuery(normalizedQuery)
    setIsSearching(true)
    setShowResults(true)
    try {
      const res = await fetch(`/api/agent/recommend?task=${encodeURIComponent(normalizedQuery)}&limit=4`)
      const data = await res.json()
      setRecommendations(data.recommendations || [])
      setSuggestedComposition(data.suggested_composition || null)
      setSuggestedStacks(data.suggested_stacks || [])
      setSearchedCount(data.meta?.total_skills_searched || 0)
    } catch {
      setRecommendations([])
      setSuggestedComposition(null)
      setSuggestedStacks([])
      setSearchedCount(0)
    } finally {
      setIsSearching(false)
    }
  }

  const handleFindSkills = async () => {
    await runRecommendation(taskQuery)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFindSkills()
  }

  const copyToClipboard = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
    setCopiedCmd(cmd)
    setTimeout(() => setCopiedCmd(null), 2000)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* ============================================= */}
      {/* HERO: The core innovation - action-first hero */}
      {/* ============================================= */}
      <section className="px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-16 lg:pt-20">
        <div className="max-w-5xl mx-auto">
          <div className="mb-4 flex justify-center">
            <Link
              href="/agent-skills-registry"
              className="border border-border bg-card px-3 py-1.5 text-center text-xs font-mono uppercase tracking-wider text-secondary transition-colors hover:border-foreground hover:text-foreground"
            >
              Agent Skills Registry
            </Link>
          </div>
          {/* Animated Title */}
          <h1
            className="mx-auto max-w-4xl text-balance text-center font-display text-3xl font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl"
            style={{ animation: 'fadeInUp 0.7s ease-out both' }}
          >
            {t.hero.title}
          </h1>

          <p
            className="mx-auto mb-6 mt-4 max-w-2xl text-center text-base leading-relaxed text-secondary sm:mb-8 sm:mt-5 sm:text-lg"
          >
            {t.hero.subtitle}
          </p>

          <div className="mx-auto mb-7 grid max-w-2xl grid-cols-3 gap-2">
            <Link
              href="/agent-skills-registry"
              className="border border-border bg-card px-2 py-2 text-center font-mono text-[11px] text-secondary transition-colors hover:border-foreground hover:text-foreground sm:px-3 sm:text-xs"
            >
              Registry API
            </Link>
            <Link
              href="/skill-packs"
              className="border border-border bg-card px-2 py-2 text-center font-mono text-[11px] text-secondary transition-colors hover:border-foreground hover:text-foreground sm:px-3 sm:text-xs"
            >
              Skill packs
            </Link>
            <Link
              href="/skills"
              className="border border-border bg-card px-2 py-2 text-center font-mono text-[11px] text-secondary transition-colors hover:border-foreground hover:text-foreground sm:px-3 sm:text-xs"
            >
              Browse skills
            </Link>
          </div>

          {/* ============================== */}
          {/* THE KEY FEATURE: Task Search   */}
          {/* Agents can use this in one API */}
          {/* ============================== */}
          <div
            ref={searchRef}
            className="mx-auto mb-8 max-w-3xl"
          >
            {/* Natural Language Task Input */}
            <div className="border border-border bg-card">
              <div className="px-4 sm:px-5 pt-4 pb-2">
                <label className="text-xs text-secondary font-mono uppercase tracking-wider">
                  {t.hero.orDescribeTask}
                </label>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-stretch">
                <input
                  type="text"
                  value={taskQuery}
                  onChange={(e) => setTaskQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.hero.taskPlaceholder}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-secondary/50 sm:px-5 sm:text-base"
                />
                <button
                  onClick={handleFindSkills}
                  disabled={isSearching || !taskQuery.trim()}
                  className="w-full border-t border-border bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto sm:border-t-0 sm:px-8"
                >
                  {isSearching ? t.hero.searching : t.hero.findSkills}
                </button>
              </div>
            </div>

            <div className="border-x border-b border-border bg-card px-4 py-3 sm:px-5">
              <div className="mb-2 text-xs font-mono uppercase tracking-wider text-secondary">
                Start from a workflow
              </div>
              <div className="flex flex-wrap gap-2">
                {HOME_USE_CASES.slice(0, 4).map((useCase) => (
                  <button
                    key={useCase.slug}
                    type="button"
                    onClick={() => runRecommendation(useCase.heroPrompt)}
                    className="border border-border px-3 py-1.5 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
                  >
                    {useCase.shortTitle}
                  </button>
                ))}
              </div>
            </div>

            {/* Recommendation Results */}
            {showResults && (
              <div className="border border-t-0 border-border bg-card">
                <div className="border-b border-border px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="text-xs font-mono text-secondary uppercase tracking-wider">
                        Agent Skill Plan
                      </span>
                      {recommendations[0] && !isSearching && (
                        <h2 className="mt-1 font-display text-xl font-semibold sm:text-2xl">
                          Start with {recommendations[0].skill}
                        </h2>
                      )}
                    </div>
                    {!isSearching && searchedCount > 0 && (
                      <div className="border border-border px-3 py-2 text-xs font-mono text-secondary">
                        Searched {formatCompact(searchedCount)} skills
                      </div>
                    )}
                  </div>
                </div>
                {isSearching ? (
                  <div className="px-5 py-8 text-center text-sm text-secondary">
                    <span className="inline-block animate-pulse">{'>'} {t.hero.searching}</span>
                  </div>
                ) : recommendations.length > 0 ? (
                  <div>
                    <div className="grid border-b border-border md:grid-cols-3">
                      <div className="border-b border-border p-4 md:border-b-0 md:border-r">
                        <p className="text-xs uppercase tracking-widest text-secondary">Primary pick</p>
                        <p className="mt-2 font-display text-lg font-semibold">{recommendations[0].skill}</p>
                        <p className="mt-2 text-sm leading-relaxed text-secondary">
                          {recommendations[0].decision?.headline || recommendations[0].match_label || 'Best available match'}
                        </p>
                      </div>
                      <div className="border-b border-border p-4 md:border-b-0 md:border-r">
                        <p className="text-xs uppercase tracking-widest text-secondary">Recommended stack</p>
                        <p className="mt-2 font-display text-lg font-semibold">
                          {suggestedStacks[0]?.name || suggestedComposition?.name || 'Single-skill prototype'}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-secondary">
                          {suggestedComposition?.description || 'Install one skill first, test the workflow, then add companions only where needed.'}
                        </p>
                      </div>
                      <div className="p-4">
                        <p className="text-xs uppercase tracking-widest text-secondary">Next move</p>
                        <p className="mt-2 font-display text-lg font-semibold">
                          {recommendations[0].decision?.adoption_stage || 'Prototype'}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-secondary">
                          {recommendations[0].decision?.next_steps?.[0] || 'Run one task end to end before adding more skills.'}
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-border">
                      {recommendations.map((rec, i) => (
                        <div key={rec.slug} className="px-4 py-5 transition-colors hover:bg-muted/50 sm:px-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="border border-border px-2 py-1 text-xs font-mono text-secondary">
                                  #{rec.rank || i + 1}
                                </span>
                                <span className="border border-border px-2 py-1 text-xs font-mono text-secondary">
                                  {rec.decision?.role || rec.match_label || 'Candidate'}
                                </span>
                                <span className="bg-muted px-2 py-1 text-xs font-mono text-secondary">
                                  {Math.round(Number(rec.confidence) * 100)}% {t.hero.confidence}
                                </span>
                                {rec.decision && (
                                  <span className="bg-foreground px-2 py-1 text-xs font-mono text-background">
                                    {rec.decision.readiness_score}/100 readiness
                                  </span>
                                )}
                              </div>
                              <Link href={`/skills/${rec.slug}`} className="font-display text-xl font-semibold hover:underline">
                                {rec.skill}
                              </Link>
                              <p className="mt-2 text-sm leading-relaxed text-secondary">
                                {rec.reasoning}
                              </p>

                              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                <div className="border border-border p-3">
                                  <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Use when</p>
                                  <ul className="space-y-1.5 text-secondary">
                                    {(rec.decision?.best_for || [rec.description || 'You need this capability in an agent workflow'])
                                      .slice(0, 2)
                                      .map((item) => (
                                        <li key={item}>{item}</li>
                                      ))}
                                  </ul>
                                </div>
                                <div className="border border-border p-3">
                                  <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Review first</p>
                                  <ul className="space-y-1.5 text-secondary">
                                    {(rec.decision?.risks || ['Review repository permissions and maintenance signals'])
                                      .slice(0, 2)
                                      .map((item) => (
                                        <li key={item}>{item}</li>
                                      ))}
                                  </ul>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-secondary">
                                {rec.stats && (
                                  <>
                                    <span className="border border-border px-2 py-1 font-mono">
                                      {formatCompact(rec.stats.stars)} stars
                                    </span>
                                    <span className="border border-border px-2 py-1 font-mono">
                                      {Math.round(rec.stats.quality_score || 0)}/100 quality
                                    </span>
                                  </>
                                )}
                                {(rec.use_cases || []).map((useCase) => (
                                  <Link
                                    key={useCase.slug}
                                    href={`/use-cases/${useCase.slug}`}
                                    className="border border-border px-2 py-1 transition-colors hover:border-foreground hover:text-foreground"
                                  >
                                    {useCase.title}
                                  </Link>
                                ))}
                              </div>
                            </div>

                            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-40">
                              <button
                                onClick={() => copyToClipboard(rec.install)}
                                className="w-full bg-foreground px-3 py-2.5 text-xs font-mono text-background transition-opacity hover:opacity-80"
                              >
                                {copiedCmd === rec.install ? 'Copied!' : t.hero.installCommand}
                              </button>
                              <Link
                                href={`/skills/${rec.slug}`}
                                className="w-full border border-border px-3 py-2.5 text-center text-xs font-mono transition-colors hover:border-foreground"
                              >
                                Decision page
                              </Link>
                            </div>
                          </div>
                          <div className="mt-3 break-all border border-border bg-background p-2 font-mono text-xs text-secondary">
                            {rec.install}
                          </div>
                        </div>
                      ))}
                    </div>

                    {(suggestedStacks.length > 0 || suggestedComposition?.steps?.length) && (
                      <div className="border-t border-border p-4 sm:p-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          {suggestedComposition?.steps?.length && (
                            <div>
                              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Implementation path</p>
                              <ol className="space-y-2 text-sm leading-relaxed text-secondary">
                                {suggestedComposition.steps.map((step, index) => (
                                  <li key={step} className="flex gap-3">
                                    <span className="font-mono text-foreground">{index + 1}</span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {suggestedStacks.length > 0 && (
                            <div>
                              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Related stacks</p>
                              <div className="space-y-2">
                                {suggestedStacks.map((stack) => (
                                  <Link
                                    key={stack.slug}
                                    href={`/collections/${stack.slug}`}
                                    className="block border border-border p-3 text-sm transition-colors hover:border-foreground"
                                  >
                                    <span className="font-semibold">{stack.name}</span>
                                    <span className="mt-1 block text-xs text-secondary">View stack playbook</span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-5 py-6 text-center text-sm text-secondary">
                    {t.hero.noResults}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CTA Row */}
          <div
            className="flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/skills"
              className="w-full bg-foreground px-7 py-3 text-center text-sm font-semibold text-background transition-opacity hover:opacity-90 sm:w-auto"
            >
              {t.hero.cta.browse}
            </Link>
            <Link
              href="/skill-packs"
              className="w-full border border-border px-7 py-3 text-center text-sm font-semibold transition-colors hover:border-foreground sm:w-auto"
            >
              Skill Packs
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {VALUE_PROPS.map(({ label, title, description, Icon }) => (
            <div
              key={label}
              className="rounded-[8px] border border-border/80 bg-card p-5 shadow-[0_16px_40px_rgba(23,23,23,0.04)] transition-transform hover:-translate-y-0.5"
            >
              <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-[8px] bg-foreground text-background">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="mb-2 text-xs uppercase tracking-widest text-secondary">{label}</p>
              <h2 className="font-display text-xl font-semibold leading-tight">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 text-center md:grid-cols-4">
          {[
            [stats.totalSkills.toLocaleString(), t.stats.skills],
            [`${Math.round(stats.totalDownloads / 1000)}K+`, t.stats.downloads],
            [stats.activePlatforms.toLocaleString(), t.stats.platforms],
            [stats.agentSubmissions.toLocaleString(), t.stats.agentSubmissions],
          ].map(([value, label]) => (
            <div key={label} className="rounded-[8px] border border-border/80 bg-card p-4 shadow-[0_12px_32px_rgba(23,23,23,0.035)] sm:p-5">
              <div className="font-display text-2xl font-bold sm:text-3xl">{value}</div>
              <div className="mt-1 text-xs text-secondary">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card/55 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Skill packs</p>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Start from a complete workflow</h2>
            </div>
            <Link href="/skill-packs" className="inline-flex items-center gap-1 text-sm font-semibold text-secondary transition-colors hover:text-foreground">
              View all packs
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {HOME_SKILL_PACKS.map((pack) => (
              <Link
                key={pack.slug}
                href={`/skill-packs/${pack.slug}`}
                className="group flex min-h-48 flex-col rounded-[8px] border border-border/80 bg-background p-4 shadow-[0_16px_40px_rgba(23,23,23,0.04)] transition-transform hover:-translate-y-0.5 hover:border-foreground sm:p-5"
              >
                <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-[8px] bg-muted text-foreground">
                  <Boxes className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="mb-2 text-xs uppercase tracking-widest text-secondary">{pack.shortTitle}</p>
                <h3 className="font-display text-lg font-semibold leading-tight group-hover:text-secondary">
                  {pack.title.replace(' agent pack', '')}
                </h3>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-secondary">{pack.eyebrow}</p>
                <span className="mt-auto pt-5 text-xs font-semibold text-foreground">
                  Open pack
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{t.featured.title}</h2>
            <Link href="/skills" className="inline-flex items-center gap-1 text-sm font-semibold text-secondary transition-colors hover:text-foreground">
              {t.featured.viewAll}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {featuredSkills.slice(0, 8).map((skill, index) => (
              <Link
                key={skill.slug}
                href={`/skills/${skill.slug}`}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[8px] border border-border/80 bg-card p-4 shadow-[0_12px_32px_rgba(23,23,23,0.035)] transition-transform hover:-translate-y-0.5 hover:border-foreground sm:gap-4"
                style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.04 + 0.1}s both` }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-muted font-display text-sm font-bold text-secondary">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold group-hover:underline sm:text-base">{skill.name}</h3>
                  <p className="truncate text-xs leading-relaxed text-secondary sm:text-sm">{skill.description}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-[8px] bg-muted px-2 py-1 font-mono text-xs text-secondary">
                  <Star className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatCompact(skill.github_stars)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-card/55 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Explore</p>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">More ways into the registry</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {EXPLORE_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between rounded-[8px] border border-border/80 bg-background px-4 py-3 text-sm font-semibold text-secondary shadow-[0_10px_28px_rgba(23,23,23,0.03)] transition-colors hover:border-foreground hover:text-foreground"
              >
                <span>{item.label}</span>
                <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
