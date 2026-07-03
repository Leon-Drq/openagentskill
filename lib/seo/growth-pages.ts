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
  'presentation-generation': {
    title: 'Best AI agent skills for PPT and presentation decks',
    searchIntent: 'Find reusable AI agent skills for creating PPTX decks, HTML slides, pitch decks, speaker notes, and presentation workflows from source material.',
    primaryKeyword: 'best AI agent skills for PPT generation',
    exampleTasks: [
      'Turn a research brief into an editable PPTX deck',
      'Create HTML slides from product notes',
      'Prepare speaker notes and a visual story from source documents',
    ],
  },
}

const CUSTOM_BEST_SKILL_PAGES: BestSkillPageDefinition[] = [
  {
    slug: 'ai-agent-skills-library',
    title: 'AI agent skills library',
    shortTitle: 'Skills library',
    eyebrow: 'Agent skill registry',
    description:
      'A ranked OpenAgentSkill library of reusable AI agent skills with trust signals, install handoffs, GitHub quality, maintenance status, and agent-readable metadata.',
    useCaseSlug: 'workflow-automation',
    searchIntent: 'Find an AI agent skills library with real reusable skills, install commands, trust scores, audit notes, and agent workflow metadata.',
    audience: 'Builders comparing reusable skills before installing them into Codex, Claude Code, Cursor, and agent workflows.',
    agentSurface: 'AI agents',
    primaryKeyword: 'AI agent skills library',
    exampleTasks: [
      'Find a reusable skill for a new agent task',
      'Compare skills by trust, freshness, install path, and GitHub quality',
      'Shortlist a safe install plan before an agent acts',
    ],
  },
  {
    slug: 'open-source-ai-agent-skills',
    title: 'Open source AI agent skills',
    shortTitle: 'Open source skills',
    eyebrow: 'Open source registry',
    description:
      'A ranked shortlist of open-source AI agent skills across coding, research, finance, presentation, data, browser automation, and workflow automation use cases.',
    useCaseSlug: 'coding-agents',
    searchIntent: 'Find open-source AI agent skills with GitHub repositories, license signals, install commands, and audit notes.',
    audience: 'Developers and teams looking for reusable open-source capabilities that agents can inspect, compare, and install.',
    agentSurface: 'AI agents',
    primaryKeyword: 'open source AI agent skills',
    exampleTasks: [
      'Find open-source skills for a coding or research agent',
      'Check license and maintenance status before installing a skill',
      'Compare alternatives instead of picking the first GitHub repo',
    ],
  },
  {
    slug: 'codex-skills',
    title: 'Best Codex skills for agent workflows',
    shortTitle: 'Codex skills',
    eyebrow: 'Codex agent skills',
    description:
      'Ranked OpenAgentSkill shortlist for Codex workflows: repo inspection, code review, testing, web data collection, research, and safe install handoffs.',
    useCaseSlug: 'coding-agents',
    searchIntent: 'Find Codex-ready skills for coding agents, repository analysis, code review, tests, web data workflows, and install handoffs.',
    audience: 'Codex users building coding agents and developer automation workflows.',
    agentSurface: 'Codex',
    primaryKeyword: 'Codex skills',
    exampleTasks: [
      'Review a pull request and generate test ideas',
      'Inspect a repository before changing code',
      'Install a reusable skill into a Codex workflow after audit review',
    ],
  },
  {
    slug: 'claude-code-skills',
    title: 'Best Claude Code skills for agent workflows',
    shortTitle: 'Claude Code skills',
    eyebrow: 'Claude Code agent skills',
    description:
      'Ranked OpenAgentSkill shortlist for Claude Code workflows: coding agents, document parsing, web research, browser automation, and safe install review.',
    useCaseSlug: 'coding-agents',
    searchIntent: 'Find Claude Code-ready skills for coding, document parsing, research, browser automation, and reusable agent workflows.',
    audience: 'Claude Code users choosing skills for development, research, documents, and automation workflows.',
    agentSurface: 'Claude Code',
    primaryKeyword: 'Claude Code skills',
    exampleTasks: [
      'Use Claude Code to inspect a repo and prepare implementation steps',
      'Compare document parsing skills before installing one',
      'Find a browser automation skill with clear maintenance signals',
    ],
  },
  {
    slug: 'openai-agent-skills',
    title: 'OpenAI agent skills list',
    shortTitle: 'OpenAI agent skills',
    eyebrow: 'OpenAI-style agents',
    description:
      'A practical list of reusable skills for OpenAI-style agent workflows, focused on installable open-source repositories, task fit, trust signals, and audit notes.',
    useCaseSlug: 'workflow-automation',
    searchIntent: 'Find reusable skills for OpenAI-style agents, including install commands, trust scores, audit notes, and alternatives.',
    audience: 'Builders creating OpenAI-style agent workflows that need reusable skills rather than one-off prompts.',
    agentSurface: 'AI agents',
    primaryKeyword: 'OpenAI agent skills list',
    exampleTasks: [
      'Find a skill for a tool-using AI agent',
      'Compare install safety before letting an agent run a repository',
      'Choose reusable skills for research, coding, and automation workflows',
    ],
  },
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
    slug: 'ppt-generation',
    title: 'Best AI agent skills for PPT generation',
    shortTitle: 'PPT generation',
    eyebrow: 'Presentation agents',
    description:
      'Ranked OpenAgentSkill shortlist for agents that generate PPTX decks, HTML slides, speaker notes, pitch decks, and editable presentation workflows from briefs, PDFs, URLs, and research notes.',
    useCaseSlug: 'presentation-generation',
    searchIntent: 'Find AI agent skills for PPT generation, slide decks, PowerPoint workflows, HTML slides, speaker notes, and pitch deck creation.',
    audience: 'Founders, analysts, marketers, designers, and builders creating presentation agents or deck automation workflows.',
    agentSurface: 'AI agents',
    primaryKeyword: 'best AI agent skills for PPT generation',
    exampleTasks: [
      'Generate a PowerPoint deck from a product brief',
      'Convert research notes into editable slides',
      'Create a pitch deck outline with speaker notes and visual direction',
    ],
  },
  {
    slug: 'codex-presentation-decks',
    title: 'Best Codex skills for presentation decks',
    shortTitle: 'Codex presentations',
    eyebrow: 'Codex deck workflows',
    description:
      'Ranked OpenAgentSkill shortlist for Codex users creating presentation decks, PPTX exports, HTML slides, and speaker-ready slide workflows from source material.',
    useCaseSlug: 'presentation-generation',
    searchIntent: 'Find Codex-ready skills for creating presentation decks, PPTX files, HTML slides, and pitch deck workflows.',
    audience: 'Codex users building deck generation, research presentation, product update, and pitch deck workflows.',
    agentSurface: 'Codex',
    primaryKeyword: 'best Codex skills for presentation decks',
    exampleTasks: [
      'Turn a document into a first-pass deck',
      'Generate HTML slides for a product update',
      'Compare PPT skills before installing one into a workflow',
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
  {
    slug: 'research-briefs',
    title: 'Best AI agent skills for research briefs',
    shortTitle: 'Research briefs',
    eyebrow: 'Research agents',
    description:
      'Ranked OpenAgentSkill shortlist for agents that gather sources, compare claims, summarize recent changes, and produce concise evidence-backed research briefs.',
    useCaseSlug: 'research-agents',
    searchIntent: 'Find AI agent skills for web research, source comparison, recent-event scanning, and evidence-backed briefing workflows.',
    audience: 'Builders creating research, competitive intelligence, market monitoring, and analyst-style briefing agents.',
    agentSurface: 'AI agents',
    primaryKeyword: 'best AI agent skills for research briefs',
    exampleTasks: [
      'Research a market and summarize the strongest sources',
      'Compare claims across web, Reddit, X, YouTube, and Hacker News',
      'Produce a grounded brief with links and risk notes',
    ],
  },
  {
    slug: 'marketing-seo-automation',
    title: 'Best AI agent skills for marketing and SEO automation',
    shortTitle: 'Marketing SEO',
    eyebrow: 'Growth agents',
    description:
      'Ranked OpenAgentSkill shortlist for agents that research keywords, analyze content gaps, prepare campaigns, clean CRM data, and automate repeatable growth workflows.',
    useCaseSlug: 'marketing-growth',
    searchIntent: 'Find AI agent skills for SEO research, keyword workflows, content operations, lead generation, web analytics, and marketing automation.',
    audience: 'Founders, growth teams, and builders creating marketing, SEO, lead-generation, and content operations agents.',
    agentSurface: 'AI agents',
    primaryKeyword: 'best AI agent skills for marketing automation',
    exampleTasks: [
      'Research SEO keywords for an agent product launch',
      'Analyze content gaps and turn them into article briefs',
      'Prepare a weekly growth report from web analytics and CRM exports',
    ],
  },
  {
    slug: 'security-review',
    title: 'Best AI agent skills for security review',
    shortTitle: 'Security review',
    eyebrow: 'Security agents',
    description:
      'Ranked OpenAgentSkill shortlist for agents that scan dependencies, review permissions, inspect secrets, summarize vulnerabilities, and prepare safe remediation steps.',
    useCaseSlug: 'security-compliance',
    searchIntent: 'Find AI agent skills for vulnerability scanning, secret review, dependency risk, security audit notes, and safe remediation workflows.',
    audience: 'Developers and security-minded teams that want agents to inspect repositories before running third-party code or shipping changes.',
    agentSurface: 'AI agents',
    primaryKeyword: 'best AI agent skills for security review',
    exampleTasks: [
      'Scan a repository for exposed secrets and risky dependencies',
      'Review an install command before allowing an agent to run it',
      'Summarize vulnerability findings with safe remediation steps',
    ],
  },
  {
    slug: 'legal-compliance-review',
    title: 'Best AI agent skills for legal and compliance review',
    shortTitle: 'Legal compliance',
    eyebrow: 'Compliance agents',
    description:
      'Ranked OpenAgentSkill shortlist for agents that review policies, summarize contracts, inspect privacy requirements, and prepare compliance notes with clear risk boundaries.',
    useCaseSlug: 'legal-compliance',
    searchIntent: 'Find AI agent skills for contract review, privacy policy analysis, compliance summaries, governance notes, and document risk review.',
    audience: 'Teams building legal operations, policy review, privacy, and compliance support agents.',
    agentSurface: 'AI agents',
    primaryKeyword: 'best AI agent skills for legal compliance review',
    exampleTasks: [
      'Summarize risky clauses in a contract',
      'Review a privacy policy for compliance obligations',
      'Prepare governance notes from legal or policy documents',
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
  ['ai-agent-skills-library', 'open-source-ai-agent-skills', 'codex-skills', 'claude-code-skills', 'openai-agent-skills', 'web-scraping', 'stock-analysis', 'codex-web-scraping', 'codex-finance-analysis', 'claude-code-pdf-parsing', 'sports-analytics', 'football-analytics', 'presentation-generation', 'ppt-generation', 'codex-presentation-decks', 'research-briefs', 'marketing-seo-automation', 'security-review', 'legal-compliance-review', 'coding-agents', 'browser-automation', 'rag-knowledge', 'data-analysis', 'github-automation']
    .includes(page.slug)
)

export function getBestSkillPage(slug: string) {
  return BEST_SKILL_PAGES.find((page) => page.slug === slug)
}
