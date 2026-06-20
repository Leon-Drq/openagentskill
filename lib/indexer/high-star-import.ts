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
  targetTotal?: number
  minStars?: number
  maxSearchRequests?: number
  perPage?: number
  pageSeed?: number
  domains?: string[]
  strictQuality?: boolean
  maxStaleDays?: number
  includeCollections?: boolean
  duplicateRecoverySearchRequests?: number
}

export interface BulkImportSummary {
  filterMode: 'skills-only'
  targetNew: number
  targetTotal: number
  existingApproved: number
  remainingToTarget: number
  minStars: number
  pageSeed: number
  requestedDomains: string[]
  queryPoolSize: number
  domainsCovered: string[]
  searchRequests: number
  duplicateRecoverySearchRequests: number
  duplicateRecoveryUsed: number
  candidatesFound: number
  skippedExisting: number
  skippedMcp: number
  skippedLowRelevance: number
  skippedStale: number
  skippedCollections: number
  skippedWeakMetadata: number
  imported: number
  updated: number
  errors: number
  errorSamples: Array<{ repo: string; reason?: string }>
}

const GITHUB_API_BASE = 'https://api.github.com'
const DEFAULT_TARGET_NEW_PER_RUN = 250
const DEFAULT_TOKEN_SEARCH_REQUESTS = 30
const DEFAULT_DOMAIN_SEARCH_REQUESTS = 80
const MAX_TOKEN_SEARCH_REQUESTS = 120
const DEFAULT_MAX_STALE_DAYS = 1460
const EXISTING_SLUG_PAGE_SIZE = 1000
export const HIGH_STAR_INDEXER_VERSION = 'scenario-coverage-v3-20k'
export const HIGH_STAR_SKILL_COVERAGE_TARGET = 20_000

