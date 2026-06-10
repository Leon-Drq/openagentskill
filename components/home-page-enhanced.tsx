'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Github, Search } from 'lucide-react'
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
  urls?: {
    web?: string
    api?: string
    install_api?: string
    audit?: string
    repository?: string
  }
  reasoning: string
}

const HOME_USE_CASES = USE_CASES.slice(0, 4)
const DEMO_TASK = 'Scrape competitor pricing pages every week'
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
const TRUST_SIGNALS = [
  ['Task fit', '96/100', 'Recommended for web extraction workflows'],
  ['Maintenance', 'Active', 'Stars, freshness, metadata, and repo health'],
  ['Install review', 'Ready', 'Agent-safe next steps before execution'],
]

const REGISTRY_LAYERS = [
  {
    label: 'Intent capture',
    code: 'Task · Agent · Context',
    desc: 'A human or upstream agent describes the job in natural language.',
    contract: 'Intent',
  },
  {
    label: 'Recommendation engine',
    code: 'Fit · Quality · Freshness',
    desc: 'Skills are ranked by workflow fit, maintenance, stars, and audit signals.',
    contract: 'Rank',
    accent: true,
  },
  {
    label: 'Skill trust profile',
    code: 'Risk · Install · Evidence',
    desc: 'Each candidate gets readiness notes, install commands, and review prompts.',
    contract: 'Audit',
  },
  {
    label: 'Agent install path',
    code: 'Codex · Claude Code · Cursor',
    desc: 'The registry returns the next action an agent can safely execute.',
    contract: 'Install',
  },
]

const QUICKSTART_STEPS = [
  {
    title: 'Ask for a skill path',
    desc: 'Send the task your agent needs to complete.',
    code: 'GET /api/skills/search?task=scrape+pricing+pages&min_stars=500',
  },
  {
    title: 'Inspect the trust profile',
    desc: 'Review fit, repository health, risks, and install readiness.',
    code: 'GET /api/agent/skills/crawl4ai',
  },
  {
    title: 'Install in an agent workflow',
    desc: 'Copy the command or hand it to Codex, Claude Code, Cursor, or a custom agent.',
    code: 'GET /api/skills/crawl4ai/install?format=text',
  },
  {
    title: 'Automate discovery',
    desc: 'Use the API as the registry layer behind your own agent runtime.',
    code: 'curl "https://www.openagentskill.com/api/agent/recommend?task=review+pull+requests"',
  },
]

const SCENARIO_RECOMMENDATIONS = [
  {
    slug: 'web-scraping',
    title: 'Web scraping',
    task: 'Monitor pricing and extract tables',
    skills: ['Crawl4AI', 'Firecrawl', 'Browser automation'],
  },
  {
    slug: 'coding-agents',
    title: 'Coding agents',
    task: 'Inspect repos, patch bugs, verify changes',
    skills: ['GitHub', 'Playwright', 'Code review'],
  },
  {
    slug: 'rag-knowledge',
    title: 'RAG workflows',
    task: 'Turn documents into grounded answers',
    skills: ['MarkItDown', 'LlamaIndex', 'Vector search'],
  },
  {
    slug: 'workflow-automation',
    title: 'Workflow automation',
    task: 'Connect repeated ops across tools',
    skills: ['n8n', 'Zapier', 'Scheduled agents'],
  },
]

const COMPARISON_ROWS = [
  {
    feature: 'Primary job',
    openagentskill: 'Recommend, compare, and install skills from one registry',
    skillsSh: 'Browse and install reusable agent skills',
    agentSkills: 'Define the open skill format and learning path',
    nativeDocs: 'Explain skills inside each native agent platform',
  },
  {
    feature: 'Agent-facing API',
    openagentskill: 'Yes - task-to-skill recommendations for agents',
    skillsSh: 'Directory and install workflow',
    agentSkills: 'Spec and documentation first',
    nativeDocs: 'Platform-specific APIs and docs',
  },
  {
    feature: 'Cross-agent positioning',
    openagentskill: 'Codex, Claude Code, Cursor, MCP-compatible agents, and custom tools',
    skillsSh: 'Open agent skills ecosystem',
    agentSkills: 'Open format for extending agents',
    nativeDocs: 'Best for the vendor platform',
  },
  {
    feature: 'Trust and audit signals',
    openagentskill: 'Stars, quality score, readiness notes, install review',
    skillsSh: 'Directory metadata',
    agentSkills: 'Metadata guidance in SKILL.md',
    nativeDocs: 'Native platform controls',
  },
  {
    feature: 'Best for',
    openagentskill: 'Letting an agent find the right skill automatically',
    skillsSh: 'Finding installable skills quickly',
    agentSkills: 'Learning or authoring the standard',
    nativeDocs: 'Using skills in one product',
  },
]

