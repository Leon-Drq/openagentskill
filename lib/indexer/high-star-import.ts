import { createPublicClient } from '@/lib/supabase/public'
import { evaluateSkillCandidate, type SkillCandidateEvaluation } from './skill-filter'

type SearchSort = 'stars' | 'updated'

interface HighStarQuery {
  q: string
  category: string
  tags: string[]
  frameworks: string[]
  sort?: SearchSort
  domain?: string
}

interface GitHubSearchRepo {
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  forks_count: number
  language: string | null
  pushed_at: string | null
  updated_at: string | null
  archived: boolean
  fork: boolean
  topics?: string[]
  license: { spdx_id: string | null } | null
  owner: {
    login: string
    html_url: string
  }
}

interface GitHubSearchResponse {
  items?: GitHubSearchRepo[]
}

interface IndexedSkillRpcResult {
  created?: boolean
  skill?: {
    slug?: string
  }
}

export interface BulkImportOptions {
  targetNew?: number
  minStars?: number
  maxSearchRequests?: number
  perPage?: number
  pageSeed?: number
  domains?: string[]
}

export interface BulkImportSummary {
  filterMode: 'skills-only'
  targetNew: number
  minStars: number
  requestedDomains: string[]
  queryPoolSize: number
  domainsCovered: string[]
  searchRequests: number
  candidatesFound: number
  skippedExisting: number
  skippedMcp: number
  skippedLowRelevance: number
  imported: number
  updated: number
  errors: number
}

const GITHUB_API_BASE = 'https://api.github.com'
const DEFAULT_TARGET_NEW_PER_RUN = 25
const DEFAULT_TOKEN_SEARCH_REQUESTS = 30
const DEFAULT_DOMAIN_SEARCH_REQUESTS = 80
const MAX_TOKEN_SEARCH_REQUESTS = 100

