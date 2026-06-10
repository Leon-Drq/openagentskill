'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Bot, CheckCircle2, Code2, Database, Search, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
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
const DEMO_TASK = 'Scrape competitor pricing pages every week'
const AGENT_PLATFORMS = ['Codex', 'Claude Code', 'Cursor', 'MCP agents', 'OpenCode', 'Custom API']
const DEMO_RECOMMENDATIONS = [
  {
    name: 'Crawl4AI',
    fit: 'Primary crawler',
    score: '96',
    install: 'npx skills add unclecode/crawl4ai',
  },
  {
    name: 'Firecrawl',
    fit: 'LLM-ready extraction',
    score: '92',
    install: 'npx skills add firecrawl/firecrawl',
  },
  {
    name: 'Browser automation pack',
    fit: 'Fallback for dynamic pages',
    score: '89',
    install: 'open pack',
  },
]
const SCENARIO_RECOMMENDATIONS = [
  {
    slug: 'web-scraping',
    title: 'Web scraping',
    task: 'Monitor pricing and extract tables',
    skills: ['Crawl4AI', 'Firecrawl', 'Browser automation'],
    Icon: Search,
  },
  {
    slug: 'coding-agents',
    title: 'Coding agents',
    task: 'Inspect repos, patch bugs, verify changes',
    skills: ['GitHub', 'Playwright', 'Code review'],
    Icon: Code2,
  },
  {
    slug: 'rag-knowledge',
    title: 'RAG workflows',
    task: 'Turn documents into grounded answers',
    skills: ['MarkItDown', 'LlamaIndex', 'Vector search'],
    Icon: Database,
  },
  {
    slug: 'workflow-automation',
    title: 'Workflow automation',
    task: 'Connect repeated ops across tools',
    skills: ['n8n', 'Zapier', 'Scheduled agents'],
    Icon: Bot,
  },
]
function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}K`
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

export function HomePageEnhanced({ stats }: HomePageEnhancedProps) {
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
      const res = await fetch(`/api/agent/recommend?task=${encodeURIComponent(normalizedQuery)}&limit=3`)
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

      <section className="px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-14 lg:pt-18">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="min-w-0">
            <div className="mb-4 flex justify-center lg:justify-start">
              <Link
                href="/agent-skills-registry"
                className="max-w-full border border-border bg-card px-2.5 py-1.5 text-center font-mono text-[10px] uppercase tracking-normal text-secondary transition-colors hover:border-foreground hover:text-foreground sm:px-3 sm:text-xs sm:tracking-wider"
              >
                <span className="hidden sm:inline">OpenAgentSkill is npm for AI Agent Skills</span>
                <span className="sm:hidden">npm for AI Agent Skills</span>
              </Link>
            </div>

            <h1
              className="mx-auto max-w-4xl text-balance text-center font-display text-3xl font-bold leading-[1.06] tracking-tight sm:text-5xl lg:mx-0 lg:text-left lg:text-6xl"
              style={{ animation: 'fadeInUp 0.7s ease-out both' }}
            >
              {t.hero.title}
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-secondary sm:mt-5 sm:text-lg lg:mx-0 lg:text-left">
              {t.hero.subtitle}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AGENT_PLATFORMS.map((platform) => (
                <div
                  key={platform}
                  className="flex items-center gap-2 rounded-[8px] border border-border/80 bg-card px-3 py-2 text-xs font-semibold text-secondary shadow-[0_10px_28px_rgba(23,23,23,0.03)]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                  <span>{platform}</span>
                </div>
              ))}
            </div>

            <div ref={searchRef} id="task-search" className="mt-7">
            {/* Natural Language Task Input */}
            <div className="rounded-t-[8px] border border-border/80 bg-card shadow-[0_18px_45px_rgba(23,23,23,0.04)]">
              <div className="px-4 pb-2 pt-4 sm:px-5">
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
                  className="inline-flex w-full items-center justify-center gap-2 border-t border-border bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto sm:border-t-0 sm:px-7"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  {isSearching ? t.hero.searching : t.hero.findSkills}
                </button>
              </div>
            </div>

            <div className="rounded-b-[8px] border-x border-b border-border/80 bg-card px-4 py-3 sm:px-5">
              <div className="mb-2 text-xs font-mono uppercase tracking-wider text-secondary">
                Start from a workflow
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => runRecommendation(DEMO_TASK)}
                  className="border border-foreground bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-85"
                >
                  Try demo task
                </button>
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
                      {recommendations.slice(0, 3).map((rec, i) => (
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
                              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-secondary sm:line-clamp-none">
                                {rec.reasoning}
                              </p>

                              <div className="mt-4 hidden gap-3 text-sm sm:grid sm:grid-cols-2">
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

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => runRecommendation(DEMO_TASK)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-foreground px-6 py-3 text-center text-sm font-semibold text-background transition-opacity hover:opacity-90 sm:w-auto"
              >
                {t.hero.cta.browse}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <Link
                href="/api-docs"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-border/80 bg-card px-6 py-3 text-center text-sm font-semibold transition-colors hover:border-foreground sm:w-auto"
              >
                Try Registry API
              </Link>
              <Link
                href="/skill-packs"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-border/80 bg-card px-6 py-3 text-center text-sm font-semibold transition-colors hover:border-foreground sm:w-auto"
              >
                Install a Skill Pack
              </Link>
            </div>
          </div>

          <div className="min-w-0 rounded-[8px] border border-border/80 bg-card shadow-[0_24px_70px_rgba(23,23,23,0.08)]">
            <div className="border-b border-border/80 p-4 sm:p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-secondary">Example registry response</p>
              <h2 className="mt-2 font-display text-2xl font-bold leading-tight">
                {DEMO_TASK}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                The registry turns a messy task into installable skills, fit reasons, and agent-ready next steps.
              </p>
            </div>

            <div className="divide-y divide-border/80">
              {DEMO_RECOMMENDATIONS.map((item, index) => (
                <div key={item.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 sm:p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-muted font-mono text-xs font-bold">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-semibold">{item.name}</p>
                      <span className="rounded-[8px] bg-muted px-2 py-1 text-[11px] font-mono text-secondary">
                        {item.score}/100 fit
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-secondary">{item.fit}</p>
                    <p className="mt-2 truncate font-mono text-xs text-secondary">{item.install}</p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-secondary" aria-hidden="true" />
                </div>
              ))}
            </div>

            <div className="grid gap-3 border-t border-border/80 p-4 sm:grid-cols-3 sm:p-5">
              {[
                ['Trust score', 'Stars + freshness + metadata'],
                ['Install ready', 'CLI and agent prompts'],
                ['API first', 'Readable by humans and agents'],
              ].map(([label, copy]) => (
                <div key={label} className="rounded-[8px] bg-muted p-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-secondary">{label}</p>
                  <p className="mt-1 text-sm font-semibold">{copy}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-border/80 bg-foreground p-4 text-background sm:p-5">
              <p className="mb-2 text-xs font-mono uppercase tracking-wider text-background/60">Agent API</p>
              <code className="block overflow-x-auto whitespace-nowrap font-mono text-xs sm:text-sm">
                GET /api/agent/recommend?task=scrape+pricing
              </code>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-6 sm:pb-12">
        <div className="mx-auto max-w-6xl rounded-[8px] border border-border/80 bg-card p-4 shadow-[0_18px_45px_rgba(23,23,23,0.04)] sm:p-5">
          <div className="grid gap-3 md:grid-cols-[0.85fr_1.15fr] md:items-center">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-secondary">Agent compatibility</p>
              <h2 className="mt-2 font-display text-2xl font-bold">One registry for every agent surface</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AGENT_PLATFORMS.map((platform) => (
                <div key={platform} className="flex items-center gap-2 rounded-[8px] bg-muted px-3 py-2 text-sm font-semibold">
                  <Bot className="h-4 w-4 text-secondary" aria-hidden="true" />
                  {platform}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border/80 pt-5 sm:grid-cols-4">
            {[
              [stats.totalSkills.toLocaleString(), 'skills indexed'],
              [`${Math.round(stats.totalDownloads / 1000)}K+`, 'downloads'],
              [stats.activePlatforms.toLocaleString(), 'platforms'],
              [stats.agentSubmissions.toLocaleString(), 'agent submissions'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-[8px] bg-muted px-3 py-3">
                <p className="font-display text-xl font-bold">{value}</p>
                <p className="mt-1 text-xs text-secondary">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Scenario recommendations</p>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Start from the job your agent needs to do</h2>
            </div>
            <Link href="/use-cases" className="inline-flex items-center gap-1 text-sm font-semibold text-secondary transition-colors hover:text-foreground">
              View all use cases
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {SCENARIO_RECOMMENDATIONS.map(({ slug, title, task, skills, Icon }) => (
              <Link
                key={slug}
                href={`/use-cases/${slug}`}
                className="group flex min-h-64 flex-col rounded-[8px] border border-border/80 bg-card p-5 shadow-[0_16px_40px_rgba(23,23,23,0.04)] transition-transform hover:-translate-y-0.5 hover:border-foreground"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[8px] bg-foreground text-background">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{task}</p>
                <div className="mt-5 space-y-2">
                  {skills.map((skill) => (
                    <div key={skill} className="rounded-[8px] bg-muted px-3 py-2 text-xs font-semibold text-secondary">
                      {skill}
                    </div>
                  ))}
                </div>
                <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold">
                  Get recommendations
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="mx-auto grid min-w-0 max-w-6xl overflow-hidden rounded-[8px] bg-foreground text-background shadow-[0_24px_70px_rgba(23,23,23,0.12)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="min-w-0 p-5 sm:p-8">
            <p className="text-xs font-mono uppercase tracking-wider text-background/60">Registry layer</p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
              Search for humans. API for agents.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-background/70 sm:text-base">
              Browse the registry when you are exploring. Call the recommendation API when your agent needs to pick, compare, and install a skill automatically.
            </p>
          </div>

          <div className="min-w-0 border-t border-background/15 p-5 sm:p-8 lg:border-l lg:border-t-0">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['recommend', 'Rank skills by task fit'],
                ['compare', 'Expose trust signals'],
                ['install', 'Return agent-ready commands'],
              ].map(([label, copy]) => (
                <div key={label} className="rounded-[8px] bg-background/10 p-4">
                  <p className="font-mono text-xs uppercase tracking-wider text-background/55">{label}</p>
                  <p className="mt-2 text-sm font-semibold leading-snug">{copy}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 min-w-0 rounded-[8px] bg-background p-4 text-foreground">
              <p className="mb-2 text-xs font-mono uppercase tracking-wider text-secondary">Open endpoint</p>
              <code className="block break-all font-mono text-xs sm:break-normal sm:text-sm">
                GET /api/agent/recommend?task=review+pull+requests
              </code>
            </div>
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