const COMPARISON_LINKS = [
  { label: 'OpenAgentSkill', href: '/' },
  { label: 'skills.sh', href: 'https://www.skills.sh/' },
  { label: 'agentskills.io', href: 'https://agentskills.io/home' },
  { label: 'Native docs', href: 'https://developers.openai.com/codex/skills' },
]

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}K`
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="min-w-0 max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#6d675e]">{eyebrow}</p>
      <h2
        className="mt-4 text-balance text-3xl font-normal leading-tight tracking-normal md:text-5xl"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {title}
      </h2>
    </div>
  )
}

export function HomePageEnhanced({ stats }: HomePageEnhancedProps) {
  const { t, locale } = useI18n()
  const [taskQuery, setTaskQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [searchedCount, setSearchedCount] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const isZh = locale === 'zh'
  const heroMain = isZh ? 'AI Agent Skills 的' : 'The open registry'
  const heroAccent = isZh ? '开放注册表。' : 'AI agent skills.'
  const heroSubtitle = isZh
    ? 'OpenAgentSkill 是 AI Agent Skills 的 npm：让 agent 在安装前自动发现、比较、审计并选择正确的技能。'
    : 'OpenAgentSkill is npm for AI Agent Skills: a registry and recommendation API that helps agents discover, compare, audit, and install reusable skills.'
  const heroEyebrow = isZh
    ? 'OPEN REGISTRY · TRUST SIGNALS · AGENT INSTALLS'
    : 'OPEN REGISTRY · TRUST SIGNALS · AGENT INSTALLS'

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
      setSearchedCount(data.meta?.total_skills_searched || 0)
    } catch {
      setRecommendations([])
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
    <div className="min-h-screen bg-[#fbfaf6] text-[#1d1b18]">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-[#e4e0d8]">
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-75"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(29,27,24,0.12) 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-20 md:pb-24 md:pt-28">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7a642]" aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#6d675e]">{heroEyebrow}</span>
          </div>

          <h1
            className="max-w-5xl text-balance text-5xl font-normal leading-[1.02] tracking-normal md:text-7xl lg:text-[5.6rem]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {isZh ? (
              <>
                {heroMain}
                <br className="hidden md:block" />
                <span className="italic text-[#006b4f]">{heroAccent}</span>
              </>
            ) : (
              <>
                {heroMain}
                <br className="hidden md:block" />
                {' '}for <span className="italic text-[#006b4f]">{heroAccent}</span>
              </>
            )}
          </h1>

          <p className="mt-8 max-w-3xl text-pretty text-lg leading-relaxed text-[#5f5a52] md:text-xl">
            {heroSubtitle}
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-3">
            <a
              href="#task-search"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#006b4f] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
            >
              Find skills for my agent
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="https://github.com/Leon-Drq/openagentskill"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-[#d8d2c6] bg-[#fffdf8]/85 px-5 text-sm font-semibold transition-colors hover:border-[#006b4f] hover:text-[#006b4f] sm:w-auto"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              View on GitHub
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <Link
              href="/api-docs"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-transparent px-2 font-mono text-xs text-[#6d675e] transition-colors hover:text-[#1d1b18] sm:w-auto"
            >
              Registry API
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-20 grid grid-cols-2 gap-y-6 border-t border-[#d8d2c6] pt-8 md:grid-cols-4">
            {[
              [stats.totalSkills.toLocaleString(), 'Indexed skills'],
              [`${Math.round(stats.totalDownloads / 1000)}K+`, 'Downloads'],
              [stats.activePlatforms.toLocaleString(), 'Agent surfaces'],
              ['API', 'Recommendation layer'],
            ].map(([value, label]) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#6d675e]">{label}</span>
                <span
                  className="text-2xl tracking-normal"
                  style={{ fontFamily: value === 'API' ? 'var(--font-mono)' : 'Georgia, "Times New Roman", serif' }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={searchRef}
        id="task-search"
        className="relative overflow-hidden border-b border-[#e4e0d8] px-6 py-20 md:py-24"
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-50"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(29,27,24,0.10) 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.42fr_0.58fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Agent recommendation"
              title="Describe the task. Get the trusted skill path."
            />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#5f5a52] sm:text-base">
              The API ranks skills by task fit, quality, maintenance, audit notes, and install readiness before an agent acts.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {HOME_USE_CASES.slice(0, 4).map((useCase) => (
                <button
                  key={useCase.slug}
                  type="button"
                  onClick={() => runRecommendation(useCase.heroPrompt)}
                  className="rounded-full border border-[#d8d2c6] bg-[#fffdf8]/80 px-3 py-1.5 text-xs font-medium text-[#5f5a52] transition-colors hover:border-[#006b4f] hover:text-[#006b4f]"
                >
                  {useCase.shortTitle}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-[10px] border border-[#d8d2c6] bg-[#fffdf8]/92 shadow-[0_18px_55px_rgba(29,27,24,0.05)]">
            <div className="border-b border-[#e4e0d8] p-4 sm:p-5">
              <label className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#6d675e]">
                What should your agent do?
              </label>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={taskQuery}
                  onChange={(e) => setTaskQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scrape websites and extract structured data..."
                  className="min-w-0 flex-1 rounded-[8px] border border-[#d8d2c6] bg-[#fbfaf6] px-4 py-3 text-sm outline-none placeholder:text-[#6d675e]/50 focus:border-[#006b4f]"
                />
                <button
                  onClick={handleFindSkills}
                  disabled={isSearching || !taskQuery.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#006b4f] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  {isSearching ? t.hero.searching : t.hero.findSkills}
                </button>
              </div>
              <button
                type="button"
                onClick={() => runRecommendation(DEMO_TASK)}
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#006b4f] transition-opacity hover:opacity-75"
              >
                Try demo task
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            {showResults ? (
              <div>
                <div className="flex flex-col gap-2 border-b border-[#e4e0d8] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#6d675e]">Agent skill plan</p>
                    <h3 className="mt-1 text-xl font-semibold">
                      {isSearching
                        ? 'Reviewing trust signals...'
                        : recommendations[0]
                          ? `Start with ${recommendations[0].skill}`
                          : 'No reliable match yet'}
                    </h3>
                  </div>
                  {!isSearching && searchedCount > 0 && (
                    <div className="rounded-full border border-[#d8d2c6] px-3 py-1.5 font-mono text-xs text-[#6d675e]">
                      Searched {formatCompact(searchedCount)} skills
                    </div>
                  )}
                </div>

                {isSearching ? (
                  <div className="px-5 py-10 text-center text-sm text-[#5f5a52]">
                    <span className="inline-block animate-pulse">{'>'} {t.hero.searching}</span>
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="grid gap-px bg-[#e4e0d8] md:grid-cols-3">
                    {recommendations.slice(0, 3).map((rec, i) => (
                      <div key={rec.slug} className="min-w-0 bg-[#fffdf8] p-4 sm:p-5">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#e8f1ed] px-2 py-1 font-mono text-[11px] font-semibold text-[#006b4f]">
                            #{rec.rank || i + 1}
                          </span>
                          <span className="rounded-full border border-[#d8d2c6] px-2 py-1 font-mono text-[11px] text-[#6d675e]">
                            {Math.round(Number(rec.confidence) * 100)}% fit
                          </span>
                        </div>
                        <Link href={`/skills/${rec.slug}`} className="text-lg font-semibold hover:text-[#006b4f]">
                          {rec.skill}
                        </Link>
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#5f5a52]">
                          {rec.decision?.headline || rec.reasoning}
                        </p>
                        <div className="mt-4 break-all rounded-[8px] border border-[#e0dbd2] bg-[#fbfaf6] p-2 font-mono text-[11px] text-[#6d675e]">
                          {rec.install}
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <button
                            onClick={() => copyToClipboard(rec.install)}
                            className="rounded-[8px] bg-[#1d1b18] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-85"
                          >
                            {copiedCmd === rec.install ? 'Copied!' : 'Copy install'}
                          </button>
                          <Link
                            href={rec.urls?.install_api || `/api/skills/${rec.slug}/install`}
                            className="rounded-[8px] border border-[#d8d2c6] px-3 py-2 text-center text-xs font-semibold transition-colors hover:border-[#006b4f] hover:text-[#006b4f]"
                          >
                            Install API
                          </Link>
                          <Link
                            href={`/skills/${rec.slug}`}
                            className="rounded-[8px] border border-[#d8d2c6] px-3 py-2 text-center text-xs font-semibold transition-colors hover:border-[#006b4f] hover:text-[#006b4f]"
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-8 text-center text-sm text-[#5f5a52]">
                    {t.hero.noResults}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-px bg-[#e4e0d8] sm:grid-cols-3">
                {TRUST_SIGNALS.map(([label, value, copy]) => (
                  <div key={label} className="bg-[#fffdf8] p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#6d675e]">{label}</p>
                    <p className="mt-2 font-mono text-sm font-semibold text-[#006b4f]">{value}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#5f5a52]">{copy}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-[#e4e0d8] px-6 py-20 md:py-28">
        <div className="mx-auto grid min-w-0 max-w-6xl gap-10 md:grid-cols-12">
          <div className="min-w-0 md:col-span-7">
            <SectionHeading
              eyebrow="Why OpenAgentSkill"
              title="Stop sending agents into random directories."
            />
            <p className="mt-6 text-lg leading-relaxed text-[#5f5a52] md:text-xl">
              A skill registry only becomes useful when an agent can trust it.
              OpenAgentSkill turns scattered GitHub projects into ranked, auditable,
              install-ready capabilities that can be called from Codex, Claude Code,
              Cursor, MCP-compatible agents, and custom runtimes.
            </p>

            <ul className="mt-8 space-y-5">
              {[
                ['01', 'Task-to-skill recommendations', 'Agents start with intent, not category pages. The registry maps a job to a ranked shortlist with fit reasons.'],
                ['02', 'Trust before install', 'Stars, freshness, quality score, risks, and readiness notes sit beside the command an agent will run.'],
                ['03', 'Human browse, agent API', 'People can browse the index; agents can call the same registry through recommendation and skill endpoints.'],
              ].map(([tag, title, body]) => (
                <li key={title} className="grid grid-cols-[auto_1fr] gap-5 border-t border-[#d8d2c6] pt-5">
                  <span className="font-mono text-xs text-[#6d675e]">{tag}</span>
                  <div>
                    <h3
                      className="text-xl tracking-normal"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {title}
                    </h3>
                    <p className="mt-2 leading-relaxed text-[#5f5a52]">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 md:col-span-5">
            <div className="sticky top-24 overflow-hidden rounded-[10px] border border-[#d8d2c6] bg-[#fffdf8] shadow-[0_18px_55px_rgba(29,27,24,0.05)]">
              <div className="border-b border-[#e4e0d8] p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#6d675e]">Registry response</p>
                <h3
                  className="mt-2 text-2xl leading-tight"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  One call, ranked install path.
                </h3>
              </div>
              <pre className="overflow-x-auto bg-[#f2f0e9]/70 p-5 font-mono text-[12px] leading-relaxed text-[#3f3b35]">
                <code>{`{
  "task": "scrape pricing pages",
  "recommendations": [
    {
      "skill": "Crawl4AI",
      "fit": 0.96,
      "readiness": "ready",
      "install": "npx skills add unclecode/crawl4ai",
      "install_api": "/api/skills/crawl4ai/install"
    }
  ]
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e4e0d8] bg-[#f3f1ea]/55 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid min-w-0 gap-8 md:grid-cols-12 md:items-end">
            <div className="min-w-0 md:col-span-7">
              <SectionHeading
                eyebrow="Architecture"
                title="Four layers between intent and install."
              />
              <p className="mt-6 max-w-2xl leading-relaxed text-[#5f5a52]">
                The homepage should make the product feel real. OpenAgentSkill is not
                another static list; it is a registry loop an agent can call before it
                writes files, opens browsers, or installs third-party code.
              </p>
            </div>

            <div className="min-w-0 md:col-span-5">
              <div className="grid overflow-hidden rounded-[10px] border border-[#d8d2c6] bg-[#fffdf8] sm:grid-cols-3">
                {[
                  ['Indexed', stats.totalSkills.toLocaleString()],
                  ['Signals', 'Fit · Risk'],
                  ['Surface', 'API · UI'],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-[#e4e0d8] px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6d675e]">{label}</p>
                    <p className="mt-1 whitespace-nowrap font-mono text-sm text-[#1d1b18]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 grid min-w-0 gap-8 lg:grid-cols-12">
            <ol className="space-y-3 lg:col-span-7">
              {REGISTRY_LAYERS.map((layer, index) => (
                <li
                  key={layer.label}
                  className={`grid min-w-0 grid-cols-[3rem_1fr] gap-4 rounded-[10px] border p-4 md:grid-cols-[3.5rem_1fr_auto] md:items-center md:p-5 ${
                    layer.accent
                      ? 'border-[#006b4f]/45 bg-[#e8f1ed] shadow-[0_0_0_1px_rgba(0,107,79,0.10)]'
                      : 'border-[#d8d2c6] bg-[#fffdf8]'
                  }`}
                >
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-[8px] border font-mono text-sm ${
                      layer.accent
                        ? 'border-[#006b4f]/40 bg-[#006b4f] text-white'
                        : 'border-[#d8d2c6] bg-[#f2f0e9] text-[#6d675e]'
                    }`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3
                        className="text-xl leading-tight"
                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                      >
                        {layer.label}
                      </h3>
                      {layer.accent && (
                        <span className="rounded-full border border-[#006b4f]/25 bg-[#fbfaf6] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#006b4f]">
                          ranker
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#5f5a52]">{layer.desc}</p>
                  </div>

                  <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1 md:justify-end">
                    <span className="rounded-full border border-[#d8d2c6] bg-[#fbfaf6] px-3 py-1 font-mono text-[11px] text-[#6d675e]">
                      {layer.code}
                    </span>
                    <span className="rounded-full border border-[#d8d2c6] bg-[#f2f0e9] px-3 py-1 font-mono text-[11px] text-[#1d1b18]">
                      {layer.contract}
                    </span>
                  </div>
                </li>
              ))}
            </ol>

            <aside className="lg:col-span-5">
              <div className="sticky top-24 overflow-hidden rounded-[10px] border border-[#d8d2c6] bg-[#fffdf8] shadow-[0_18px_55px_rgba(29,27,24,0.05)]">
                <div className="border-b border-[#d8d2c6] bg-[#f2f0e9]/70 px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6d675e]">Execution loop</p>
                  <h3
                    className="mt-1 text-2xl leading-none"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    Discover → Inspect → Install
                  </h3>
                </div>
                <div className="divide-y divide-[#e4e0d8]">
                  {DEMO_RECOMMENDATIONS.map((item, index) => (
                    <div key={item.name} className="grid grid-cols-[2.25rem_1fr] gap-4 p-5">
                      <span className="grid h-9 w-9 place-items-center rounded-[8px] border border-[#d8d2c6] bg-[#fbfaf6] font-mono text-[11px] text-[#006b4f]">
                        0{index + 1}
                      </span>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6d675e]">{item.score}/100 fit</p>
                        <h4 className="mt-1 font-medium">{item.name}</h4>
                        <p className="mt-1.5 text-sm leading-relaxed text-[#5f5a52]">{item.fit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e4e0d8] px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Quickstart"
            title="From task description to install command."
          />

          <ol className="mt-12 grid gap-6 md:grid-cols-2">
            {QUICKSTART_STEPS.map((step, index) => (
              <li key={step.title} className="overflow-hidden rounded-[10px] border border-[#d8d2c6] bg-[#fffdf8]">
                <div className="flex items-start gap-4 px-6 pt-6">
                  <span className="font-mono text-xs tabular-nums text-[#6d675e]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3
                      className="text-xl tracking-normal"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#5f5a52]">{step.desc}</p>
                  </div>
                </div>
                <pre className="mt-5 overflow-x-auto border-t border-[#e4e0d8] bg-[#f2f0e9]/70 p-5 font-mono text-[12.5px] leading-relaxed text-[#3f3b35]">
                  <code>{step.code}</code>
                </pre>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap items-center gap-3 rounded-[10px] border border-dashed border-[#d8d2c6] bg-[#fffdf8] p-5 text-sm text-[#5f5a52]">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#1d1b18]">Agent surfaces</span>
            <span>Codex, Claude Code, Cursor, MCP-compatible agents, and custom internal runners.</span>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e4e0d8] px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Compare"
            title="How OpenAgentSkill differs from other skill platforms."
          />
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#5f5a52]">
            The big bet is simple: ordinary directories are for people to browse. OpenAgentSkill is built so an AI agent can discover, compare, and install the right skill automatically.
          </p>

          <div className="mt-8 overflow-hidden rounded-[12px] border border-[#d8d2c6] bg-[#fffdf8]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d8d2c6]">
                    <th className="w-[23%] px-4 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[#6d675e]">
                      Feature
                    </th>
                    {COMPARISON_LINKS.map((item, index) => (
                      <th
                        key={item.label}
                        className={`px-4 py-4 font-mono text-[11px] uppercase tracking-[0.18em] ${
                          index === 0 ? 'bg-[#e8f1ed] text-[#123b2f]' : 'text-[#6d675e]'
                        }`}
                      >
                        {item.href === '/' ? (
                          item.label
                        ) : (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-colors hover:text-[#006b4f]"
                          >
                            {item.label}
                          </a>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature} className="border-b border-[#e4e0d8] last:border-b-0">
                      <td className="px-4 py-4 text-base font-medium text-[#1d1b18]">{row.feature}</td>
                      <td className="bg-[#edf5f1] px-4 py-4 font-medium text-[#123b2f]">{row.openagentskill}</td>
                      <td className="px-4 py-4 text-[#5f5a52]">{row.skillsSh}</td>
                      <td className="px-4 py-4 text-[#5f5a52]">{row.agentSkills}</td>
                      <td className="px-4 py-4 text-[#5f5a52]">{row.nativeDocs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-[#6d675e]">
            Comparison is based on each project&apos;s public positioning and documentation. The point is not that one project replaces another; OpenAgentSkill focuses on the registry and recommendation layer agents can call.
          </p>
        </div>
      </section>

      <section className="border-b border-[#e4e0d8] px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionHeading
                eyebrow="Workflow starts"
                title="Start from the job your agent needs to do."
              />
            </div>
            <Link href="/use-cases" className="inline-flex items-center gap-1 text-sm font-semibold text-[#5f5a52] transition-colors hover:text-[#006b4f]">
              View all use cases
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[10px] border border-[#d8d2c6] bg-[#d8d2c6] md:grid-cols-2 lg:grid-cols-4">
            {SCENARIO_RECOMMENDATIONS.map(({ slug, title, task, skills }, index) => (
              <Link
                key={slug}
                href={`/use-cases/${slug}`}
                className="group flex min-h-64 flex-col bg-[#fffdf8] p-5 transition-colors hover:bg-[#f7f4ec]"
              >
                <span className="font-mono text-xs text-[#6d675e]">{String(index + 1).padStart(2, '0')}</span>
                <h3
                  className="mt-4 text-xl leading-tight"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5f5a52]">{task}</p>
                <div className="mt-5 space-y-2">
                  {skills.map((skill) => (
                    <div key={skill} className="rounded-full border border-[#e0dbd2] bg-[#fbfaf6] px-3 py-2 font-mono text-[11px] text-[#5f5a52]">
                      {skill}
                    </div>
                  ))}
                </div>
                <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-[#006b4f]">
                  Get recommendations
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl border-t border-[#d8d2c6] pt-12">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#6d675e]">Open registry</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2
                className="max-w-4xl text-4xl font-normal leading-tight tracking-normal md:text-6xl"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Search for humans. API for agents.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#5f5a52] md:text-lg">
                Browse when you are exploring. Call the recommendation API when your
                agent needs to pick, compare, and install a skill automatically.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/skills"
                className="inline-flex h-11 items-center justify-center rounded-[8px] bg-[#006b4f] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Browse skills
              </Link>
              <Link
                href="/api-docs"
                className="inline-flex h-11 items-center justify-center rounded-[8px] border border-[#d8d2c6] bg-[#fffdf8] px-5 text-sm font-semibold transition-colors hover:border-[#006b4f] hover:text-[#006b4f]"
              >
                Read API docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

    </div>
  )
}