const CORE_HIGH_STAR_QUERIES: HighStarQuery[] = [
  {
    q: 'topic:ai-agents',
    category: 'agent-frameworks',
    tags: ['agents', 'ai-agents'],
    frameworks: ['AI Agents'],
  },
  {
    q: 'topic:ai-agent',
    category: 'agent-frameworks',
    tags: ['agents', 'ai-agent'],
    frameworks: ['AI Agents'],
  },
  {
    q: 'topic:llm-agent',
    category: 'agent-frameworks',
    tags: ['llm-agent', 'agents'],
    frameworks: ['LLM'],
  },
  {
    q: '"agent framework"',
    category: 'agent-frameworks',
    tags: ['agent-framework', 'orchestration'],
    frameworks: ['LLM'],
  },
  {
    q: 'topic:browser-automation',
    category: 'web-automation',
    tags: ['browser', 'automation'],
    frameworks: ['Browser Automation'],
  },
  {
    q: 'topic:playwright',
    category: 'browser-automation',
    tags: ['browser', 'testing', 'automation'],
    frameworks: ['Playwright'],
  },
  {
    q: 'topic:puppeteer',
    category: 'browser-automation',
    tags: ['browser', 'automation'],
    frameworks: ['Puppeteer'],
  },
  {
    q: 'topic:web-scraping',
    category: 'web-automation',
    tags: ['scraping', 'crawler'],
    frameworks: ['Web Automation'],
  },
  {
    q: 'topic:crawler',
    category: 'web-automation',
    tags: ['crawler', 'data-extraction'],
    frameworks: ['Crawler'],
  },
  {
    q: 'topic:rag',
    category: 'data',
    tags: ['rag', 'retrieval'],
    frameworks: ['RAG'],
  },
  {
    q: 'topic:semantic-search',
    category: 'rag-knowledge',
    tags: ['semantic-search', 'retrieval', 'knowledge'],
    frameworks: ['Semantic Search'],
  },
  {
    q: 'topic:vector-database',
    category: 'rag-knowledge',
    tags: ['vector-database', 'retrieval', 'knowledge'],
    frameworks: ['Vector Search'],
  },
  {
    q: 'topic:document-ai',
    category: 'document-processing',
    tags: ['document-ai', 'documents', 'extraction'],
    frameworks: ['Document AI'],
  },
  {
    q: 'topic:pdf',
    category: 'document-processing',
    tags: ['pdf', 'documents', 'extraction'],
    frameworks: ['PDF'],
  },
  {
    q: 'topic:ocr',
    category: 'document-processing',
    tags: ['ocr', 'documents', 'extraction'],
    frameworks: ['OCR'],
  },
  {
    q: 'topic:llmops',
    category: 'development',
    tags: ['llmops', 'developer-tools'],
    frameworks: ['LLMOps'],
  },
  {
    q: 'topic:code-agent',
    category: 'development',
    tags: ['coding-agent', 'developer-tools'],
    frameworks: ['Coding Agent'],
  },
  {
    q: 'topic:code-review',
    category: 'development',
    tags: ['code-review', 'developer-tools'],
    frameworks: ['Code Review'],
  },
  {
    q: 'topic:static-analysis',
    category: 'development',
    tags: ['static-analysis', 'code-quality'],
    frameworks: ['Static Analysis'],
  },
  {
    q: 'topic:test-automation',
    category: 'testing-qa',
    tags: ['testing', 'automation'],
    frameworks: ['Testing'],
  },
  {
    q: 'topic:workflow-automation',
    category: 'automation',
    tags: ['workflow', 'automation'],
    frameworks: ['Workflow'],
  },
  {
    q: 'topic:ai-automation',
    category: 'automation',
    tags: ['ai-automation', 'workflow'],
    frameworks: ['Automation'],
  },
  {
    q: 'topic:research-agent',
    category: 'research',
    tags: ['research', 'agent'],
    frameworks: ['Research Agent'],
  },
  {
    q: 'topic:market-research',
    category: 'research',
    tags: ['market-research', 'analysis'],
    frameworks: ['Research Agent'],
  },
  {
    q: 'topic:data-analysis',
    category: 'data-analysis',
    tags: ['data-analysis', 'analytics'],
    frameworks: ['Data Analysis'],
  },
  {
    q: 'topic:data-pipeline',
    category: 'data-analysis',
    tags: ['data-pipeline', 'automation'],
    frameworks: ['Data Pipeline'],
  },
  {
    q: 'topic:content-generation',
    category: 'content-automation',
    tags: ['content-generation', 'workflow'],
    frameworks: ['Content Automation'],
  },
  {
    q: 'topic:security-scanner',
    category: 'security',
    tags: ['security', 'scanner'],
    frameworks: ['Security'],
  },
  {
    q: 'topic:multi-agent',
    category: 'agent-frameworks',
    tags: ['multi-agent', 'orchestration'],
    frameworks: ['Multi-Agent'],
  },
  {
    q: 'topic:computer-use',
    category: 'automation',
    tags: ['computer-use', 'desktop-agent'],
    frameworks: ['Computer Use'],
  },
  {
    q: 'topic:agent-skills',
    category: 'agent-skills',
    tags: ['agent-skills', 'skills'],
    frameworks: ['AI Agents'],
  },
  {
    q: '"agent skill"',
    category: 'agent-skills',
    tags: ['agent-skill', 'skills'],
    frameworks: ['AI Agents'],
    sort: 'updated',
  },
  {
    q: '"Codex skill"',
    category: 'development',
    tags: ['codex', 'agent-skills', 'developer-tools'],
    frameworks: ['Codex'],
    sort: 'updated',
  },
  {
    q: '"Claude Code" "skill"',
    category: 'development',
    tags: ['claude-code', 'agent-skills', 'developer-tools'],
    frameworks: ['Claude Code'],
    sort: 'updated',
  },
  {
    q: '"Cursor rules" "agent"',
    category: 'development',
    tags: ['cursor', 'agent-rules', 'developer-tools'],
    frameworks: ['Cursor'],
    sort: 'updated',
  },
  {
    q: '"agent skills" "registry"',
    category: 'agent-skills',
    tags: ['agent-skills', 'registry'],
    frameworks: ['AI Agents'],
    sort: 'updated',
  },
  {
    q: 'topic:claude-tool',
    category: 'development',
    tags: ['claude-tool', 'developer-tools'],
    frameworks: ['Claude'],
  },
  {
    q: 'topic:langchain-tool',
    category: 'development',
    tags: ['langchain-tool', 'developer-tools'],
    frameworks: ['LangChain'],
  },
  {
    q: '"Claude Code" tool',
    category: 'development',
    tags: ['claude-code', 'developer-tools'],
    frameworks: ['Claude Code'],
    sort: 'updated',
  },
  {
    q: '"AI agent" "GitHub"',
    category: 'github-automation',
    tags: ['github', 'automation', 'agents'],
    frameworks: ['GitHub'],
    sort: 'updated',
  },
]

