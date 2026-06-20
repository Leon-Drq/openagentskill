import { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import { getAllSkills, getCategories, type SkillAgentStats, type SkillRecord, type SkillSortMode, getSkillStats } from '@/lib/db/skills'
import { SkillsPageClient } from '@/components/skills-page-client'
import { getSkillQualityProfile, getPlatformHints } from '@/lib/quality'
import { getSkillSupplyProfile, getSupplyTrackSummaries } from '@/lib/supply'
import { getSkillTrustProfile } from '@/lib/trust'
import { getUseCaseBySlug, scoreSkillForUseCase, USE_CASES } from '@/lib/use-cases'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Browse AI Agent Skills',
  description: 'Discover AI agent skills for web automation, coding agents, RAG, data processing, workflow automation, and more. Filter by category, GitHub stars, popularity, or recent updates.',
  keywords: ['AI agent skills', 'agent tools', 'Claude tools', 'GPT plugins', 'LangChain tools', 'agent marketplace'],
  openGraph: {
    title: 'Browse AI Agent Skills — Open Agent Skill',
    description: 'Discover high-star AI agent skills, browser automation tools, coding agents, RAG tools, and agent frameworks.',
    type: 'website',
    url: 'https://www.openagentskill.com/skills',
  },
  alternates: {
    canonical: 'https://www.openagentskill.com/skills',
  },
}

const BASE_SKILL_CANDIDATE_LIMIT = 160
const MAX_SKILL_CANDIDATE_LIMIT = 480
const VISIBLE_SKILL_LIMIT = 16
const SKILLS_PAGE_REVALIDATE = 300
const MAX_SKILLS_PAGE = Math.ceil(MAX_SKILL_CANDIDATE_LIMIT / VISIBLE_SKILL_LIMIT)
const SKILLS_PAGE_QUERY_TIMEOUT_MS = 1200
const FALLBACK_DATE = '2026-06-01T00:00:00.000Z'

function fallbackSkill(input: {
  slug: string
  name: string
  description: string
  repo: string
  category: string
  tags: string[]
  frameworks: string[]
  stars: number
  quality: number
  license?: string
}): SkillRecord {
  return {
    id: `fallback-${input.slug}`,
    slug: input.slug,
    name: input.name,
    description: input.description,
    long_description: input.description,
    tagline: input.description,
    author_name: input.repo.split('/')[0],
    author_email: null,
    author_url: `https://github.com/${input.repo.split('/')[0]}`,
    repository: `https://github.com/${input.repo}`,
    github_repo: input.repo,
    github_stars: input.stars,
    github_forks: 0,
    category: input.category,
    tags: input.tags,
    frameworks: input.frameworks,
    version: '1.0.0',
    license: input.license || 'Unknown',
    install_command: `npx skills add ${input.repo}`,
    npm_package: null,
    verified: false,
    submission_source: 'fallback',
    submitted_by_agent: null,
    ai_review_score: null,
    ai_review_approved: true,
    ai_review_issues: [],
    ai_review_suggestions: [],
    downloads: Math.max(1000, Math.round(input.stars * 1.3)),
    used_by: 0,
    rating: 0,
    review_count: 0,
    quality_score: input.quality,
    quality_signals: null,
    github_language: null,
    github_last_pushed_at: FALLBACK_DATE,
    created_at: FALLBACK_DATE,
    updated_at: FALLBACK_DATE,
  }
}

