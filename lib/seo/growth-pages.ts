import { USE_CASES, type UseCaseDefinition } from '@/lib/use-cases'

export interface BestSkillPageDefinition {
  slug: string
  title: string
  shortTitle: string
  eyebrow: string
  description: string
  useCaseSlug: string
  searchIntent: string
  audience: string
  agentSurface?: string
  primaryKeyword?: string
  exampleTasks?: string[]
}

const BEST_PAGE_OVERRIDES: Record<string, Partial<BestSkillPageDefinition>> = {
  'web-scraping': {
    title: 'Best AI agent skills for web scraping',
    searchIntent: 'Find reusable AI agent skills for crawling websites, extracting structured data, and preparing web content for downstream workflows.',
    primaryKeyword: 'best AI agent skills for web scraping',
    exampleTasks: [
      'Scrape competitor pricing pages into a clean table',
      'Turn public websites into markdown for RAG',
      'Monitor product pages and extract structured changes',
    ],
  },
  'finance-quant': {
    title: 'Best AI agent skills for finance and quant analysis',
    searchIntent: 'Find reusable AI agent skills for stock research, market data, SEC filings, portfolio analysis, and quant backtesting.',
    primaryKeyword: 'best AI agent skills for finance analysis',
    exampleTasks: [
      'Analyze stock news and summarize market risks',
      'Backtest a quant strategy and explain drawdowns',
      'Summarize SEC filings for an investment memo',
    ],
  },
  'document-processing': {
    title: 'Best AI agent skills for PDF parsing',
    searchIntent: 'Find reusable AI agent skills for parsing PDFs, extracting tables, converting files, and preparing documents for agent workflows.',
    primaryKeyword: 'best AI agent skills for PDF parsing',
    exampleTasks: [
      'Extract tables from quarterly PDF reports',
      'Convert PDFs and Office files into clean markdown',
      'Prepare document metadata for retrieval workflows',
    ],
  },
  'sports-analytics': {
    title: 'Best AI agent skills for World Cup and football analytics',
    searchIntent: 'Find reusable AI agent skills for football data, World Cup dashboards, xG analysis, player scouting, and match prediction research.',
    primaryKeyword: 'best AI agent skills for World Cup analytics',
    exampleTasks: [
      'Build a World Cup dashboard from football datasets',
      'Compare teams using xG and match event data',
      'Generate player scouting notes before a match',
    ],
  },
}