const DOMAIN_QUERY_GROUPS: Array<{
  key: string
  label: string
  description: string
  queries: HighStarQuery[]
}> = [
  {
    key: 'finance',
    label: 'Finance, quant, trading, and filings',
    description: 'Financial data, quant research, backtesting, portfolio analysis, SEC filings, and risk workflows.',
    queries: [
      {
        q: 'topic:quantitative-finance',
        category: 'finance',
        tags: ['finance', 'quant', 'research'],
        frameworks: ['Finance'],
      },
      {
        q: 'topic:algorithmic-trading',
        category: 'finance',
        tags: ['finance', 'trading', 'automation'],
        frameworks: ['Trading'],
      },
      {
        q: 'topic:backtesting',
        category: 'finance',
        tags: ['finance', 'backtesting', 'analysis'],
        frameworks: ['Backtesting'],
      },
      {
        q: 'topic:stock-market',
        category: 'finance',
        tags: ['finance', 'stocks', 'market-data'],
        frameworks: ['Market Data'],
      },
      {
        q: 'topic:portfolio-optimization',
        category: 'finance',
        tags: ['finance', 'portfolio', 'optimization'],
        frameworks: ['Portfolio Analysis'],
      },
      {
        q: 'topic:trading-bot',
        category: 'finance',
        tags: ['finance', 'trading-bot', 'automation'],
        frameworks: ['Trading Bot'],
      },
      {
        q: '"financial data"',
        category: 'finance',
        tags: ['finance', 'financial-data', 'analysis'],
        frameworks: ['Financial Data'],
      },
      {
        q: '"SEC filings"',
        category: 'finance',
        tags: ['finance', 'sec-filings', 'document-analysis'],
        frameworks: ['SEC Filings'],
      },
      {
        q: '"risk model" finance',
        category: 'finance',
        tags: ['finance', 'risk', 'analysis'],
        frameworks: ['Risk Analysis'],
        sort: 'updated',
      },
      {
        q: 'topic:openbb',
        category: 'finance',
        tags: ['finance', 'market-data', 'research'],
        frameworks: ['OpenBB'],
      },
      {
        q: 'topic:quant',
        category: 'finance',
        tags: ['finance', 'quant', 'analysis'],
        frameworks: ['Quant'],
      },
      {
        q: 'topic:finance',
        category: 'finance',
        tags: ['finance', 'analysis'],
        frameworks: ['Finance'],
      },
      {
        q: 'topic:fintech',
        category: 'finance',
        tags: ['finance', 'fintech'],
        frameworks: ['Fintech'],
      },
      {
        q: 'topic:trading',
        category: 'finance',
        tags: ['finance', 'trading'],
        frameworks: ['Trading'],
      },
      {
        q: 'topic:technical-analysis',
        category: 'finance',
        tags: ['finance', 'technical-analysis', 'trading'],
        frameworks: ['Technical Analysis'],
      },
      {
        q: 'topic:market-data',
        category: 'finance',
        tags: ['finance', 'market-data'],
        frameworks: ['Market Data'],
      },
      {
        q: 'topic:risk-management',
        category: 'finance',
        tags: ['finance', 'risk-management'],
        frameworks: ['Risk Management'],
      },
      {
        q: 'topic:portfolio-management',
        category: 'finance',
        tags: ['finance', 'portfolio-management'],
        frameworks: ['Portfolio Management'],
      },
      {
        q: 'topic:options-pricing',
        category: 'finance',
        tags: ['finance', 'options-pricing', 'quant'],
        frameworks: ['Options Pricing'],
      },
      {
        q: 'topic:financial-machine-learning',
        category: 'finance',
        tags: ['finance', 'machine-learning', 'quant'],
        frameworks: ['Financial ML'],
      },
      {
        q: '"portfolio management"',
        category: 'finance',
        tags: ['finance', 'portfolio-management'],
        frameworks: ['Portfolio Management'],
      },
      {
        q: '"technical analysis" trading',
        category: 'finance',
        tags: ['finance', 'technical-analysis', 'trading'],
        frameworks: ['Technical Analysis'],
      },
      {
        q: '"options pricing"',
        category: 'finance',
        tags: ['finance', 'options-pricing', 'quant'],
        frameworks: ['Options Pricing'],
      },
      {
        q: '"financial machine learning"',
        category: 'finance',
        tags: ['finance', 'machine-learning', 'quant'],
        frameworks: ['Financial ML'],
      },
      {
        q: '"economic data"',
        category: 'finance',
        tags: ['finance', 'economic-data', 'analysis'],
        frameworks: ['Economic Data'],
      },
      {
        q: 'yfinance',
        category: 'finance',
        tags: ['finance', 'market-data', 'python'],
        frameworks: ['yfinance'],
      },
      {
        q: 'backtrader',
        category: 'finance',
        tags: ['finance', 'backtesting', 'trading'],
        frameworks: ['Backtrader'],
      },
      {
        q: 'zipline trading',
        category: 'finance',
        tags: ['finance', 'backtesting', 'trading'],
        frameworks: ['Zipline'],
      },
      {
        q: 'vectorbt',
        category: 'finance',
        tags: ['finance', 'backtesting', 'quant'],
        frameworks: ['vectorbt'],
      },
      {
        q: 'quantlib',
        category: 'finance',
        tags: ['finance', 'quant', 'risk-management'],
        frameworks: ['QuantLib'],
      },
      {
        q: 'freqtrade',
        category: 'finance',
        tags: ['finance', 'trading-bot', 'automation'],
        frameworks: ['Freqtrade'],
      },
      {
        q: 'ta-lib',
        category: 'finance',
        tags: ['finance', 'technical-analysis'],
        frameworks: ['TA-Lib'],
      },
      {
        q: 'topic:cryptocurrency topic:trading',
        category: 'finance',
        tags: ['finance', 'crypto', 'trading'],
        frameworks: ['Crypto Trading'],
      },
      {
        q: 'topic:defi topic:analytics',
        category: 'finance',
        tags: ['finance', 'defi', 'analytics'],
        frameworks: ['DeFi Analytics'],
      },
    ],
  },
  {
    key: 'research',
    label: 'Research and intelligence',
    description: 'Deep research, paper search, literature review, market research, and knowledge synthesis workflows.',
    queries: [
      {
        q: 'topic:research-agent',
        category: 'research',
        tags: ['research', 'agent'],
        frameworks: ['Research Agent'],
      },
      {
        q: 'topic:market-research',
        category: 'research',
        tags: ['market-research', 'analysis'],
        frameworks: ['Market Research'],
      },
      {
        q: 'topic:arxiv',
        category: 'research',
        tags: ['research', 'papers', 'arxiv'],
        frameworks: ['Research'],
      },
      {
        q: 'topic:literature-review',
        category: 'research',
        tags: ['research', 'literature-review'],
        frameworks: ['Research'],
      },
      {
        q: '"deep research" agent',
        category: 'research',
        tags: ['deep-research', 'agent', 'research'],
        frameworks: ['Research Agent'],
        sort: 'updated',
      },
    ],
  },
  {
    key: 'data',
    label: 'Data analysis, BI, and pipelines',
    description: 'Data analysis, notebooks, ETL, SQL, dashboards, CSV workflows, and business intelligence.',
    queries: [
      {
        q: 'topic:data-analysis',
        category: 'data-analysis',
        tags: ['data-analysis', 'analytics'],
        frameworks: ['Data Analysis'],
      },
      {
        q: 'topic:data-pipeline',
        category: 'data-analysis',
        tags: ['data-pipeline', 'automation'],
        frameworks: ['Data Pipeline'],
      },
      {
        q: 'topic:data-visualization',
        category: 'data-analysis',
        tags: ['data-visualization', 'analytics'],
        frameworks: ['Data Visualization'],
      },
      {
        q: 'topic:business-intelligence',
        category: 'data-analysis',
        tags: ['business-intelligence', 'analytics'],
        frameworks: ['BI'],
      },
      {
        q: 'topic:etl',
        category: 'data-analysis',
        tags: ['etl', 'data-pipeline'],
        frameworks: ['ETL'],
      },
      {
        q: 'topic:sql',
        category: 'data-analysis',
        tags: ['sql', 'data-analysis'],
        frameworks: ['SQL'],
      },
      {
        q: 'topic:notebook',
        category: 'data-analysis',
        tags: ['notebook', 'data-analysis'],
        frameworks: ['Notebook'],
      },
      {
        q: 'topic:csv',
        category: 'data-analysis',
        tags: ['csv', 'data-analysis'],
        frameworks: ['CSV'],
      },
    ],
  },
  {
    key: 'documents',
    label: 'Documents, PDF, OCR, and extraction',
    description: 'Document parsing, PDF extraction, OCR, invoices, forms, Markdown, and structured extraction.',
    queries: [
      {
        q: 'topic:document-ai',
        category: 'document-processing',
        tags: ['document-ai', 'documents', 'extraction'],
        frameworks: ['Document AI'],
      },
      {
        q: 'topic:pdf',
        category: 'document-processing',
        tags: ['pdf', 'documents', 'extraction'],
        frameworks: ['PDF'],
      },
      {
        q: 'topic:ocr',
        category: 'document-processing',
        tags: ['ocr', 'documents', 'extraction'],
        frameworks: ['OCR'],
      },
      {
        q: '"document extraction"',
        category: 'document-processing',
        tags: ['documents', 'extraction'],
        frameworks: ['Document Extraction'],
      },
      {
        q: 'topic:invoice',
        category: 'document-processing',
        tags: ['invoice', 'documents', 'extraction'],
        frameworks: ['Invoice'],
      },
      {
        q: 'topic:markdown',
        category: 'document-processing',
        tags: ['markdown', 'documents'],
        frameworks: ['Markdown'],
      },
    ],
  },
  {
    key: 'browser-commerce',
    label: 'Browser, commerce, and go-to-market automation',
    description: 'Browser automation, scraping, price monitoring, ecommerce, lead generation, and sales workflows.',
    queries: [
      {
        q: 'topic:browser-automation',
        category: 'web-automation',
        tags: ['browser', 'automation'],
        frameworks: ['Browser Automation'],
      },
      {
        q: 'topic:web-scraping',
        category: 'web-automation',
        tags: ['scraping', 'crawler'],
        frameworks: ['Web Automation'],
      },
      {
        q: 'topic:ecommerce',
        category: 'commerce-automation',
        tags: ['ecommerce', 'commerce', 'automation'],
        frameworks: ['Commerce'],
      },
      {
        q: '"price tracking"',
        category: 'commerce-automation',
        tags: ['price-tracking', 'monitoring', 'automation'],
        frameworks: ['Price Monitoring'],
      },
      {
        q: 'topic:lead-generation',
        category: 'growth-automation',
        tags: ['lead-generation', 'sales', 'automation'],
        frameworks: ['Sales Automation'],
      },
      {
        q: 'topic:sales-automation',
        category: 'growth-automation',
        tags: ['sales-automation', 'workflow'],
        frameworks: ['Sales Automation'],
      },
    ],
  },
  {
    key: 'security',
    label: 'Security, compliance, and OSINT',
    description: 'Security scanning, vulnerability analysis, secrets detection, OSINT, and compliance workflows.',
    queries: [
      {
        q: 'topic:security-scanner',
        category: 'security',
        tags: ['security', 'scanner'],
        frameworks: ['Security'],
      },
      {
        q: 'topic:vulnerability-scanner',
        category: 'security',
        tags: ['security', 'vulnerability-scanner'],
        frameworks: ['Security'],
      },
      {
        q: 'topic:secret-scanning',
        category: 'security',
        tags: ['security', 'secret-scanning'],
        frameworks: ['Security'],
      },
      {
        q: 'topic:sast',
        category: 'security',
        tags: ['security', 'static-analysis'],
        frameworks: ['SAST'],
      },
      {
        q: 'topic:osint',
        category: 'security',
        tags: ['osint', 'research', 'security'],
        frameworks: ['OSINT'],
      },
      {
        q: 'topic:compliance',
        category: 'security',
        tags: ['compliance', 'security'],
        frameworks: ['Compliance'],
      },
    ],
  },
  {
    key: 'devops',
    label: 'DevOps, cloud, and reliability',
    description: 'Kubernetes, Terraform, CI/CD, observability, incident response, and infrastructure automation.',
    queries: [
      {
        q: 'topic:devops',
        category: 'devops',
        tags: ['devops', 'automation'],
        frameworks: ['DevOps'],
      },
      {
        q: 'topic:kubernetes',
        category: 'devops',
        tags: ['kubernetes', 'devops'],
        frameworks: ['Kubernetes'],
      },
      {
        q: 'topic:terraform',
        category: 'devops',
        tags: ['terraform', 'infrastructure'],
        frameworks: ['Terraform'],
      },
      {
        q: 'topic:observability',
        category: 'devops',
        tags: ['observability', 'monitoring'],
        frameworks: ['Observability'],
      },
      {
        q: 'topic:incident-response',
        category: 'devops',
        tags: ['incident-response', 'reliability'],
        frameworks: ['Incident Response'],
      },
      {
        q: 'topic:ci-cd',
        category: 'devops',
        tags: ['ci-cd', 'automation'],
        frameworks: ['CI/CD'],
      },
    ],
  },
  {
    key: 'knowledge',
    label: 'RAG, search, and knowledge systems',
    description: 'RAG, semantic search, knowledge graphs, embeddings, reranking, and vector search workflows.',
    queries: [
      {
        q: 'topic:rag',
        category: 'rag-knowledge',
        tags: ['rag', 'retrieval'],
        frameworks: ['RAG'],
      },
      {
        q: 'topic:semantic-search',
        category: 'rag-knowledge',
        tags: ['semantic-search', 'retrieval', 'knowledge'],
        frameworks: ['Semantic Search'],
      },
      {
        q: 'topic:knowledge-graph',
        category: 'rag-knowledge',
        tags: ['knowledge-graph', 'retrieval'],
        frameworks: ['Knowledge Graph'],
      },
      {
        q: 'topic:embeddings',
        category: 'rag-knowledge',
        tags: ['embeddings', 'retrieval'],
        frameworks: ['Embeddings'],
      },
      {
        q: 'topic:reranking',
        category: 'rag-knowledge',
        tags: ['reranking', 'search'],
        frameworks: ['Reranking'],
      },
      {
        q: 'topic:search-engine',
        category: 'rag-knowledge',
        tags: ['search-engine', 'retrieval'],
        frameworks: ['Search'],
      },
    ],
  },
  {
    key: 'ml-media',
    label: 'ML, media, voice, and creative workflows',
    description: 'ML pipelines, image/video processing, speech recognition, text-to-speech, and creative automation.',
    queries: [
      {
        q: 'topic:mlops',
        category: 'ml-automation',
        tags: ['mlops', 'machine-learning'],
        frameworks: ['MLOps'],
      },
      {
        q: 'topic:machine-learning',
        category: 'ml-automation',
        tags: ['machine-learning', 'automation'],
        frameworks: ['Machine Learning'],
      },
      {
        q: 'topic:image-generation',
        category: 'media-automation',
        tags: ['image-generation', 'media'],
        frameworks: ['Image Generation'],
      },
      {
        q: 'topic:video-processing',
        category: 'media-automation',
        tags: ['video-processing', 'media'],
        frameworks: ['Video'],
      },
      {
        q: 'topic:speech-recognition',
        category: 'media-automation',
        tags: ['speech-recognition', 'voice'],
        frameworks: ['Speech'],
      },
      {
        q: 'topic:text-to-speech',
        category: 'media-automation',
        tags: ['text-to-speech', 'voice'],
        frameworks: ['Voice'],
      },
    ],
  },
  {
    key: 'geo-science',
    label: 'Geospatial, science, and health data',
    description: 'Geospatial analysis, GIS, scientific computing, bioinformatics, and health-data tooling.',
    queries: [
      {
        q: 'topic:geospatial',
        category: 'geo-science',
        tags: ['geospatial', 'analysis'],
        frameworks: ['Geospatial'],
      },
      {
        q: 'topic:gis',
        category: 'geo-science',
        tags: ['gis', 'geospatial'],
        frameworks: ['GIS'],
      },
      {
        q: 'topic:scientific-computing',
        category: 'geo-science',
        tags: ['scientific-computing', 'analysis'],
        frameworks: ['Scientific Computing'],
      },
      {
        q: 'topic:bioinformatics',
        category: 'geo-science',
        tags: ['bioinformatics', 'analysis'],
        frameworks: ['Bioinformatics'],
      },
      {
        q: 'topic:healthcare',
        category: 'geo-science',
        tags: ['healthcare', 'data-analysis'],
        frameworks: ['Health Data'],
      },
    ],
  },
]

