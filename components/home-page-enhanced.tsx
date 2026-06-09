'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { SKILL_STACKS } from '@/lib/collections'
import { CORE_RANKINGS } from '@/lib/rankings'
import { FEATURED_BEST_PAGES } from '@/lib/seo/growth-pages'
import { FEATURED_GROWTH_GUIDES } from '@/lib/seo/growth-guides'
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

const HOME_USE_CASES = USE_CASES.slice(0, 6)
const HOME_STACKS = SKILL_STACKS.slice(0, 3)
const HOME_RANKINGS = CORE_RANKINGS.slice(0, 3)
const HOME_GUIDES = FEATURED_GROWTH_GUIDES.slice(0, 3)
const HOME_BEST_PAGES = FEATURED_BEST_PAGES.slice(0, 3)

function AnimatedNumber({ 
  value, 
  suffix = '',
}: { 
  value: number
  suffix?: string
  duration?: number 
}) {
  return (
    <span>{value.toLocaleString()}{suffix}</span>
  )
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}K`
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

export function HomePageEnhanced({ stats, activities, featuredSkills }: HomePageEnhancedProps) {
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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    if (diffInMinutes < 1) return t.activity.timeAgo.justNow
    if (diffInMinutes < 60) return t.activity.timeAgo.minutesAgo.replace('{count}', String(diffInMinutes))
    if (diffInMinutes < 1440) return t.activity.timeAgo.hoursAgo.replace('{count}', String(Math.floor(diffInMinutes / 60)))
    return t.activity.timeAgo.daysAgo.replace('{count}', String(Math.floor(diffInMinutes / 1440)))
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* ============================================= */}
      {/* HERO: The core innovation - action-first hero */}
      {/* ============================================= */}
      <section className="pt-16 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-5 flex justify-center">
            <Link
              href="/agent-skills-registry"
              className="border border-border bg-card px-3 py-1.5 text-center text-xs font-mono uppercase tracking-wider text-secondary transition-colors hover:border-foreground hover:text-foreground"
            >
              AI Agent Skills Registry & Recommendation API
            </Link>
          </div>
          {/* Animated Title */}
          <h1
            className="mx-auto max-w-5xl text-balance text-center font-display text-3xl font-bold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl"
            style={{ animation: 'fadeInUp 0.7s ease-out both' }}
          >
            {t.hero.title}
          </h1>

          <p
            className="mx-auto mb-8 mt-5 max-w-3xl text-center text-base leading-relaxed text-secondary sm:mb-10 sm:mt-6 sm:text-xl"
          >
            {t.hero.subtitle}
          </p>

          <div className="mx-auto mb-10 grid max-w-3xl gap-2 sm:grid-cols-3">
            <Link
              href="/agent-skill"
              className="border border-border bg-card px-3 py-2 text-center text-xs font-mono text-secondary transition-colors hover:border-foreground hover:text-foreground"
            >
              What is an agent skill?
            </Link>
            <Link
              href="/agent-skills-directory"
              className="border border-border bg-card px-3 py-2 text-center text-xs font-mono text-secondary transition-colors hover:border-foreground hover:text-foreground"
            >
              Agent skills directory
            </Link>
            <Link
              href="/api-docs"
              className="border border-border bg-card px-3 py-2 text-center text-xs font-mono text-secondary transition-colors hover:border-foreground hover:text-foreground"
            >
              Agent recommendation API
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
            {/* Install Command Preview */}
            <div className="bg-foreground text-background font-mono text-xs sm:text-sm px-4 sm:px-5 py-3 flex items-center justify-between">
              <span>
                <span className="text-background/50">{t.hero.installPrefix}</span>
                {' '}
                <span className="text-background/30">{t.hero.installPlaceholder}</span>
              </span>
              <button
                onClick={() => copyToClipboard('npx skills add ')}
                className="text-background/50 hover:text-background transition-colors text-xs"
              >
                {copiedCmd === 'npx skills add ' ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Natural Language Task Input */}
            <div className="border border-t-0 border-border bg-card">
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

          {/* Agent API Hint */}
          <div
            className="text-center text-xs font-mono text-secondary/60 mb-10 sm:mb-14"
          >
            {'>'} GET /api/agent/recommend?task=your+task
          </div>

          {/* CTA Row */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <Link
              href="/skills"
              className="w-full sm:w-auto px-8 py-3.5 bg-foreground text-background text-sm font-semibold text-center hover:opacity-90 transition-all"
            >
              {t.hero.cta.browse}
            </Link>
            <Link
              href="/submit"
              className="w-full sm:w-auto px-8 py-3.5 border border-border text-sm font-semibold text-center hover:bg-muted transition-all"
            >
              {t.hero.cta.submit}
            </Link>
            <Link
              href="/api-docs"
              className="w-full sm:w-auto px-8 py-3.5 border border-border text-sm font-semibold text-center hover:bg-muted transition-all"
            >
              {t.hero.cta.forAgents}
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/20 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto grid max-w-5xl gap-px border border-border bg-border md:grid-cols-3">
          <div className="bg-background p-5 sm:p-6">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Discover</p>
            <h2 className="font-display text-xl font-semibold">Agent-facing skill registry</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Turn a task description into a shortlist of reusable AI agent skills with install commands and repository links.
            </p>
          </div>
          <div className="bg-background p-5 sm:p-6">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Compare</p>
            <h2 className="font-display text-xl font-semibold">Trust, quality, and audit signals</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Check GitHub adoption, maintenance, platform hints, risk notes, and audit scores before an agent installs a skill.
            </p>
          </div>
          <div className="bg-background p-5 sm:p-6">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Install</p>
            <h2 className="font-display text-xl font-semibold">npm-style discovery for skills</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              OpenAgentSkill is built around the same simple idea as package registries: discover the right capability, then install it.
            </p>
          </div>
        </div>
      </section>

      {/* Stats — Animated countup numbers */}
      <section className="border-y border-border py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10">
            <div className="text-center">
              <div className="font-display text-3xl sm:text-4xl font-bold mb-1">
                <AnimatedNumber value={stats.totalSkills} duration={1200} />
              </div>
              <div className="text-xs sm:text-sm text-secondary">{t.stats.skills}</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl sm:text-4xl font-bold mb-1">
                <AnimatedNumber value={Math.round(stats.totalDownloads / 1000)} suffix="K+" duration={2000} />
              </div>
              <div className="text-xs sm:text-sm text-secondary">{t.stats.downloads}</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl sm:text-4xl font-bold mb-1">
                <AnimatedNumber value={stats.activePlatforms} duration={1400} />
              </div>
              <div className="text-xs sm:text-sm text-secondary">{t.stats.platforms}</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl sm:text-4xl font-bold mb-1">
                <AnimatedNumber value={stats.agentSubmissions} duration={1000} />
              </div>
              <div className="text-xs sm:text-sm text-secondary">{t.stats.agentSubmissions}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Growth hubs</p>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Find, compare, and share trusted skills</h2>
            </div>
            <Link href="/best" className="text-sm text-secondary underline underline-offset-2 transition-colors hover:text-foreground">
              Browse best-of lists
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/best"
              className="group border border-border bg-card p-5 transition-colors hover:border-foreground"
            >
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Best lists</p>
              <h3 className="font-display text-xl font-semibold group-hover:text-secondary">Use-case rankings</h3>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                Shortlists for web scraping, coding agents, RAG, browser automation, and more.
              </p>
            </Link>
            <Link
              href="/trending"
              className="group border border-border bg-card p-5 transition-colors hover:border-foreground"
            >
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Trending</p>
              <h3 className="font-display text-xl font-semibold group-hover:text-secondary">Find current momentum</h3>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                Track skills gaining page activity, install-copy intent, GitHub adoption, and quality signals.
              </p>
            </Link>
            <Link
              href="/official"
              className="group border border-border bg-card p-5 transition-colors hover:border-foreground"
            >
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Official makers</p>
              <h3 className="font-display text-xl font-semibold group-hover:text-secondary">Start with trusted sources</h3>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                Browse skills from recognized technology makers with trust, quality, and freshness signals.
              </p>
            </Link>
            <Link
              href="/agents"
              className="group border border-border bg-card p-5 transition-colors hover:border-foreground"
            >
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Agent fit</p>
              <h3 className="font-display text-xl font-semibold group-hover:text-secondary">Choose by agent</h3>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                Claude Code, Codex, Cursor, Copilot, Windsurf, Gemini, Cline, AMP, and Antigravity.
              </p>
            </Link>
            <Link
              href={`/alternatives/${featuredSkills[0]?.slug || 'crawl4ai'}`}
              className="group border border-border bg-card p-5 transition-colors hover:border-foreground"
            >
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Alternatives</p>
              <h3 className="font-display text-xl font-semibold group-hover:text-secondary">Compare before switching</h3>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                Find similar skills by category, tags, trust, quality, freshness, and install readiness.
              </p>
            </Link>
            <Link
              href="/audits"
              className="group border border-border bg-card p-5 transition-colors hover:border-foreground"
            >
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Audit reports</p>
              <h3 className="font-display text-xl font-semibold group-hover:text-secondary">Review before install</h3>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                Check install readiness, maintenance, trust, quality, and metadata warnings for indexed skills.
              </p>
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Link
              href="/compare/openagentskill-vs-skills-sh"
              className="border border-border px-4 py-3 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
            >
              OpenAgentSkill vs skills.sh
            </Link>
            <Link
              href="/alternatives/skills-sh"
              className="border border-border px-4 py-3 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
            >
              skills.sh alternatives
            </Link>
            <Link
              href="/reports/monthly"
              className="border border-border px-4 py-3 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
            >
              Monthly Agent Skills Index
            </Link>
            <Link
              href="/api-docs#skill-badges"
              className="border border-border px-4 py-3 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
            >
              README audit badges
            </Link>
            {HOME_BEST_PAGES.map((page) => (
              <Link
                key={page.slug}
                href={`/best/${page.slug}`}
                className="border border-border px-4 py-3 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Best {page.shortTitle.toLowerCase()} skills
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Use-case discovery</p>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Browse by what your agent needs to do</h2>
            </div>
            <Link href="/use-cases" className="text-sm text-secondary underline underline-offset-2 transition-colors hover:text-foreground">
              View all use cases
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {HOME_USE_CASES.map((useCase) => (
              <Link
                key={useCase.slug}
                href={`/use-cases/${useCase.slug}`}
                className="group border border-border bg-card p-5 transition-colors hover:border-foreground"
              >
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">{useCase.eyebrow}</p>
                <h3 className="font-display text-xl font-semibold group-hover:text-secondary">{useCase.shortTitle}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-secondary">{useCase.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Practical guides</p>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Answer the searches that bring builders here</h2>
            </div>
            <Link href="/guides" className="text-sm text-secondary underline underline-offset-2 transition-colors hover:text-foreground">
              Browse guides
            </Link>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {HOME_GUIDES.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group flex min-h-[250px] flex-col justify-between border border-border bg-card p-5 transition-colors hover:border-foreground"
              >
                <div>
                  <p className="mb-3 text-xs uppercase tracking-widest text-secondary">{guide.eyebrow}</p>
                  <h3 className="font-display text-xl font-semibold leading-tight group-hover:text-secondary">{guide.shortTitle}</h3>
                  <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-secondary">{guide.description}</p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="border border-border px-2 py-1 text-xs font-mono text-secondary">{guide.intent}</span>
                  {guide.platformLabel && (
                    <span className="border border-border px-2 py-1 text-xs font-mono text-secondary">
                      {guide.platformLabel}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Ranked discovery</p>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Start from a shortlist you can trust</h2>
            </div>
            <Link href="/rankings" className="text-sm text-secondary underline underline-offset-2 transition-colors hover:text-foreground">
              Browse rankings
            </Link>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {HOME_RANKINGS.map((ranking) => (
              <Link
                key={ranking.slug}
                href={`/rankings/${ranking.slug}`}
                className="group border border-border bg-card p-5 transition-colors hover:border-foreground"
              >
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">{ranking.eyebrow}</p>
                <h3 className="font-display text-xl font-semibold group-hover:text-secondary">{ranking.shortTitle}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-secondary">{ranking.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Skill stacks</p>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Install a workflow, not just a tool</h2>
            </div>
            <Link href="/collections" className="text-sm text-secondary underline underline-offset-2 transition-colors hover:text-foreground">
              Browse stacks
            </Link>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {HOME_STACKS.map((stack) => (
              <Link
                key={stack.slug}
                href={`/collections/${stack.slug}`}
                className="group border border-border bg-card p-5 transition-colors hover:border-foreground"
              >
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">{stack.eyebrow}</p>
                <h3 className="font-display text-xl font-semibold group-hover:text-secondary">{stack.shortTitle}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-secondary">{stack.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {stack.outcomes.slice(0, 2).map((outcome) => (
                    <span key={outcome} className="border border-border px-2 py-1 text-xs text-secondary">
                      {outcome}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Skills Leaderboard - Inspired by skills.sh */}
      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-baseline justify-between mb-8 sm:mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">{t.featured.title}</h2>
            <Link href="/skills" className="text-sm text-secondary hover:text-foreground transition-colors underline">
              {t.featured.viewAll}
            </Link>
          </div>

          {/* Leaderboard List */}
          <div className="border border-border divide-y divide-border">
            {featuredSkills.map((skill, index) => (
              <Link
                key={skill.slug}
                href={`/skills/${skill.slug}`}
                className="flex items-center gap-4 sm:gap-6 px-4 sm:px-6 py-4 hover:bg-muted/40 transition-colors group"
                style={{ animation: `fadeInUp 0.5s ease-out ${index * 0.06 + 0.2}s both` }}
              >
                {/* Rank */}
                <span className="text-xl sm:text-2xl font-display font-bold text-secondary/40 w-8 text-right shrink-0">
                  {index + 1}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-sm sm:text-base group-hover:underline truncate">
                      {skill.name}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-secondary truncate leading-relaxed">
                    {skill.description}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 sm:gap-6 text-xs font-mono text-secondary shrink-0">
                  <span className="hidden sm:inline">{'*'} {(skill.github_stars / 1000).toFixed(1)}K</span>
                  <span>{(skill.downloads / 1000).toFixed(1)}K</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Live Activity Feed */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-baseline justify-between mb-8 sm:mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold">{t.activity.title}</h2>
            <Link href="/activity" className="text-sm text-secondary hover:text-foreground transition-colors underline">
              {t.activity.viewAll}
            </Link>
          </div>

          <div className="space-y-0 border-l border-border">
            {activities.slice(0, 6).map((activity, index) => (
              <div
                key={activity.id}
                className="pl-5 sm:pl-6 py-3 relative hover:bg-muted/20 transition-colors"
                style={{ animation: `slideInLeft 0.4s ease-out ${index * 0.07}s both` }}
              >
                {/* Timeline dot */}
                <div className={`absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 ${
                  activity.actor_type === 'agent' ? 'bg-foreground' : 'bg-secondary/40'
                }`} />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {activity.actor_type === 'agent' && (
                        <span className="text-[10px] font-mono bg-foreground text-background px-1.5 py-px leading-normal">
                          AGENT
                        </span>
                      )}
                      <span className="font-mono text-xs sm:text-sm font-semibold">{activity.actor_name}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-secondary leading-relaxed truncate">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-[10px] sm:text-xs text-secondary/60 whitespace-nowrap shrink-0">
                    {formatTimeAgo(activity.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Essay - Editorial long-form */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 border-t border-border">
        <article className="max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-16 sm:mb-20">
            {t.essay.title}
          </h2>

          {Object.entries(t.essay.sections).map(([key, section], i) => (
            <section key={key} className={i > 0 ? 'mt-14 sm:mt-16' : ''}>
              <h3 className="font-display text-xl sm:text-2xl font-bold mb-5">
                {section.title}
              </h3>
              <div className="text-base sm:text-lg leading-[1.8] text-secondary space-y-4">
                {section.content.split('\n').filter(Boolean).map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </div>
            </section>
          ))}
        </article>
      </section>

      {/* How It Works */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 border-t border-border bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-10 sm:mb-14 text-center">
            {t.howItWorks.title}
          </h2>

          <div className="grid md:grid-cols-3 gap-10 sm:gap-14">
            <div>
              <h3 className="font-display text-lg font-bold mb-4">{t.howItWorks.forDevelopers.title}</h3>
              <ol className="space-y-3">
                {t.howItWorks.forDevelopers.steps.map((step, i) => (
                  <li key={i} className="text-sm text-secondary leading-relaxed flex gap-2">
                    <span className="font-mono text-foreground/40 shrink-0">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="font-display text-lg font-bold mb-4">{t.howItWorks.forAgents.title}</h3>
              <ol className="space-y-3">
                {t.howItWorks.forAgents.steps.map((step, i) => (
                  <li key={i} className="text-sm text-secondary leading-relaxed flex gap-2">
                    <span className="font-mono text-foreground/40 shrink-0">{i + 1}.</span>
                    <span className={i === 0 ? 'font-mono text-xs' : ''}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="font-display text-lg font-bold mb-4">{t.howItWorks.forEveryone.title}</h3>
              <p className="text-sm text-secondary leading-relaxed">{t.howItWorks.forEveryone.content}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 text-center border-t border-border">
        <div className="max-w-2xl mx-auto">
          <p className="font-display text-xl sm:text-2xl font-medium mb-8 leading-relaxed text-balance">
            {t.finalCta.message}
          </p>
          <Link
            href="/submit"
            className="inline-block px-10 py-4 bg-foreground text-background font-semibold hover:opacity-90 transition-opacity"
          >
            {t.finalCta.button}
          </Link>
        </div>
      </section>

      <SiteFooter />

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