const CUSTOM_BEST_SKILL_PAGES: BestSkillPageDefinition[] = [
  {
    slug: 'stock-analysis',
    title: 'Best AI agent skills for stock analysis',
    shortTitle: 'Stock analysis',
    eyebrow: 'Stock analysis agents',
    description:
      'Ranked OpenAgentSkill shortlist for agents that analyze stock news, filings, market data, fundamentals, and investment research workflows.',
    useCaseSlug: 'finance-quant',
    searchIntent: 'Find AI agent skills for stock analysis, market news, SEC filings, fundamentals, and investor-ready research briefs.',
    audience: 'Builders creating stock analysis, investing, market-monitoring, and earnings research agents.',
    agentSurface: 'AI agents',
    primaryKeyword: 'best AI agent skills for stock analysis',
    exampleTasks: [
      'Analyze stock news and summarize what changed',
      'Compare fundamentals before earnings',
      'Turn market data and filings into an investment memo',
    ],
  },
  {
    slug: 'codex-web-scraping',
    title: 'Best Codex skills for web scraping',
    shortTitle: 'Codex web scraping',
    eyebrow: 'Codex web data workflows',
    description:
      'Ranked OpenAgentSkill shortlist for Codex users crawling websites, extracting structured data, monitoring pages, and preparing web content for agents.',
    useCaseSlug: 'web-scraping',
    searchIntent: 'Find Codex-ready skills for web scraping, crawling, browser automation, markdown extraction, and structured data collection.',
    audience: 'Codex users building web scraping, monitoring, RAG ingestion, and data extraction workflows.',
    agentSurface: 'Codex',
    primaryKeyword: 'best Codex skills for web scraping',
    exampleTasks: [
      'Scrape product pages into a structured table',
      'Monitor competitor websites for changes',
      'Convert crawled pages into markdown for RAG',
    ],
  },
  {
    slug: 'codex-finance-analysis',
    title: 'Best Codex skills for finance analysis',
    shortTitle: 'Codex finance analysis',
    eyebrow: 'Codex finance workflows',
    description:
      'Ranked OpenAgentSkill shortlist for Codex users analyzing stock news, filings, portfolios, market data, and quant research workflows.',
    useCaseSlug: 'finance-quant',
    searchIntent: 'Find Codex-ready skills for stock research, SEC filing analysis, market data workflows, and quant backtesting.',
    audience: 'Codex users building finance, investing, trading research, and market-analysis agents.',
    agentSurface: 'Codex',
    primaryKeyword: 'best Codex skills for finance analysis',
    exampleTasks: [
      'Analyze stock news and prepare a risk brief',
      'Summarize a 10-K filing into investor notes',
      'Backtest a simple factor strategy and explain results',
    ],
  },
  {
    slug: 'claude-code-pdf-parsing',
    title: 'Best Claude Code skills for PDF parsing',
    shortTitle: 'Claude Code PDF parsing',
    eyebrow: 'Claude Code document workflows',
    description:
      'Ranked OpenAgentSkill shortlist for Claude Code users parsing PDFs, extracting tables, converting files, and building document intelligence workflows.',
    useCaseSlug: 'document-processing',
    searchIntent: 'Find Claude Code-ready skills for PDF parsing, OCR, table extraction, markdown conversion, and document cleanup.',
    audience: 'Claude Code users building document parsing, research, reporting, and RAG workflows.',
    agentSurface: 'Claude Code',
    primaryKeyword: 'best Claude Code skills for PDF parsing',
    exampleTasks: [
      'Extract tables from a PDF report',
      'Convert a folder of PDFs into markdown',
      'Build a document parsing workflow for RAG',
    ],
  },
  {
    slug: 'football-analytics',
    title: 'Best AI agent skills for football analytics',
    shortTitle: 'Football analytics',
    eyebrow: 'Football analytics agents',
    description:
      'Ranked OpenAgentSkill shortlist for agents building football dashboards, World Cup analysis, xG research, match prediction, and scouting workflows.',
    useCaseSlug: 'sports-analytics',
    searchIntent: 'Find AI agent skills for football analytics, World Cup dashboards, xG, team comparison, player scouting, and match research.',
    audience: 'Builders creating football, sports analytics, World Cup, scouting, and match intelligence agents.',
    agentSurface: 'AI agents',
    primaryKeyword: 'best AI agent skills for football analytics',
    exampleTasks: [
      'Build a football analytics dashboard',
      'Compare World Cup teams with xG and event data',
      'Generate scouting notes before a match',
    ],
  },
  {
    slug: 'cursor-code-review',
    title: 'Best Cursor skills for code review',
    shortTitle: 'Cursor code review',
    eyebrow: 'Cursor coding workflows',
    description:
      'Ranked OpenAgentSkill shortlist for Cursor users reviewing pull requests, inspecting repositories, generating tests, and improving code quality.',
    useCaseSlug: 'coding-agents',
    searchIntent: 'Find Cursor-ready skills for pull request review, repository analysis, test generation, and codebase understanding.',
    audience: 'Cursor users building coding agents, review workflows, and developer productivity automations.',
    agentSurface: 'Cursor',
    primaryKeyword: 'best Cursor skills for code review',
    exampleTasks: [
      'Review a pull request and summarize risks',
      'Generate tests for a changed module',
      'Explain the architecture of a repository',
    ],
  },
  {
    slug: 'ai-agent-stock-research',
    title: 'Best AI agent skills for stock research',
    shortTitle: 'Stock research',
    eyebrow: 'Market research agents',
    description:
      'Ranked OpenAgentSkill shortlist for agents that research stocks, summarize news, inspect filings, compare fundamentals, and prepare market briefs.',
    useCaseSlug: 'finance-quant',
    searchIntent: 'Find AI agent skills for stock research, financial news analysis, filings, market data, and investment memos.',
    audience: 'Builders creating stock research, investing, and market-analysis agents.',
    agentSurface: 'AI agents',
    primaryKeyword: 'best AI agent skills for stock research',
    exampleTasks: [
      'Summarize what changed for a stock in the last 30 days',
      'Compare company fundamentals and recent news',
      'Prepare a market brief before earnings',
    ],
  },
]

function titleCase(value: string) {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function toBestPage(useCase: UseCaseDefinition): BestSkillPageDefinition {
  const base: BestSkillPageDefinition = {
    slug: useCase.slug,
    title: `Best ${useCase.shortTitle.toLowerCase()} skills for AI agents`,
    shortTitle: titleCase(useCase.shortTitle),
    eyebrow: useCase.eyebrow,
    description: useCase.description,
    useCaseSlug: useCase.slug,
    searchIntent: `Find production-ready agent skills for ${useCase.shortTitle.toLowerCase()} workflows.`,
    audience: `Builders choosing skills for ${useCase.workflows.slice(0, 2).join(' and ').toLowerCase()}.`,
  }

  return {
    ...base,
    ...BEST_PAGE_OVERRIDES[useCase.slug],
  }
}

export const BEST_SKILL_PAGES: BestSkillPageDefinition[] = [
  ...USE_CASES.map(toBestPage),
  ...CUSTOM_BEST_SKILL_PAGES,
]

export const FEATURED_BEST_PAGES = BEST_SKILL_PAGES.filter((page) =>
  ['web-scraping', 'stock-analysis', 'codex-web-scraping', 'codex-finance-analysis', 'claude-code-pdf-parsing', 'sports-analytics', 'football-analytics', 'coding-agents', 'browser-automation', 'rag-knowledge', 'data-analysis', 'github-automation']
    .includes(page.slug)
)

export function getBestSkillPage(slug: string) {
  return BEST_SKILL_PAGES.find((page) => page.slug === slug)
}