export const HIGH_STAR_DISCOVERY_DOMAINS = DOMAIN_QUERY_GROUPS.map(
  ({ key, label, description, queries }) => ({
    key,
    label,
    description,
    query_count: queries.length,
  })
)

const DOMAIN_HIGH_STAR_QUERIES: HighStarQuery[] = DOMAIN_QUERY_GROUPS.flatMap((group) =>
  group.queries.map((query) => ({
    ...query,
    domain: group.key,
    tags: Array.from(new Set([...query.tags, group.key])),
  }))
)

const HIGH_STAR_QUERIES: HighStarQuery[] = [
  ...CORE_HIGH_STAR_QUERIES,
  ...DOMAIN_HIGH_STAR_QUERIES,
]

export const HIGH_STAR_QUERY_POOL_SIZE = HIGH_STAR_QUERIES.length

function normalizeRequestedDomains(domains?: string[]) {
  return Array.from(
    new Set(
      (domains || [])
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean)
    )
  )
}

function getQueryPoolForDomains(domains: string[]) {
  if (domains.length === 0) return HIGH_STAR_QUERIES

  const queryPool = HIGH_STAR_QUERIES.filter((query) =>
    query.domain ? domains.includes(query.domain) : false
  )

  if (queryPool.length === 0) {
    throw new Error(`No GitHub discovery queries configured for domains: ${domains.join(', ')}`)
  }

  return queryPool
}

function githubHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeSlug(fullName: string) {
  return fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function titleFromRepo(repoName: string) {
  return repoName
    .replace(/[-_]+/g, ' ')
    .replace(/\bmcp\b/gi, 'MCP')
    .replace(/\bai\b/gi, 'AI')
    .replace(/\bapi\b/gi, 'API')
    .replace(/\brag\b/gi, 'RAG')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function normalizeLicense(repo: GitHubSearchRepo) {
  const license = repo.license?.spdx_id
  if (!license || license === 'NOASSERTION') return 'Unknown'
  return license
}

function uniqueStrings(values: Array<string | null | undefined>, limit: number) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const normalized = value?.trim()
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
    if (result.length >= limit) break
  }

  return result
}

function buildSkill(repo: GitHubSearchRepo, query: HighStarQuery, evaluation: SkillCandidateEvaluation) {
  const description =
    repo.description ||
    `${repo.full_name} is a high-star GitHub project relevant to AI agent workflows.`

  const tags = uniqueStrings(
    [...query.tags, ...(repo.topics || []), repo.language, 'github'],
    10
  ).map((tag) => tag.toLowerCase())

  const frameworks = uniqueStrings([repo.language, ...query.frameworks], 6)

  return {
    slug: normalizeSlug(repo.full_name),
    name: titleFromRepo(repo.name),
    description,
    long_description: `${description}\n\nImported by the skill-only GitHub discovery pipeline because it matches agent skill, automation, domain workflow, RAG, document-processing, data, finance, security, or developer-tool signals. Protocol-server projects are excluded from automated imports.`,
    tagline: description,
    author_name: repo.owner.login,
    author_url: repo.owner.html_url,
    repository: repo.html_url,
    github_repo: repo.full_name,
    github_stars: repo.stargazers_count,
    github_forks: repo.forks_count,
    github_language: repo.language,
    github_last_pushed_at: repo.pushed_at || repo.updated_at,
    category: query.category,
    tags,
    frameworks,
    version: '1.0.0',
    license: normalizeLicense(repo),
    install_command: `npx skills add ${repo.full_name}`,
    verified: repo.stargazers_count >= 1000,
    submission_source: 'github-star-discovery',
    submitted_by_agent: 'open-agent-skill-bulk-indexer',
    ai_review_score: {
      total: repo.stargazers_count >= 10000 ? 88 : 78,
      source: 'github-star-discovery',
      github_stars: repo.stargazers_count,
      relevance_score: evaluation.score,
      relevance_signals: evaluation.signals,
    },
    ai_review_approved: true,
    ai_review_issues: [],
    ai_review_suggestions: [],
  }
}