export function resolveHighStarCoverageTarget(requestedTarget?: number | null) {
  const parsed = Math.floor(Number(requestedTarget))
  if (!Number.isFinite(parsed) || parsed <= 0) return HIGH_STAR_SKILL_COVERAGE_TARGET
  return Math.max(parsed, HIGH_STAR_SKILL_COVERAGE_TARGET)
}

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
    q: 'topic:automation',
    category: 'automation',
    tags: ['automation', 'workflow'],
    frameworks: ['Automation'],
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
    q: 'topic:data-science data-analysis',
    category: 'data-analysis',
    tags: ['data-science', 'data-analysis', 'analytics'],
    frameworks: ['Data Science'],
  },
  {
    q: 'topic:dashboard data-analysis',
    category: 'data-analysis',
    tags: ['dashboard', 'data-analysis', 'visualization'],
    frameworks: ['Dashboard'],
  },
  {
    q: 'topic:data-visualization data-analysis',
    category: 'data-analysis',
    tags: ['data-visualization', 'data-analysis'],
    frameworks: ['Data Visualization'],
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
    q: 'topic:monitoring automation',
    category: 'devops',
    tags: ['monitoring', 'automation', 'observability'],
    frameworks: ['Monitoring'],
  },
  {
    q: 'topic:command-line-tool automation',
    category: 'productivity-automation',
    tags: ['cli', 'automation', 'productivity'],
    frameworks: ['CLI'],
  },
  {
    q: 'topic:api-client automation',
    category: 'integrations',
    tags: ['api-client', 'automation', 'integration'],
    frameworks: ['API Client'],
  },
  {
    q: 'topic:natural-language-processing document-processing',
    category: 'document-processing',
    tags: ['nlp', 'document-processing', 'extraction'],
    frameworks: ['NLP'],
  },
  {
    q: 'topic:test-automation topic:pytest',
    category: 'testing-qa',
    tags: ['testing', 'pytest', 'automation'],
    frameworks: ['Testing'],
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
    key: 'coding',
    label: 'Coding, repositories, and developer agents',
    description: 'Coding agents, code review, test generation, repository analysis, CI, GitHub automation, and developer workflow skills.',
    queries: [
      {
        q: 'topic:code-agent',
        category: 'coding-agents',
        tags: ['coding-agent', 'developer-tools'],
        frameworks: ['Coding Agent'],
      },
      {
        q: '"coding agent"',
        category: 'coding-agents',
        tags: ['coding-agent', 'developer-tools'],
        frameworks: ['Coding Agent'],
        sort: 'updated',
      },
      {
        q: 'topic:code-review',
        category: 'coding-agents',
        tags: ['code-review', 'developer-tools'],
        frameworks: ['Code Review'],
      },
      {
        q: 'topic:test-generation',
        category: 'testing-qa',
        tags: ['test-generation', 'qa', 'developer-tools'],
        frameworks: ['Testing'],
      },
      {
        q: 'topic:developer-tools',
        category: 'coding-agents',
        tags: ['developer-tools', 'automation'],
        frameworks: ['Developer Tools'],
      },
      {
        q: 'topic:github-actions',
        category: 'github-automation',
        tags: ['github-actions', 'automation'],
        frameworks: ['GitHub'],
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
    key: 'sports',
    label: 'World Cup, football, and sports analytics',
    description: 'Football data, World Cup datasets, sports analytics, expected goals, match prediction, and fantasy workflows.',
    queries: [
      {
        q: 'topic:soccer',
        category: 'sports-analytics',
        tags: ['sports', 'soccer', 'analytics'],
        frameworks: ['Sports Data'],
      },
      {
        q: 'topic:football',
        category: 'sports-analytics',
        tags: ['sports', 'football', 'analytics'],
        frameworks: ['Sports Data'],
      },
      {
        q: 'topic:sports-analytics',
        category: 'sports-analytics',
        tags: ['sports', 'analytics'],
        frameworks: ['Sports Analytics'],
      },
      {
        q: 'topic:sports-data',
        category: 'sports-analytics',
        tags: ['sports-data', 'analytics'],
        frameworks: ['Sports Data'],
      },
      {
        q: 'topic:world-cup',
        category: 'sports-analytics',
        tags: ['world-cup', 'football', 'sports'],
        frameworks: ['World Cup'],
      },
      {
        q: '"FIFA World Cup"',
        category: 'sports-analytics',
        tags: ['fifa', 'world-cup', 'football'],
        frameworks: ['World Cup'],
      },
      {
        q: '"world cup data"',
        category: 'sports-analytics',
        tags: ['world-cup', 'sports-data'],
        frameworks: ['World Cup Data'],
      },
      {
        q: '"football analytics"',
        category: 'sports-analytics',
        tags: ['football', 'analytics'],
        frameworks: ['Football Analytics'],
      },
      {
        q: '"soccer analytics"',
        category: 'sports-analytics',
        tags: ['soccer', 'analytics'],
        frameworks: ['Soccer Analytics'],
      },
      {
        q: '"football data"',
        category: 'sports-analytics',
        tags: ['football', 'sports-data'],
        frameworks: ['Football Data'],
      },
      {
        q: '"soccer data"',
        category: 'sports-analytics',
        tags: ['soccer', 'sports-data'],
        frameworks: ['Soccer Data'],
      },
      {
        q: 'topic:statsbomb',
        category: 'sports-analytics',
        tags: ['statsbomb', 'football', 'analytics'],
        frameworks: ['StatsBomb'],
      },
      {
        q: '"expected goals"',
        category: 'sports-analytics',
        tags: ['xg', 'football', 'analytics'],
        frameworks: ['Expected Goals'],
      },
      {
        q: 'topic:match-prediction',
        category: 'sports-analytics',
        tags: ['match-prediction', 'sports', 'analytics'],
        frameworks: ['Match Prediction'],
      },
      {
        q: 'topic:fantasy-football',
        category: 'sports-analytics',
        tags: ['fantasy-football', 'sports-data'],
        frameworks: ['Fantasy Sports'],
      },
      {
        q: 'topic:sports-betting',
        category: 'sports-analytics',
        tags: ['sports-betting', 'analytics'],
        frameworks: ['Sports Analytics'],
      },
      {
        q: 'topic:openfootball',
        category: 'sports-analytics',
        tags: ['openfootball', 'football-data'],
        frameworks: ['OpenFootball'],
      },
      {
        q: 'topic:football-api',
        category: 'sports-analytics',
        tags: ['football-api', 'sports-data'],
        frameworks: ['Football API'],
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
  {
    key: 'marketing-seo',
    label: 'Marketing, SEO, and growth automation',
    description: 'SEO research, content operations, web analytics, attribution, email, CRM, and growth workflows.',
    queries: [
      {
        q: 'topic:seo',
        category: 'growth-marketing',
        tags: ['seo', 'growth', 'marketing'],
        frameworks: ['SEO'],
      },
      {
        q: '"keyword research"',
        category: 'growth-marketing',
        tags: ['keyword-research', 'seo', 'marketing'],
        frameworks: ['SEO'],
      },
      {
        q: 'topic:content-marketing',
        category: 'growth-marketing',
        tags: ['content-marketing', 'growth'],
        frameworks: ['Content Marketing'],
      },
      {
        q: 'topic:web-analytics',
        category: 'growth-marketing',
        tags: ['web-analytics', 'growth'],
        frameworks: ['Analytics'],
      },
      {
        q: 'topic:crm',
        category: 'growth-marketing',
        tags: ['crm', 'sales', 'automation'],
        frameworks: ['CRM'],
      },
      {
        q: 'topic:email-automation',
        category: 'growth-marketing',
        tags: ['email-automation', 'marketing'],
        frameworks: ['Email Automation'],
      },
    ],
  },
  {
    key: 'design',
    label: 'Design, creative, and media production',
    description: 'Design systems, Figma workflows, UI generation, creative automation, images, video, presentations, and multimodal production.',
    queries: [
      {
        q: 'topic:design-system',
        category: 'design-creative',
        tags: ['design-system', 'design', 'ui'],
        frameworks: ['Design Systems'],
      },
      {
        q: 'topic:figma',
        category: 'design-creative',
        tags: ['figma', 'design', 'ui'],
        frameworks: ['Figma'],
      },
      {
        q: '"ui generation"',
        category: 'design-creative',
        tags: ['ui-generation', 'design', 'ai'],
        frameworks: ['UI Generation'],
      },
      {
        q: '"design automation"',
        category: 'design-creative',
        tags: ['design-automation', 'workflow'],
        frameworks: ['Design Automation'],
        sort: 'updated',
      },
      {
        q: 'topic:image-generation',
        category: 'media-automation',
        tags: ['image-generation', 'creative', 'media'],
        frameworks: ['Image Generation'],
      },
      {
        q: 'topic:video-generation',
        category: 'media-automation',
        tags: ['video-generation', 'creative', 'media'],
        frameworks: ['Video Generation'],
      },
      {
        q: 'topic:presentation',
        category: 'design-creative',
        tags: ['presentation', 'design', 'workflow'],
        frameworks: ['Presentation'],
      },
      {
        q: 'topic:creative-coding',
        category: 'design-creative',
        tags: ['creative-coding', 'design'],
        frameworks: ['Creative Coding'],
      },
    ],
  },
  {
    key: 'legal-compliance',
    label: 'Legal, policy, and compliance review',
    description: 'Contract analysis, legal search, privacy, policy review, governance, and compliance automation.',
    queries: [
      {
        q: 'topic:legal-tech',
        category: 'legal-compliance',
        tags: ['legal-tech', 'compliance', 'documents'],
        frameworks: ['Legal Tech'],
      },
      {
        q: '"contract analysis"',
        category: 'legal-compliance',
        tags: ['contract-analysis', 'legal', 'documents'],
        frameworks: ['Contract Review'],
      },
      {
        q: '"policy analysis"',
        category: 'legal-compliance',
        tags: ['policy-analysis', 'compliance'],
        frameworks: ['Policy Review'],
      },
      {
        q: 'topic:privacy',
        category: 'legal-compliance',
        tags: ['privacy', 'compliance'],
        frameworks: ['Privacy'],
      },
      {
        q: 'topic:gdpr',
        category: 'legal-compliance',
        tags: ['gdpr', 'privacy', 'compliance'],
        frameworks: ['GDPR'],
      },
    ],
  },
  {
    key: 'education',
    label: 'Education, tutoring, and learning workflows',
    description: 'Tutoring, course generation, quiz creation, learning analytics, notebooks, and classroom automation.',
    queries: [
      {
        q: 'topic:education',
        category: 'education',
        tags: ['education', 'learning'],
        frameworks: ['Education'],
      },
      {
        q: 'topic:tutoring',
        category: 'education',
        tags: ['tutoring', 'learning', 'agent'],
        frameworks: ['Tutoring'],
      },
      {
        q: '"course generation"',
        category: 'education',
        tags: ['course-generation', 'education'],
        frameworks: ['Course Generation'],
      },
      {
        q: '"quiz generation"',
        category: 'education',
        tags: ['quiz-generation', 'education'],
        frameworks: ['Quiz Generation'],
      },
      {
        q: 'topic:learning-analytics',
        category: 'education',
        tags: ['learning-analytics', 'education'],
        frameworks: ['Learning Analytics'],
      },
    ],
  },
  {
    key: 'customer-support',
    label: 'Customer support and operations',
    description: 'Support bots, helpdesk automation, ticket triage, knowledge-base workflows, and customer ops.',
    queries: [
      {
        q: 'topic:customer-support',
        category: 'support-automation',
        tags: ['customer-support', 'automation'],
        frameworks: ['Support Automation'],
      },
      {
        q: 'topic:helpdesk',
        category: 'support-automation',
        tags: ['helpdesk', 'support', 'automation'],
        frameworks: ['Helpdesk'],
      },
      {
        q: '"ticket triage"',
        category: 'support-automation',
        tags: ['ticket-triage', 'support'],
        frameworks: ['Ticket Triage'],
      },
      {
        q: 'topic:chatbot',
        category: 'support-automation',
        tags: ['chatbot', 'support', 'automation'],
        frameworks: ['Chatbot'],
      },
      {
        q: '"knowledge base" support',
        category: 'support-automation',
        tags: ['knowledge-base', 'support'],
        frameworks: ['Knowledge Base'],
      },
    ],
  },
  {
    key: 'productivity',
    label: 'Personal productivity and workspace automation',
    description: 'Email, calendar, notes, task management, desktop automation, file workflows, and team collaboration.',
    queries: [
      {
        q: 'topic:productivity',
        category: 'productivity-automation',
        tags: ['productivity', 'automation'],
        frameworks: ['Productivity'],
      },
      {
        q: 'topic:email',
        category: 'productivity-automation',
        tags: ['email', 'automation'],
        frameworks: ['Email'],
      },
      {
        q: 'topic:calendar',
        category: 'productivity-automation',
        tags: ['calendar', 'automation'],
        frameworks: ['Calendar'],
      },
      {
        q: 'topic:notes',
        category: 'productivity-automation',
        tags: ['notes', 'knowledge'],
        frameworks: ['Notes'],
      },
      {
        q: 'topic:task-management',
        category: 'productivity-automation',
        tags: ['task-management', 'workflow'],
        frameworks: ['Task Management'],
      },
      {
        q: 'topic:desktop-automation',
        category: 'productivity-automation',
        tags: ['desktop-automation', 'computer-use'],
        frameworks: ['Desktop Automation'],
      },
    ],
  },
  {
    key: 'web3',
    label: 'Crypto, Web3, and on-chain analytics',
    description: 'On-chain analysis, DeFi analytics, wallets, smart-contract review, transaction monitoring, and crypto data.',
    queries: [
      {
        q: 'topic:blockchain',
        category: 'web3-analytics',
        tags: ['blockchain', 'web3', 'analytics'],
        frameworks: ['Blockchain'],
      },
      {
        q: 'topic:web3',
        category: 'web3-analytics',
        tags: ['web3', 'crypto'],
        frameworks: ['Web3'],
      },
      {
        q: 'topic:on-chain',
        category: 'web3-analytics',
        tags: ['on-chain', 'analytics'],
        frameworks: ['On-chain Analytics'],
      },
      {
        q: 'topic:defi',
        category: 'web3-analytics',
        tags: ['defi', 'crypto', 'analytics'],
        frameworks: ['DeFi'],
      },
      {
        q: '"smart contract analysis"',
        category: 'web3-analytics',
        tags: ['smart-contracts', 'security', 'analysis'],
        frameworks: ['Smart Contracts'],
      },
      {
        q: '"transaction monitoring" crypto',
        category: 'web3-analytics',
        tags: ['transaction-monitoring', 'crypto'],
        frameworks: ['Transaction Monitoring'],
      },
    ],
  },
  {
    key: 'robotics-iot',
    label: 'Robotics, IoT, and physical-world agents',
    description: 'Robotics control, ROS, computer vision, sensor data, IoT automation, and physical-world workflows.',
    queries: [
      {
        q: 'topic:robotics',
        category: 'robotics-iot',
        tags: ['robotics', 'automation'],
        frameworks: ['Robotics'],
      },
      {
        q: 'topic:ros',
        category: 'robotics-iot',
        tags: ['ros', 'robotics'],
        frameworks: ['ROS'],
      },
      {
        q: 'topic:computer-vision',
        category: 'robotics-iot',
        tags: ['computer-vision', 'automation'],
        frameworks: ['Computer Vision'],
      },
      {
        q: 'topic:iot',
        category: 'robotics-iot',
        tags: ['iot', 'automation'],
        frameworks: ['IoT'],
      },
      {
        q: 'topic:sensor-data',
        category: 'robotics-iot',
        tags: ['sensor-data', 'analysis'],
        frameworks: ['Sensor Data'],
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
    categories: Array.from(new Set(queries.map((query) => query.category))).slice(0, 4),
    example_tags: Array.from(new Set(queries.flatMap((query) => query.tags))).slice(0, 6),
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

function daysSince(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY
  return Math.floor((Date.now() - time) / 86_400_000)
}

function evaluateImportQuality(
  repo: GitHubSearchRepo,
  evaluation: SkillCandidateEvaluation,
  options: {
    strictQuality: boolean
    maxStaleDays: number
    includeCollections: boolean
  }
): { accepted: true } | { accepted: false; reason: 'stale' | 'collection' | 'weak-metadata' | 'low-relevance' | 'mcp' } {
  if (!evaluation.accepted) {
    return { accepted: false, reason: evaluation.reason === 'mcp' ? 'mcp' : 'low-relevance' }
  }

  if (!options.strictQuality) return { accepted: true }

  const updatedDays = Math.min(daysSince(repo.pushed_at), daysSince(repo.updated_at))
  if (updatedDays > options.maxStaleDays) {
    return { accepted: false, reason: 'stale' }
  }

  const isCollection = evaluation.signals.includes('collection-like')
  const hasExplicitSkillSignal =
    evaluation.signals.includes('agent-skill') ||
    evaluation.signals.includes('skill')

  if (isCollection && !options.includeCollections && !hasExplicitSkillSignal) {
    return { accepted: false, reason: 'collection' }
  }

  const descriptionLength = (repo.description || '').trim().length
  const topicCount = repo.topics?.length || 0
  if (descriptionLength < 24 && topicCount < 2) {
    return { accepted: false, reason: 'weak-metadata' }
  }

  return { accepted: true }
}

async function fetchExistingApprovedSlugs(supabase: ReturnType<typeof createPublicClient>) {
  const slugs = new Set<string>()
  let exactCount = 0

  const { count, error: countError } = await supabase
    .from('skills')
    .select('slug', { count: 'exact', head: true })
    .eq('ai_review_approved', true)

  if (countError) {
    throw new Error(`Failed to count existing skills: ${countError.message}`)
  }

  exactCount = count || 0

  for (let from = 0; ; from += EXISTING_SLUG_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('skills')
      .select('slug')
      .eq('ai_review_approved', true)
      .range(from, from + EXISTING_SLUG_PAGE_SIZE - 1)

    if (error) {
      throw new Error(`Failed to fetch existing skills: ${error.message}`)
    }

    if (!data?.length) break
    for (const row of data) {
      if (row.slug) slugs.add(row.slug as string)
    }
    if (data.length < EXISTING_SLUG_PAGE_SIZE) break
  }

  return { slugs, count: exactCount }
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

function shouldRunDuplicateRecovery(summary: BulkImportSummary, primarySearchRequests: number) {
  if (summary.searchRequests < primarySearchRequests) return false
  if (summary.imported > 0) return false
  if (summary.candidatesFound < 50) return false

  const duplicateRate = summary.skippedExisting / Math.max(summary.candidatesFound, 1)
  return duplicateRate >= 0.5
}

export async function bulkImportHighStarSkills(
  options: BulkImportOptions = {}
): Promise<{ summary: BulkImportSummary; results: Array<{ repo: string; status: string; slug?: string; reason?: string }> }> {
  const requestedTargetNew = clamp(Math.floor(options.targetNew || DEFAULT_TARGET_NEW_PER_RUN), 1, 1000)
  const targetTotal = resolveHighStarCoverageTarget(options.targetTotal)
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
  const duplicateRecoverySearchRequests = clamp(
    Math.floor(options.duplicateRecoverySearchRequests || 0),
    0,
    process.env.GITHUB_TOKEN ? Math.max(0, MAX_TOKEN_SEARCH_REQUESTS - maxSearchRequests) : 0
  )
  const pageSeed = Math.max(0, Math.floor(options.pageSeed ?? Math.floor(Date.now() / 3_600_000)))
  const strictQuality = options.strictQuality !== false
  const maxStaleDays = Math.max(30, Math.floor(options.maxStaleDays || DEFAULT_MAX_STALE_DAYS))
  const includeCollections = options.includeCollections === true
  const startedAt = new Date().toISOString()
  const serverSecret = process.env.INDEXER_SECRET

  if (!serverSecret) {
    throw new Error('Missing INDEXER_SECRET for controlled indexer writes.')
  }

  const supabase = createPublicClient()
  const existing = await fetchExistingApprovedSlugs(supabase)
  const existingSlugs = existing.slugs
  const seenSlugs = new Set(existingSlugs)
  const results: Array<{ repo: string; status: string; slug?: string; reason?: string }> = []
  const domainsCovered = new Set<string>()
  const remainingToTarget = Math.max(0, targetTotal - existing.count)
  const targetNew = Math.min(requestedTargetNew, remainingToTarget)
  const summary: BulkImportSummary = {
    filterMode: 'skills-only',
    targetNew,
    targetTotal,
    existingApproved: existing.count,
    remainingToTarget,
    minStars,
    pageSeed,
    requestedDomains,
    queryPoolSize: queryPool.length,
    domainsCovered: [],
    searchRequests: 0,
    duplicateRecoverySearchRequests,
    duplicateRecoveryUsed: 0,
    candidatesFound: 0,
    skippedExisting: 0,
    skippedMcp: 0,
    skippedLowRelevance: 0,
    skippedStale: 0,
    skippedCollections: 0,
    skippedWeakMetadata: 0,
    imported: 0,
    updated: 0,
    errors: 0,
    errorSamples: [],
  }

  if (targetNew === 0) {
    summary.domainsCovered = []
    await recordIndexerRun(supabase, serverSecret, {
      mode: 'bulk',
      status: 'target_reached',
      filter_mode: summary.filterMode,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      target_new: summary.targetNew,
      target_total: summary.targetTotal,
      existing_approved: summary.existingApproved,
      remaining_to_target: summary.remainingToTarget,
      min_stars: summary.minStars,
      max_search_requests: 0,
      search_requests: 0,
      candidates_found: 0,
      skipped_existing: 0,
      skipped_mcp: 0,
      skipped_low_relevance: 0,
      imported: 0,
      updated: 0,
      errors: 0,
      metadata: {
        reason: 'coverage target reached',
        requested_domains: requestedDomains,
        discovery_domains: HIGH_STAR_DISCOVERY_DOMAINS,
      },
    })

    return { summary, results }
  }

  const searchPlan = getSearchPlan(
    maxSearchRequests + duplicateRecoverySearchRequests,
    pageSeed,
    queryPool
  )

  for (const [index, { query, page }] of searchPlan.entries()) {
    if (summary.imported >= targetNew) break
    const isRecoveryWindow = index >= maxSearchRequests

    if (isRecoveryWindow && !shouldRunDuplicateRecovery(summary, maxSearchRequests)) {
      break
    }

    summary.searchRequests += 1
    if (isRecoveryWindow) summary.duplicateRecoveryUsed += 1
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
      summary.errorSamples = results
        .filter((result) => result.status === 'error')
        .slice(-5)
        .map((result) => ({ repo: result.repo, reason: result.reason }))
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

      const qualityGate = evaluateImportQuality(repo, evaluation, {
        strictQuality,
        maxStaleDays,
        includeCollections,
      })

      if (!qualityGate.accepted) {
        if (qualityGate.reason === 'mcp') summary.skippedMcp += 1
        else if (qualityGate.reason === 'stale') summary.skippedStale += 1
        else if (qualityGate.reason === 'collection') summary.skippedCollections += 1
        else if (qualityGate.reason === 'weak-metadata') summary.skippedWeakMetadata += 1
        else summary.skippedLowRelevance += 1
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
        summary.errorSamples = results
          .filter((result) => result.status === 'error')
          .slice(-5)
          .map((result) => ({ repo: result.repo, reason: result.reason }))
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
    duplicate_recovery_search_requests: duplicateRecoverySearchRequests,
    duplicate_recovery_used: summary.duplicateRecoveryUsed,
    candidates_found: summary.candidatesFound,
    skipped_existing: summary.skippedExisting,
    skipped_mcp: summary.skippedMcp,
    skipped_low_relevance: summary.skippedLowRelevance,
    skipped_stale: summary.skippedStale,
    skipped_collections: summary.skippedCollections,
    skipped_weak_metadata: summary.skippedWeakMetadata,
    imported: summary.imported,
    updated: summary.updated,
    errors: summary.errors,
    metadata: {
      page_seed: pageSeed,
      per_page: perPage,
      duplicate_recovery_search_requests: duplicateRecoverySearchRequests,
      duplicate_recovery_used: summary.duplicateRecoveryUsed,
      duplicate_recovery_triggered: summary.duplicateRecoveryUsed > 0,
      target_total: targetTotal,
      existing_approved: existing.count,
      remaining_to_target: remainingToTarget,
      strict_quality: strictQuality,
      max_stale_days: maxStaleDays,
      include_collections: includeCollections,
      requested_domains: requestedDomains,
      query_pool_size: queryPool.length,
      domains_covered: summary.domainsCovered,
      error_samples: summary.errorSamples,
      discovery_domains: HIGH_STAR_DISCOVERY_DOMAINS,
    },
  })

  return { summary, results }
}