const FALLBACK_SKILLS: SkillRecord[] = [
  fallbackSkill({
    slug: 'crawl4ai',
    name: 'Crawl4AI',
    description: 'Open-source LLM-friendly web crawler and scraper for agent workflows.',
    repo: 'unclecode/crawl4ai',
    category: 'Web Scraping',
    tags: ['web scraping', 'crawler', 'research'],
    frameworks: ['Codex', 'Claude Code', 'Cursor'],
    stars: 66_000,
    quality: 96,
    license: 'Apache-2.0',
  }),
  fallbackSkill({
    slug: 'firecrawl',
    name: 'Firecrawl',
    description: 'Turn websites into clean markdown or structured data for retrieval and agents.',
    repo: 'mendableai/firecrawl',
    category: 'Web Scraping',
    tags: ['crawler', 'markdown', 'rag'],
    frameworks: ['Codex', 'Claude Code', 'Cursor'],
    stars: 34_000,
    quality: 94,
    license: 'AGPL-3.0',
  }),
  fallbackSkill({
    slug: 'n8n',
    name: 'n8n',
    description: 'Workflow automation for connecting agents to repeated operational tasks.',
    repo: 'n8n-io/n8n',
    category: 'Workflow Automation',
    tags: ['automation', 'workflow', 'integration'],
    frameworks: ['API', 'CLI', 'Agent workflow'],
    stars: 190_000,
    quality: 92,
  }),
  fallbackSkill({
    slug: 'markitdown',
    name: 'MarkItDown',
    description: 'Convert PDFs, Office documents, and web files into clean markdown for agents.',
    repo: 'microsoft/markitdown',
    category: 'Research',
    tags: ['pdf', 'markdown', 'documents'],
    frameworks: ['Codex', 'Claude Code', 'Cursor'],
    stars: 80_000,
    quality: 93,
    license: 'MIT',
  }),
  fallbackSkill({
    slug: 'llamaindex',
    name: 'LlamaIndex',
    description: 'Data framework for building RAG and knowledge workflows around agent tasks.',
    repo: 'run-llama/llama_index',
    category: 'RAG',
    tags: ['rag', 'knowledge', 'retrieval'],
    frameworks: ['Python', 'Codex', 'Claude Code'],
    stars: 42_000,
    quality: 91,
    license: 'MIT',
  }),
  fallbackSkill({
    slug: 'openbb',
    name: 'OpenBB',
    description: 'Open-source investment research platform for financial analysis agents.',
    repo: 'OpenBB-finance/OpenBB',
    category: 'Finance',
    tags: ['finance', 'stocks', 'research'],
    frameworks: ['Python', 'Codex', 'Claude Code'],
    stars: 46_000,
    quality: 90,
  }),
  fallbackSkill({
    slug: 'browser-use',
    name: 'Browser Use',
    description: 'Browser automation layer for agents that need to interact with websites.',
    repo: 'browser-use/browser-use',
    category: 'Browser Automation',
    tags: ['browser', 'automation', 'agent'],
    frameworks: ['Python', 'Browser', 'Agent workflow'],
    stars: 75_000,
    quality: 90,
  }),
  fallbackSkill({
    slug: 'playwright',
    name: 'Playwright',
    description: 'Reliable browser automation and testing engine for web agent tasks.',
    repo: 'microsoft/playwright',
    category: 'Browser Automation',
    tags: ['browser', 'testing', 'automation'],
    frameworks: ['Node.js', 'Python', 'Codex'],
    stars: 76_000,
    quality: 89,
    license: 'Apache-2.0',
  }),
  fallbackSkill({
    slug: 'last30days-skill',
    name: 'Last30days Skill',
    description: 'Research recent cross-source changes across Reddit, X, YouTube, Hacker News, and the web.',
    repo: 'mvanhorn/last30days-skill',
    category: 'Research',
    tags: ['research', 'recent events', 'briefing'],
    frameworks: ['Codex', 'Claude Code'],
    stars: 42_500,
    quality: 88,
  }),
  fallbackSkill({
    slug: 'addyosmani-agent-skills',
    name: 'Agent Skills',
    description: 'Production-grade engineering skills and quality gates for AI coding agents.',
    repo: 'addyosmani/agent-skills',
    category: 'Coding Agents',
    tags: ['agent-skills', 'coding-agents', 'claude-code', 'cursor', 'gemini-cli', 'engineering'],
    frameworks: ['Claude Code', 'Cursor', 'Gemini CLI', 'Codex'],
    stars: 61_800,
    quality: 94,
    license: 'MIT',
  }),
  fallbackSkill({
    slug: 'serenity-skill',
    name: 'Serenity Skill',
    description: 'Stock analysis skill for market research and financial reasoning workflows.',
    repo: 'muxuuu/serenity-skill',
    category: 'Finance',
    tags: ['stocks', 'finance', 'analysis'],
    frameworks: ['Codex', 'Claude Code'],
    stars: 12_000,
    quality: 86,
  }),
  fallbackSkill({
    slug: 'seedance-2-0',
    name: 'Seedance 2.0 Skill',
    description: 'Creative video generation workflow skill for Seedance 2.0 filmmaking agents.',
    repo: 'Emily2040/seedance-2.0',
    category: 'Design',
    tags: ['video', 'creative', 'seedance'],
    frameworks: ['Codex', 'Claude Code'],
    stars: 8_000,
    quality: 84,
  }),
  fallbackSkill({
    slug: 'vectorbt',
    name: 'Vectorbt',
    description: 'Fast quantitative research and backtesting workflows for financial agents.',
    repo: 'polakowo/vectorbt',
    category: 'Finance',
    tags: ['quant', 'backtesting', 'finance'],
    frameworks: ['Python', 'Codex'],
    stars: 5_400,
    quality: 83,
  }),
]

