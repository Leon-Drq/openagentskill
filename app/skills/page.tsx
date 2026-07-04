import { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import { getAllSkills, getCategories, type SkillAgentStats, type SkillRecord, type SkillSortMode, getSkillStats, searchSkills } from '@/lib/db/skills'
import { SkillsPageClient } from '@/components/skills-page-client'
import { getSkillQualityProfile, getPlatformHints } from '@/lib/quality'
import { getSkillSupplyProfile, getSupplyTrackSummaries } from '@/lib/supply'
import { getSkillTrustProfile } from '@/lib/trust'
import { getUseCaseBySlug, scoreSkillForUseCase, USE_CASES } from '@/lib/use-cases'
import { dedupeRankedSkills, rankSkillsForQuery } from '@/lib/registry'

export const dynamic = 'force-dynamic'

const SITE_URL = 'https://www.openagentskill.com'
const SKILLS_PAGE_TITLE = 'AI Agent Skills Directory'
const SKILLS_PAGE_DESCRIPTION =
  'Browse the OpenAgentSkill AI agent skills directory: reusable skills for Codex, Claude Code, Cursor, finance, research, web scraping, PPT, football analytics, data, marketing, design, and more.'

export const metadata: Metadata = {
  title: SKILLS_PAGE_TITLE,
  description: SKILLS_PAGE_DESCRIPTION,
  keywords: [
    'AI agent skills directory',
    'AI agent skill repository',
    'agent skills',
    'Codex skills',
    'Claude Code skills',
    'Cursor skills',
    'AI agent tools',
    'agent marketplace',
    'reusable AI skills',
  ],
  openGraph: {
    title: 'AI Agent Skills Directory — OpenAgentSkill',
    description: SKILLS_PAGE_DESCRIPTION,
    type: 'website',
    url: `${SITE_URL}/skills`,
  },
  alternates: {
    canonical: `${SITE_URL}/skills`,
  },
  robots: {
    index: true,
    follow: true,
  },
}

const BASE_SKILL_CANDIDATE_LIMIT = 160
const SEARCH_SKILL_CANDIDATE_LIMIT = 720
const MAX_SKILL_CANDIDATE_LIMIT = 720
const VISIBLE_SKILL_LIMIT = 16
const SKILLS_PAGE_REVALIDATE = 300
const MAX_SKILLS_PAGE = Math.ceil(MAX_SKILL_CANDIDATE_LIMIT / VISIBLE_SKILL_LIMIT)
const SKILLS_PAGE_QUERY_TIMEOUT_MS = 1800
const SKILLS_PAGE_EXACT_SEARCH_LIMIT = 200
const FALLBACK_DATE = '2026-06-01T00:00:00.000Z'

const DIRECTORY_SCENARIOS = [
  {
    title: 'Coding agent skills',
    eyebrow: 'Codex, Claude Code, Cursor',
    href: '/skills?category=Coding+Agents',
    description: 'Code review, repo inspection, testing, planning, shipping, and engineering workflows for coding agents.',
    terms: ['agent-skills', 'coding agent', 'coding agents', 'code review', 'codex', 'claude code', 'cursor', 'gemini cli', 'repo automation', 'engineering skill'],
  },
  {
    title: 'Research and RAG skills',
    eyebrow: 'Documents and knowledge',
    href: '/skills?category=Research',
    description: 'Research, recent-events briefings, PDF parsing, markdown conversion, RAG ingestion, and knowledge workflows.',
    terms: ['research', 'rag', 'pdf', 'document', 'markdown', 'knowledge', 'retrieval', 'briefing', 'recent', 'news'],
  },
  {
    title: 'Finance and trading skills',
    eyebrow: 'Markets and quant',
    href: '/skills?category=Finance',
    description: 'Stock analysis, market research, quant backtesting, financial data, and investment research skills.',
    terms: ['finance', 'financial', 'stock', 'stocks', 'trading', 'trade skill', 'market research', 'quant', 'backtesting', 'investment'],
  },
  {
    title: 'Web scraping skills',
    eyebrow: 'Crawlers and extraction',
    href: '/skills?category=Web+Scraping',
    description: 'Crawling, scraping, extraction, browser automation, structured data capture, and website-to-markdown workflows.',
    terms: ['web scraping', 'scraping', 'crawler', 'crawl', 'extract', 'extraction', 'browser', 'html', 'markdown', 'website'],
  },
  {
    title: 'PPT and presentation skills',
    eyebrow: 'Slides and decks',
    href: '/skills?q=ppt',
    description: 'Presentation generation, editable PPTX, slide decks, speaker notes, and visual storytelling workflows.',
    terms: ['ppt', 'pptx', 'presentation', 'slide', 'slides', 'deck', 'powerpoint', 'speaker note'],
  },
  {
    title: 'Design and creative skills',
    eyebrow: 'Images, video, UI',
    href: '/skills?category=Design',
    description: 'Image, video, creative production, UI design, multimodal generation, and visual workflow skills.',
    terms: ['design', 'image', 'video', 'creative', 'ui', 'ux', 'seedance', 'visual', 'multimodal', 'filmmaking'],
  },
  {
    title: 'Data and analytics skills',
    eyebrow: 'Analysis and pipelines',
    href: '/skills?q=data',
    description: 'Data analysis, analytics, ETL, notebooks, databases, tables, charts, and reporting workflows.',
    terms: ['data', 'analytics', 'analysis', 'etl', 'database', 'table', 'chart', 'notebook', 'pipeline', 'reporting'],
  },
  {
    title: 'Marketing and growth skills',
    eyebrow: 'SEO and content',
    href: '/skills?q=marketing',
    description: 'SEO, content research, growth workflows, social listening, campaign analysis, and publishing helpers.',
    terms: ['marketing', 'seo', 'content', 'growth', 'social', 'campaign', 'copywriting', 'newsletter', 'traffic'],
  },
  {
    title: 'Legal and compliance skills',
    eyebrow: 'Contracts and policy',
    href: '/skills?q=legal',
    description: 'Contract review, policy analysis, compliance research, audit support, and legal document workflows.',
    terms: ['legal', 'contract', 'law', 'policy', 'compliance', 'audit', 'risk'],
  },
  {
    title: 'Education and teaching skills',
    eyebrow: 'Learning workflows',
    href: '/skills?q=teach',
    description: 'Teaching, tutoring, course creation, lesson planning, learning support, and explanation skills.',
    terms: ['education', 'teach', 'teaching', 'tutor', 'learning', 'course', 'lesson', 'student'],
  },
  {
    title: 'Football and World Cup skills',
    eyebrow: 'Sports analytics',
    href: '/skills?q=football',
    description: 'Football analytics, match data, World Cup dashboards, scouting analysis, and sports research workflows.',
    terms: ['football', 'soccer', 'world cup', 'sports', 'match', 'statsbomb', 'mplsoccer', 'scouting'],
  },
] as const

const POPULAR_DIRECTORY_LINKS = [
  {
    label: 'AI agent skills library',
    href: '/best/ai-agent-skills-library',
    description: 'A real library of reusable skills with trust, audit, install, and agent metadata.',
  },
  {
    label: 'Open source AI agent skills',
    href: '/best/open-source-ai-agent-skills',
    description: 'Open-source skill candidates filtered by task fit, GitHub quality, and install safety.',
  },
  {
    label: 'Best Codex skills',
    href: '/best/codex-skills',
    description: 'Repo inspection, code review, testing, web data, and safe install workflows for Codex.',
  },
  {
    label: 'Best AI agent skills for stock analysis',
    href: '/best/stock-analysis',
    description: 'Finance and market research skills with trust, install, and maintenance signals.',
  },
  {
    label: 'Best Codex skills for web scraping',
    href: '/best/codex-web-scraping',
    description: 'Crawler and extraction skills that agents can shortlist before installing.',
  },
  {
    label: 'Best Claude Code skills for PDF parsing',
    href: '/best/claude-code-pdf-parsing',
    description: 'Document conversion, table extraction, OCR, and markdown workflows.',
  },
  {
    label: 'Best AI agent skills for football analytics',
    href: '/best/football-analytics',
    description: 'Match data, scouting, dashboards, and World Cup analytics workflows.',
  },
  {
    label: 'OpenAgentSkill vs skills.sh',
    href: '/compare/openagentskill-vs-skills-sh',
    description: 'Compare task resolution, trust signals, install handoffs, and registry APIs.',
  },
  {
    label: 'OpenAgentSkill vs agentskills.io',
    href: '/compare/openagentskill-vs-agentskills-io',
    description: 'Compare directories, agent-readable metadata, audits, and discovery workflows.',
  },
] as const

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

function getCachedSearchSkillCandidates(query: string, limit: number) {
  return unstable_cache(
    async () => searchSkills(query, limit),
    ['skills-page-search-candidates-v1', query.trim().toLowerCase(), String(limit)],
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

async function getSearchAugmentRecords(query: string | undefined) {
  const normalizedQuery = query?.trim()
  if (!normalizedQuery) return []

  return withTimeout(
    getCachedSearchSkillCandidates(normalizedQuery, SKILLS_PAGE_EXACT_SEARCH_LIMIT),
    SKILLS_PAGE_QUERY_TIMEOUT_MS,
    'skills exact search query'
  ).catch((error) => {
    console.warn('Skills page exact search fallback:', error)
    return []
  })
}

function mergeSkillRecords(primary: SkillRecord[], secondary: SkillRecord[]) {
  const seen = new Set<string>()
  const merged: SkillRecord[] = []

  for (const record of [...secondary, ...primary]) {
    const key = record.slug || record.github_repo || record.id
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(record)
  }

  return merged
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

type SkillsPageSkill = ReturnType<typeof toSkillsPageSkill>

interface DirectorySkill {
  slug: string
  name: string
  tagline: string
  category: string
  stars: number
  trustScore: number | null
  qualityScore: number
  installCommand?: string
}

interface DirectorySection {
  title: string
  eyebrow: string
  href: string
  description: string
  skills: DirectorySkill[]
}

interface DirectoryLink {
  label: string
  href: string
  description: string
}

function directoryMatchScore(
  scenario: (typeof DIRECTORY_SCENARIOS)[number],
  record: SkillRecord,
  item: { platformHints: string[]; supplyProfile: ReturnType<typeof getSkillSupplyProfile> }
) {
  const primaryText = [
    record.name,
    record.slug,
    record.github_repo,
    record.category,
    ...(record.tags || []),
    ...(record.frameworks || []),
    ...item.platformHints,
    item.supplyProfile.track.label,
    item.supplyProfile.track.shortLabel,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const secondaryText = [
    record.description,
    record.long_description,
    record.tagline,
    item.supplyProfile.scenario.label,
    item.supplyProfile.scenario.description,
    ...item.supplyProfile.applicableAgents,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  let score = 0
  for (const term of scenario.terms) {
    if (primaryText.includes(term)) score += 4
    else if (secondaryText.includes(term)) score += 1
  }

  if (primaryText.includes('skill')) score += 2
  if (primaryText.includes('agent')) score += 1

  return score
}

function toDirectorySkill(item: {
  record: SkillRecord
  trustProfile: ReturnType<typeof getSkillTrustProfile>
  qualityProfile: ReturnType<typeof getSkillQualityProfile>
}): DirectorySkill {
  const { record, trustProfile, qualityProfile } = item
  return {
    slug: record.slug,
    name: record.name,
    tagline: clampText(record.tagline || record.description, 110),
    category: record.category,
    stars: Number(record.github_stars || 0),
    trustScore: trustProfile.score,
    qualityScore: qualityProfile.score,
    installCommand: record.install_command || (record.github_repo ? `npx skills add ${record.github_repo}` : undefined),
  }
}

function buildDirectorySections(
  enrichedRecords: Array<{
    record: SkillRecord
    qualityProfile: ReturnType<typeof getSkillQualityProfile>
    trustProfile: ReturnType<typeof getSkillTrustProfile>
    platformHints: string[]
    supplyProfile: ReturnType<typeof getSkillSupplyProfile>
  }>
): DirectorySection[] {
  const usedSlugs = new Set<string>()

  return DIRECTORY_SCENARIOS.map((scenario) => {
    const candidates = enrichedRecords
      .map((item) => ({
        item,
        score: directoryMatchScore(scenario, item.record, item),
      }))
      .filter(({ score }) => score >= 4)
      .sort((a, b) => {
        const scoreDelta = b.score - a.score
        if (scoreDelta !== 0) return scoreDelta
        const trustDelta = b.item.trustProfile.score - a.item.trustProfile.score
        if (trustDelta !== 0) return trustDelta
        const qualityDelta = b.item.qualityProfile.score - a.item.qualityProfile.score
        if (qualityDelta !== 0) return qualityDelta
        return Number(b.item.record.github_stars || 0) - Number(a.item.record.github_stars || 0)
      })

    const matches: DirectorySkill[] = []
    for (const { item } of candidates) {
      if (usedSlugs.has(item.record.slug)) continue
      usedSlugs.add(item.record.slug)
      matches.push(toDirectorySkill(item))
      if (matches.length >= 3) break
    }

    return {
      title: scenario.title,
      eyebrow: scenario.eyebrow,
      href: scenario.href,
      description: scenario.description,
      skills: matches,
    }
  }).filter((section) => section.skills.length > 0).slice(0, 8)
}

function buildSkillsPageJsonLd(skills: SkillsPageSkill[], directorySections: DirectorySection[]) {
  const deduped = new Map<string, DirectorySkill>()
  for (const section of directorySections) {
    for (const skill of section.skills) deduped.set(skill.slug, skill)
  }
  for (const skill of skills) {
    if (!deduped.has(skill.slug)) {
      deduped.set(skill.slug, {
        slug: skill.slug,
        name: skill.name,
        tagline: skill.tagline,
        category: skill.category,
        stars: skill.stats.stars,
        trustScore: skill.trustProfile?.score ?? null,
        qualityScore: skill.stats.qualityScore || 0,
        installCommand: skill.technical.installCommand,
      })
    }
  }

  const itemListElement = Array.from(deduped.values()).slice(0, 24).map((skill, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `${SITE_URL}/skills/${skill.slug}`,
    name: skill.name,
    description: skill.tagline,
  }))

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: SKILLS_PAGE_TITLE,
      url: `${SITE_URL}/skills`,
      description: SKILLS_PAGE_DESCRIPTION,
      about: [
        'AI agent skills',
        'AI agent skill repository',
        'Codex skills',
        'Claude Code skills',
        'Cursor skills',
        'reusable AI agent tools',
      ],
      hasPart: {
        '@type': 'ItemList',
        name: 'OpenAgentSkill directory shortlist',
        numberOfItems: itemListElement.length,
        itemListElement,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'OpenAgentSkill',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'AI Agent Skills Directory',
          item: `${SITE_URL}/skills`,
        },
      ],
    },
  ]
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
  const hasHighIntentFilter = Boolean(params.q || useCase !== 'all' || platform !== 'all' || supplyTrack !== 'all' || minStars > 0)
  const baseLimit = hasHighIntentFilter ? SEARCH_SKILL_CANDIDATE_LIMIT : BASE_SKILL_CANDIDATE_LIMIT
  const candidateLimit = Math.min(baseLimit + requestedPageOffset, MAX_SKILL_CANDIDATE_LIMIT)
  const queryCategory = category !== 'all' ? category : undefined

  const [recordsResult, searchAugmentRecords, categories, statsMap] = await Promise.all([
    getSkillsPageRecords(sort, queryCategory, candidateLimit),
    getSearchAugmentRecords(params.q),
    withTimeout(getCachedCategories(), SKILLS_PAGE_QUERY_TIMEOUT_MS, 'skills categories query')
      .catch(() => [...new Set(FALLBACK_SKILLS.map((skill) => skill.category))].sort()),
    withTimeout(getCachedSkillStats(), SKILLS_PAGE_QUERY_TIMEOUT_MS, 'skills stats query')
      .catch((): Record<string, SkillAgentStats> => ({})),
  ])
  const records = mergeSkillRecords(recordsResult.records, searchAugmentRecords)
  const degraded = recordsResult.degraded && searchAugmentRecords.length === 0
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

  if (params.q?.trim()) {
    const enrichedBySlug = new Map(filteredRecords.map((item) => [item.record.slug, item]))
    const ranked = dedupeRankedSkills(
      rankSkillsForQuery(
        filteredRecords.map((item) => item.record),
        params.q,
        statsMap
      )
    )

    filteredRecords = ranked
      .map((item) => enrichedBySlug.get(item.skill.slug))
      .filter((item): item is (typeof enrichedRecords)[number] => Boolean(item))
  }

  const resultCount = filteredRecords.length
  const visibleRecords = filteredRecords.slice(pageOffset, pageOffset + VISIBLE_SKILL_LIMIT)
  const hasPreviousResults = effectivePage > 1
  const hasMoreResults = resultCount > pageOffset + visibleRecords.length

  const skills = visibleRecords.map(toSkillsPageSkill)
  const directorySections = buildDirectorySections(enrichedRecords)
  const directoryLinks: DirectoryLink[] = POPULAR_DIRECTORY_LINKS.map((link) => ({ ...link }))
  const jsonLd = buildSkillsPageJsonLd(skills, directorySections)

  return (
    <>
      <script
        id="skills-directory-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
        directorySections={directorySections}
        directoryLinks={directoryLinks}
      />
    </>
  )
}