async function recordIndexerRun(
  supabase: ReturnType<typeof createPublicClient>,
  serverSecret: string,
  run: Record<string, unknown>
) {
  const { error } = await supabase.rpc('record_indexer_run', {
    p_server_secret: serverSecret,
    p_run: run,
  })

  if (error) {
    console.error('[indexer] Failed to record run log:', error.message)
  }
}

async function searchGitHubRepos(
  query: HighStarQuery,
  minStars: number,
  page: number,
  perPage: number
) {
  const q = `${query.q} stars:>=${minStars} archived:false fork:false`
  const url =
    `${GITHUB_API_BASE}/search/repositories` +
    `?q=${encodeURIComponent(q)}` +
    `&sort=${query.sort || 'stars'}&order=desc&per_page=${perPage}&page=${page}`

  const response = await fetch(url, { headers: githubHeaders() } as RequestInit)

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GitHub search failed [${q} page=${page}]: ${response.status} ${body}`)
  }

  const data = (await response.json()) as GitHubSearchResponse
  return (data.items || []).filter(
    (repo) => !repo.archived && !repo.fork && repo.stargazers_count >= minStars
  )
}

function getSearchPlan(maxSearchRequests: number, pageSeed: number, queryPool: HighStarQuery[]) {
  const plan: Array<{ query: HighStarQuery; page: number }> = []
  const maxPage = 10
  const offset = pageSeed * maxSearchRequests

  for (let i = 0; i < maxSearchRequests; i += 1) {
    const cursor = offset + i
    const queryIndex = cursor % queryPool.length
    const page = 1 + (Math.floor(cursor / queryPool.length) % maxPage)
    plan.push({ query: queryPool[queryIndex], page })
  }

  return plan
}

export async function bulkImportHighStarSkills(
  options: BulkImportOptions = {}
): Promise<{ summary: BulkImportSummary; results: Array<{ repo: string; status: string; slug?: string; reason?: string }> }> {
  const targetNew = clamp(Math.floor(options.targetNew || DEFAULT_TARGET_NEW_PER_RUN), 1, 500)
  const minStars = clamp(Math.floor(options.minStars || 500), 100, 1_000_000)
  const perPage = clamp(Math.floor(options.perPage || 100), 10, 100)
  const requestedDomains = normalizeRequestedDomains(options.domains)
  const queryPool = getQueryPoolForDomains(requestedDomains)
  const defaultSearchRequests =
    requestedDomains.length > 0 ? DEFAULT_DOMAIN_SEARCH_REQUESTS : DEFAULT_TOKEN_SEARCH_REQUESTS
  const maxAllowedSearchRequests = process.env.GITHUB_TOKEN ? MAX_TOKEN_SEARCH_REQUESTS : 10
  const maxSearchRequests = clamp(
    Math.floor(options.maxSearchRequests || (process.env.GITHUB_TOKEN ? defaultSearchRequests : 10)),
    1,
    maxAllowedSearchRequests
  )
  const pageSeed = Math.max(
    0,
    Math.floor(options.pageSeed ?? Math.floor(Date.now() / 3_600_000))
  )
  const startedAt = new Date().toISOString()
  const serverSecret = process.env.INDEXER_SECRET

  if (!serverSecret) {
    throw new Error('Missing INDEXER_SECRET for controlled indexer writes.')
  }

  const supabase = createPublicClient()
  const { data: existingRows, error: existingError } = await supabase
    .from('skills')
    .select('slug')
    .eq('ai_review_approved', true)

  if (existingError) {
    throw new Error(`Failed to fetch existing skills: ${existingError.message}`)
  }

  const existingSlugs = new Set((existingRows || []).map((row) => row.slug as string))
  const seenSlugs = new Set(existingSlugs)
  const results: Array<{ repo: string; status: string; slug?: string; reason?: string }> = []
  const domainsCovered = new Set<string>()
  const summary: BulkImportSummary = {
    filterMode: 'skills-only',
    targetNew,
    minStars,
    requestedDomains,
    queryPoolSize: queryPool.length,
    domainsCovered: [],
    searchRequests: 0,
    candidatesFound: 0,
    skippedExisting: 0,
    skippedMcp: 0,
    skippedLowRelevance: 0,
    imported: 0,
    updated: 0,
    errors: 0,
  }

  for (const { query, page } of getSearchPlan(maxSearchRequests, pageSeed, queryPool)) {
    if (summary.imported >= targetNew) break

    summary.searchRequests += 1
    if (query.domain) domainsCovered.add(query.domain)

    let repos: GitHubSearchRepo[]
    try {
      repos = await searchGitHubRepos(query, minStars, page, perPage)
    } catch (error) {
      summary.errors += 1
      results.push({
        repo: query.q,
        status: 'error',
        reason: error instanceof Error ? error.message : 'GitHub search failed',
      })
      continue
    }

    summary.candidatesFound += repos.length

    for (const repo of repos) {
      if (summary.imported >= targetNew) break

      const slug = normalizeSlug(repo.full_name)
      if (seenSlugs.has(slug)) {
        summary.skippedExisting += 1
        continue
      }

      const evaluation = evaluateSkillCandidate({
        fullName: repo.full_name,
        name: repo.name,
        description: repo.description,
        topics: repo.topics || [],
        language: repo.language,
        query: query.q,
        category: query.category,
      })

      if (!evaluation.accepted) {
        if (evaluation.reason === 'mcp') {
          summary.skippedMcp += 1
        } else {
          summary.skippedLowRelevance += 1
        }
        continue
      }

      seenSlugs.add(slug)

      const skill = buildSkill(repo, query, evaluation)
      const { data, error } = await supabase.rpc('upsert_indexed_skill', {
        p_server_secret: serverSecret,
        p_skill: skill,
        p_activity: {
          event_type: 'skill_published',
          actor_name: 'Open Agent Skill Bulk Indexer',
          actor_type: 'agent',
          description: `Bulk-indexed ${skill.name} from GitHub (${repo.stargazers_count} stars)`,
          metadata: {
            source: 'github-star-discovery',
            filter_mode: 'skills-only',
            stars: repo.stargazers_count,
            relevance_score: evaluation.score,
            relevance_signals: evaluation.signals,
            domain: query.domain || 'core',
            query: query.q,
            page,
          },
        },
      })

      if (error) {
        summary.errors += 1
        results.push({ repo: repo.full_name, status: 'error', slug, reason: error.message })
        continue
      }

      const rpcResult = data as IndexedSkillRpcResult | null
      if (rpcResult?.created) {
        summary.imported += 1
        results.push({ repo: repo.full_name, status: 'indexed', slug })
      } else {
        summary.updated += 1
        results.push({ repo: repo.full_name, status: 'updated', slug })
      }
    }
  }

  summary.domainsCovered = Array.from(domainsCovered)

  await recordIndexerRun(supabase, serverSecret, {
    mode: 'bulk',
    status: summary.errors > 0 ? 'completed_with_errors' : 'completed',
    filter_mode: summary.filterMode,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    target_new: targetNew,
    min_stars: minStars,
    max_search_requests: maxSearchRequests,
    search_requests: summary.searchRequests,
    candidates_found: summary.candidatesFound,
    skipped_existing: summary.skippedExisting,
    skipped_mcp: summary.skippedMcp,
    skipped_low_relevance: summary.skippedLowRelevance,
    imported: summary.imported,
    updated: summary.updated,
    errors: summary.errors,
    metadata: {
      page_seed: pageSeed,
      per_page: perPage,
      requested_domains: requestedDomains,
      query_pool_size: queryPool.length,
      domains_covered: summary.domainsCovered,
      discovery_domains: HIGH_STAR_DISCOVERY_DOMAINS,
    },
  })

  return { summary, results }
}