const getCachedCategories = unstable_cache(
  async () => getCategories(),
  ['skills-page-categories-v1'],
  { revalidate: SKILLS_PAGE_REVALIDATE }
)

const getCachedSkillStats = unstable_cache(
  async () => getSkillStats(),
  ['skills-page-stats-v1'],
  { revalidate: SKILLS_PAGE_REVALIDATE }
)

function getCachedSkillCandidates(sort: SkillSortMode, category: string | undefined, limit: number) {
  return unstable_cache(
    async () => getAllSkills(sort, category, limit),
    ['skills-page-candidates-v3', sort, category || 'all', String(limit)],
    { revalidate: SKILLS_PAGE_REVALIDATE }
  )()
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function getFallbackSkills(sort: SkillSortMode, category: string | undefined, limit: number) {
  const records = category
    ? FALLBACK_SKILLS.filter((skill) => skill.category.toLowerCase() === category.toLowerCase())
    : [...FALLBACK_SKILLS]

  records.sort((a, b) => {
    if (sort === 'stars') return Number(b.github_stars || 0) - Number(a.github_stars || 0)
    if (sort === 'new' || sort === 'fresh') {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    }
    if (sort === 'downloads' || sort === 'trending') return Number(b.downloads || 0) - Number(a.downloads || 0)
    return Number(b.quality_score || 0) - Number(a.quality_score || 0)
  })

  return records.slice(0, limit)
}

async function getSkillsPageRecords(sort: SkillSortMode, category: string | undefined, limit: number) {
  try {
    return {
      records: await withTimeout(
        getCachedSkillCandidates(sort, category, limit),
        SKILLS_PAGE_QUERY_TIMEOUT_MS,
        'skills candidate query'
      ),
      degraded: false,
    }
  } catch (error) {
    console.warn('Skills page database fallback:', error)
    return {
      records: getFallbackSkills(sort, category, limit),
      degraded: true,
    }
  }
}

function clampPage(value: string | undefined) {
  const parsed = Number(value || 1)
  if (!Number.isFinite(parsed)) return 1
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_SKILLS_PAGE)
}

function clampText(value: string | null | undefined, maxLength: number) {
  const text = (value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function toSkillsPageSkill({
  record,
  agentStats,
  qualityProfile,
  platformHints,
  trustProfile,
  safetyProfile,
  supplyProfile,
}: {
  record: SkillRecord
  agentStats: SkillAgentStats | null
  qualityProfile: ReturnType<typeof getSkillQualityProfile>
  platformHints: string[]
  trustProfile: ReturnType<typeof getSkillTrustProfile>
  safetyProfile: ReturnType<typeof getAgentSafetyProfile>
  supplyProfile: ReturnType<typeof getSkillSupplyProfile>
}) {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    tagline: clampText(record.tagline || record.description, 170),
    category: record.category,
    stats: {
      downloads: Number(record.downloads || 0),
      stars: Number(record.github_stars || 0),
      rating: Number(record.rating || 0),
      qualityScore: Number(record.quality_score || 0),
    },
    technical: {
      installCommand: record.install_command || `npx skills add ${record.github_repo}`,
    },
    compatibility: (record.frameworks || []).slice(0, 5).map((platform) => ({
      platform: platform.toLowerCase().replace(/\s+/g, '-'),
    })),
    author: {
      name: record.author_name,
    },
    verified: Boolean(record.verified),
    createdAt: record.created_at,
    agentStats: agentStats
      ? {
          total_calls: agentStats.total_calls,
          success_calls: agentStats.success_calls,
          success_rate: agentStats.success_rate,
          avg_latency_ms: agentStats.avg_latency_ms,
          unique_agents: agentStats.unique_agents,
        }
      : null,
    qualityProfile: {
      score: qualityProfile.score,
      tier: qualityProfile.tier,
      label: qualityProfile.label,
      summary: clampText(qualityProfile.summary, 115),
      warnings: qualityProfile.warnings.slice(0, 1).map((warning) => clampText(warning, 80)),
    },
    trustProfile: {
      score: trustProfile.score,
      tier: trustProfile.tier,
      label: trustProfile.label,
      summary: clampText(trustProfile.summary, 115),
      warnings: trustProfile.warnings.slice(0, 1).map((warning) => clampText(warning, 80)),
    },
    safetyProfile: {
      blocked: safetyProfile.blocked,
      safety_tier: {
        tier: safetyProfile.safety_tier.tier,
        badge: safetyProfile.safety_tier.badge,
        label: safetyProfile.safety_tier.label,
        summary: clampText(safetyProfile.safety_tier.summary, 115),
      },
    },
    platformHints: platformHints.slice(0, 2),
    supplyProfile: {
      track: {
        slug: supplyProfile.track.slug,
        shortLabel: supplyProfile.track.shortLabel,
      },
      scenario: {
        label: clampText(supplyProfile.scenario.label, 58),
        description: clampText(supplyProfile.scenario.description, 115),
      },
      applicableAgents: supplyProfile.applicableAgents.slice(0, 3),
      install: {
        targetCount: supplyProfile.install.targetCount,
      },
      maintenance: {
        label: clampText(supplyProfile.maintenance.label, 58),
      },
      risk: {
        label: clampText(supplyProfile.risk.label, 48),
      },
    },
  }
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    sort?: string
    category?: string
    useCase?: string
    platform?: string
    quality?: string
    trust?: string
    safety?: string
    track?: string
    minStars?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const sort = (params.sort as SkillSortMode) || 'quality'
  const category = params.category || 'all'
  const useCase = params.useCase || 'all'
  const platform = params.platform || 'all'
  const quality = params.quality || 'all'
  const trust = params.trust || 'all'
  const safety = params.safety || 'all'
  const supplyTrack = params.track || 'all'
  const minStars = Number(params.minStars || 0)
  const page = clampPage(params.page)
  const requestedPageOffset = (page - 1) * VISIBLE_SKILL_LIMIT
  const candidateLimit = Math.min(BASE_SKILL_CANDIDATE_LIMIT + requestedPageOffset, MAX_SKILL_CANDIDATE_LIMIT)
  const queryCategory = category !== 'all' ? category : undefined

  const [recordsResult, categories, statsMap] = await Promise.all([
    getSkillsPageRecords(sort, queryCategory, candidateLimit),
    withTimeout(getCachedCategories(), SKILLS_PAGE_QUERY_TIMEOUT_MS, 'skills categories query')
      .catch(() => [...new Set(FALLBACK_SKILLS.map((skill) => skill.category))].sort()),
    withTimeout(getCachedSkillStats(), SKILLS_PAGE_QUERY_TIMEOUT_MS, 'skills stats query')
      .catch((): Record<string, SkillAgentStats> => ({})),
  ])
  const records = recordsResult.records
  const degraded = recordsResult.degraded
  const effectivePage = degraded && records.length <= requestedPageOffset ? 1 : page
  const pageOffset = (effectivePage - 1) * VISIBLE_SKILL_LIMIT
  const categoryOptions = categories.length > 0
    ? categories
    : [...new Set(records.map((record) => record.category).filter(Boolean))].sort()

  const platformOptions = [...new Set(records.flatMap((record) => [
    ...(record.frameworks || []),
    ...getPlatformHints(record),
  ]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 80)

  const selectedUseCase = useCase !== 'all' ? getUseCaseBySlug(useCase) : undefined

  const enrichedRecords = records.map((record) => {
    const agentStats = statsMap[record.slug] || null
    return {
      record,
      agentStats,
      qualityProfile: getSkillQualityProfile(record, agentStats),
      trustProfile: getSkillTrustProfile(record),
      safetyProfile: getAgentSafetyProfile(record, buildSkillAudit(record), {
        max_risk: 'medium',
        needs_install_command: true,
      }),
      platformHints: getPlatformHints(record),
      supplyProfile: getSkillSupplyProfile(record),
    }
  })

  const supplyTracks = getSupplyTrackSummaries(enrichedRecords.map((item) => item.supplyProfile))

  let filteredRecords = enrichedRecords.filter((item) => {
    const { record } = item
    if (category !== 'all' && record.category !== category) return false
    if (supplyTrack !== 'all' && item.supplyProfile.track.slug !== supplyTrack) return false
    if (selectedUseCase && scoreSkillForUseCase(record, selectedUseCase) < 6) return false
    if (platform !== 'all') {
      const platforms = [
        ...(record.frameworks || []),
        ...item.platformHints,
      ].map((item) => item.toLowerCase())
      if (!platforms.includes(platform.toLowerCase())) return false
    }
    if (minStars > 0 && Number(record.github_stars || 0) < minStars) return false
    if (quality !== 'all' && item.qualityProfile.tier !== quality) return false
    if (trust !== 'all' && item.trustProfile.tier !== trust) return false
    if (safety !== 'all' && item.safetyProfile.safety_tier.tier !== safety) return false
    return true
  })

  if (params.q) {
    const query = params.q.toLowerCase()
    filteredRecords = filteredRecords.filter((item) => {
      const { record } = item
      return (
        record.name.toLowerCase().includes(query) ||
        record.description.toLowerCase().includes(query) ||
        (record.long_description || '').toLowerCase().includes(query) ||
        item.supplyProfile.scenario.label.toLowerCase().includes(query) ||
        item.supplyProfile.scenario.description.toLowerCase().includes(query) ||
        item.supplyProfile.track.label.toLowerCase().includes(query) ||
        item.supplyProfile.applicableAgents.some((agent) => agent.toLowerCase().includes(query)) ||
        item.supplyProfile.risk.notes.some((note) => note.toLowerCase().includes(query)) ||
        item.safetyProfile.safety_tier.label.toLowerCase().includes(query) ||
        item.safetyProfile.safety_tier.summary.toLowerCase().includes(query) ||
        (record.tags || []).some((tag) => tag.toLowerCase().includes(query)) ||
        (record.frameworks || []).some((framework) => framework.toLowerCase().includes(query)) ||
        record.github_repo?.toLowerCase().includes(query)
      )
    })
  }

  const resultCount = filteredRecords.length
  const visibleRecords = filteredRecords.slice(pageOffset, pageOffset + VISIBLE_SKILL_LIMIT)
  const hasPreviousResults = effectivePage > 1
  const hasMoreResults = resultCount > pageOffset + visibleRecords.length

  const skills = visibleRecords.map(toSkillsPageSkill)

  return (
    <SkillsPageClient
      skills={skills}
      query={params.q}
      sort={sort}
      category={category}
      categories={categoryOptions}
      useCase={useCase}
      useCases={USE_CASES.map((item) => ({
        slug: item.slug,
        shortTitle: item.shortTitle,
      }))}
      platform={platform}
      platformOptions={platformOptions}
      quality={quality}
      trust={trust}
      safety={safety}
      supplyTrack={supplyTrack}
      supplyTracks={supplyTracks}
      minStars={Number.isFinite(minStars) ? minStars : 0}
      resultCount={resultCount}
      page={effectivePage}
      rankOffset={pageOffset}
      hasPreviousResults={hasPreviousResults}
      hasMoreResults={hasMoreResults}
      degraded={degraded}
    />
  )
}
