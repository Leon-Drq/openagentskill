export interface SkillClusterDefinition {
  slug: string
  path: string
  metaTitle: string
  title: string
  eyebrow: string
  primaryKeyword: string
  description: string
  searchIntent: string
  useCaseSlug: string
  taskSlugs: string[]
  proof: Array<{
    label: string
    value: string
  }>
  agentUseCases: string[]
  evaluationSignals: string[]
  related: Array<{
    label: string
    href: string
  }>
  faq: Array<{
    question: string
    answer: string
  }>
}

function clusterPath(slug: string) {
  return `/ai-agent-skills/${slug}`
}

export const SKILL_CLUSTERS: SkillClusterDefinition[] = [
  {
    slug: 'web-scraping',
    path: clusterPath('web-scraping'),
    metaTitle: 'AI Agent Skills for Web Scraping | OpenAgentSkill',
    title: 'AI agent skills for web scraping.',
    eyebrow: 'Web scraping skills',
    primaryKeyword: 'AI agent skills for web scraping',
    description:
      'Find reusable crawler, browser automation, HTML-to-markdown, and structured extraction skills that agents can compare before scraping public websites.',
    searchIntent:
      'Builders searching for reliable web scraping skills, crawler skills, and browser automation skills for AI agents.',
    useCaseSlug: 'web-scraping',
    taskSlugs: ['scrape-pricing-pages', 'crawl-documentation-site', 'automate-browser-workflow'],
    proof: [
      { label: 'Workflow', value: 'Crawl' },
      { label: 'Output', value: 'Structured data' },
      { label: 'Safety', value: 'Review robots/ToS' },
      { label: 'Agent handoff', value: 'Install ready' },
    ],
    agentUseCases: [
      'Scrape public pricing pages into JSON or markdown',
      'Crawl documentation sites for RAG ingestion',
      'Monitor public web pages and extract changed fields',
      'Use browser automation when static HTML is not enough',
    ],
    evaluationSignals: [
      'Scope controls for crawl depth and allowed domains',
      'Clean markdown or structured output support',
      'Fresh maintenance and visible repository activity',
      'Clear install command and sandbox-friendly usage',
    ],
    related: [
      { label: 'Best web scraping skills', href: '/best/web-scraping' },
      { label: 'Web scraping use case', href: '/use-cases/web-scraping' },
      { label: 'Scrape pricing task', href: '/tasks/scrape-pricing-pages' },
      { label: 'Browser automation skills', href: '/ai-agent-skills/browser-automation' },
    ],
    faq: [
      {
        question: 'What is the best web scraping skill for an AI agent?',
        answer:
          'Start with skills that return clean markdown or structured data, expose crawl limits, and have strong maintenance signals. OpenAgentSkill ranks candidates by task fit, trust, quality, stars, and install readiness.',
      },
      {
        question: 'Can an agent use these skills automatically?',
        answer:
          'Yes. Agents can call the Resolve API with a scraping task, inspect the ranked shortlist, and fetch install handoffs before running anything.',
      },
    ],
  },
  {
    slug: 'coding-agents',
    path: clusterPath('coding-agents'),
    metaTitle: 'AI Agent Skills for Coding Agents | OpenAgentSkill',
    title: 'AI agent skills for coding agents.',
    eyebrow: 'Coding agent skills',
    primaryKeyword: 'AI agent skills for coding agents',
    description:
      'Compare reusable skills for repository analysis, pull-request review, CI debugging, issue triage, tests, and developer automation.',
    searchIntent:
      'Developers looking for reusable skills that make Codex, Claude Code, Cursor, and coding agents more capable.',
    useCaseSlug: 'coding-agents',
    taskSlugs: ['review-pull-requests', 'fix-ci-failures', 'triage-github-issues'],
    proof: [
      { label: 'Workflow', value: 'Codebase' },
      { label: 'Use case', value: 'Review + fix' },
      { label: 'Signal', value: 'Repo fit' },
      { label: 'Agent handoff', value: 'Prompt + CLI' },
    ],
    agentUseCases: [
      'Review pull requests and summarize risky diffs',
      'Inspect failing CI logs and suggest targeted fixes',
      'Triage GitHub issues with repository context',
      'Generate tests, changelogs, and migration plans',
    ],
    evaluationSignals: [
      'Works with local repository context',
      'Explains changes instead of making blind edits',
      'Includes verification or test guidance',
      'Fits Codex, Claude Code, Cursor, or GitHub workflows',
    ],
    related: [
      { label: 'Best coding agent skills', href: '/best/coding-agents' },
      { label: 'Codex skills', href: '/agents/codex' },
      { label: 'Claude Code skills', href: '/agents/claude-code' },
      { label: 'Review PR task', href: '/tasks/review-pull-requests' },
    ],
    faq: [
      {
        question: 'Which coding agent skills should I install first?',
        answer:
          'Start with a repository-aware review or CI debugging skill, then add specialized skills for tests, migrations, documentation, or release automation.',
      },
      {
        question: 'Is this only for one coding agent?',
        answer:
          'No. The registry is designed to route skills across Codex, Claude Code, Cursor, and other developer agent surfaces.',
      },
    ],
  },
  {
    slug: 'finance-quant',
    path: clusterPath('finance-quant'),
    metaTitle: 'Finance and Quant AI Agent Skills | OpenAgentSkill',
    title: 'Finance and quant skills for AI agents.',
    eyebrow: 'Finance agent skills',
    primaryKeyword: 'finance AI agent skills',
    description:
      'Find skills for market data, stock research, SEC filings, portfolio analysis, backtesting, risk, crypto, and quant workflows.',
    searchIntent:
      'Finance builders searching for agent skills that can support market research, quant analysis, and financial workflows.',
    useCaseSlug: 'finance-quant',
    taskSlugs: ['analyze-csv-data', 'summarize-research-sources'],
    proof: [
      { label: 'Vertical', value: 'Finance' },
      { label: 'Workflow', value: 'Analyze' },
      { label: 'Data', value: 'Market + filings' },
      { label: 'Safety', value: 'Review required' },
    ],
    agentUseCases: [
      'Summarize SEC filings and earnings materials',
      'Analyze stocks, portfolios, factors, and risk',
      'Backtest quant ideas with reproducible steps',
      'Build dashboards over financial and market data',
    ],
    evaluationSignals: [
      'Source attribution for financial claims',
      'Reproducible data loading and analysis steps',
      'Fresh repository activity and clear limitations',
      'Separation between analysis support and financial advice',
    ],
    related: [
      { label: 'Best finance skills', href: '/best/finance-quant' },
      { label: 'Finance use case', href: '/use-cases/finance-quant' },
      { label: 'Data analysis skills', href: '/ai-agent-skills/data-analysis' },
      { label: 'Research skills', href: '/use-cases/research-agents' },
    ],
    faq: [
      {
        question: 'Can these skills provide investment advice?',
        answer:
          'They should be treated as research and analysis tools, not regulated financial advice. Always review sources, assumptions, and outputs before acting.',
      },
      {
        question: 'What makes a finance skill high quality?',
        answer:
          'Strong candidates cite sources, handle data reproducibly, document limitations, and are maintained enough to be useful in current market workflows.',
      },
    ],
  },
  {
    slug: 'world-cup-football',
    path: clusterPath('world-cup-football'),
    metaTitle: 'World Cup Football Analytics Skills for AI Agents | OpenAgentSkill',
    title: 'World Cup football analytics skills for AI agents.',
    eyebrow: 'Sports analytics skills',
    primaryKeyword: 'World Cup football analytics skills for AI agents',
    description:
      'Discover football analytics skills for match prediction, xG, player scouting, team comparison, dashboards, and World Cup research workflows.',
    searchIntent:
      'Users looking for football, soccer, World Cup, match prediction, xG, and sports analytics skills for agents.',
    useCaseSlug: 'sports-analytics',
    taskSlugs: ['analyze-csv-data', 'summarize-research-sources'],
    proof: [
      { label: 'Vertical', value: 'Football' },
      { label: 'Signals', value: 'xG + events' },
      { label: 'Output', value: 'Dashboards' },
      { label: 'Timing', value: 'World Cup' },
    ],
    agentUseCases: [
      'Build World Cup dashboards from football data',
      'Compare teams, players, formations, and match events',
      'Generate match previews with data-backed signals',
      'Explore xG, scouting, tracking, and prediction workflows',
    ],
    evaluationSignals: [
      'Uses public datasets or documented sports data sources',
      'Supports repeatable analysis instead of pure prediction claims',
      'Can explain metrics such as xG, event data, and player comparisons',
      'Produces clear charts, tables, or summaries for non-technical readers',
    ],
    related: [
      { label: 'Best sports analytics skills', href: '/best/sports-analytics' },
      { label: 'Sports analytics use case', href: '/use-cases/sports-analytics' },
      { label: 'Data analysis skills', href: '/ai-agent-skills/data-analysis' },
      { label: 'Research summary task', href: '/tasks/summarize-research-sources' },
    ],
    faq: [
      {
        question: 'Can an AI agent predict World Cup matches with these skills?',
        answer:
          'Some skills can support prediction research, but the better use is evidence-backed analysis: load data, compare signals, explain uncertainty, and produce transparent previews.',
      },
      {
        question: 'Why include sports skills in OpenAgentSkill?',
        answer:
          'Sports analytics is a clear vertical workflow where agents need data ingestion, modeling, visualization, and narrative explanation skills.',
      },
    ],
  },
  {
    slug: 'rag-knowledge',
    path: clusterPath('rag-knowledge'),
    metaTitle: 'RAG and Knowledge Base AI Agent Skills | OpenAgentSkill',
    title: 'RAG and knowledge base skills for AI agents.',
    eyebrow: 'Knowledge skills',
    primaryKeyword: 'RAG AI agent skills',
    description:
      'Find skills for document ingestion, chunking, embeddings, retrieval, source citation, semantic search, and grounded agent answers.',
    searchIntent:
      'Builders searching for RAG, retrieval, knowledge base, embedding, and document ingestion skills for agents.',
    useCaseSlug: 'rag-knowledge',
    taskSlugs: ['build-rag-knowledge-base', 'crawl-documentation-site', 'convert-pdf-to-markdown'],
    proof: [
      { label: 'Workflow', value: 'Retrieve' },
      { label: 'Data', value: 'Docs' },
      { label: 'Output', value: 'Cited answers' },
      { label: 'Agent handoff', value: 'API-ready' },
    ],
    agentUseCases: [
      'Build a RAG knowledge base over product docs',
      'Crawl documentation and prepare searchable markdown',
      'Retrieve relevant source passages before answering',
      'Compare embedding, indexing, and retrieval options',
    ],
    evaluationSignals: [
      'Preserves source URLs and citation metadata',
      'Separates ingestion, retrieval, and generation steps',
      'Documents chunking and evaluation assumptions',
      'Can be tested against a known question set',
    ],
    related: [
      { label: 'Best RAG skills', href: '/best/rag-knowledge' },
      { label: 'Build RAG task', href: '/tasks/build-rag-knowledge-base' },
      { label: 'PDF extraction skills', href: '/ai-agent-skills/pdf-extraction' },
      { label: 'RAG use case', href: '/use-cases/rag-knowledge' },
    ],
    faq: [
      {
        question: 'What should an agent check before using a RAG skill?',
        answer:
          'Check source preservation, retrieval quality, chunking strategy, supported data stores, and whether the workflow can cite evidence.',
      },
      {
        question: 'Are RAG skills different from document parsing skills?',
        answer:
          'Yes. Document parsing prepares clean text or tables; RAG skills usually add indexing, retrieval, and source-grounded answer workflows.',
      },
    ],
  },
  {
    slug: 'pdf-extraction',
    path: clusterPath('pdf-extraction'),
    metaTitle: 'PDF Extraction Skills for AI Agents | OpenAgentSkill',
    title: 'PDF extraction skills for AI agents.',
    eyebrow: 'Document skills',
    primaryKeyword: 'PDF extraction skills for AI agents',
    description:
      'Compare skills for PDF parsing, OCR, table extraction, markdown conversion, document metadata, and agent-ready file processing.',
    searchIntent:
      'Users searching for AI agent skills that can parse PDFs, extract tables, and convert documents into usable context.',
    useCaseSlug: 'document-processing',
    taskSlugs: ['convert-pdf-to-markdown', 'build-rag-knowledge-base'],
    proof: [
      { label: 'Input', value: 'PDF' },
      { label: 'Output', value: 'Markdown' },
      { label: 'Support', value: 'OCR/table' },
      { label: 'Agent handoff', value: 'Extract' },
    ],
    agentUseCases: [
      'Convert PDFs into clean markdown for agents',
      'Extract tables and metadata from reports',
      'Prepare legal, finance, and research documents for review',
      'Use OCR fallback when scanned pages need text extraction',
    ],
    evaluationSignals: [
      'Handles layout, headings, and tables without destroying context',
      'Reports extraction limits and OCR uncertainty',
      'Supports batch or repeatable processing',
      'Documents privacy and local processing assumptions',
    ],
    related: [
      { label: 'Best document skills', href: '/best/document-processing' },
      { label: 'PDF to markdown task', href: '/tasks/convert-pdf-to-markdown' },
      { label: 'RAG skills', href: '/ai-agent-skills/rag-knowledge' },
      { label: 'Document use case', href: '/use-cases/document-processing' },
    ],
    faq: [
      {
        question: 'Which PDF skill should I choose first?',
        answer:
          'Choose a skill that supports your document type, preserves tables or headings, and makes extraction failures visible instead of silently guessing.',
      },
      {
        question: 'Can these skills handle scanned PDFs?',
        answer:
          'Some can, but scanned PDFs usually need OCR and human review for high-stakes documents.',
      },
    ],
  },
  {
    slug: 'browser-automation',
    path: clusterPath('browser-automation'),
    metaTitle: 'Browser Automation Skills for AI Agents | OpenAgentSkill',
    title: 'Browser automation skills for AI agents.',
    eyebrow: 'Browser agent skills',
    primaryKeyword: 'browser automation skills for AI agents',
    description:
      'Find skills for Playwright, browser-use, form flows, screenshots, UI verification, end-to-end tests, and web app operation.',
    searchIntent:
      'Builders looking for browser automation and Playwright-style skills that agents can use safely.',
    useCaseSlug: 'browser-automation',
    taskSlugs: ['automate-browser-workflow', 'scrape-pricing-pages'],
    proof: [
      { label: 'Surface', value: 'Browser' },
      { label: 'Use case', value: 'Forms + tests' },
      { label: 'Signal', value: 'Verified state' },
      { label: 'Safety', value: 'No blind clicks' },
    ],
    agentUseCases: [
      'Fill forms and verify the final browser state',
      'Run end-to-end UI checks before deployment',
      'Capture screenshots for visual review',
      'Interact with websites when an API is unavailable',
    ],
    evaluationSignals: [
      'Waits for actual page state instead of fixed sleeps',
      'Captures screenshots, DOM checks, or test evidence',
      'Avoids external side effects without approval',
      'Documents credential and session handling clearly',
    ],
    related: [
      { label: 'Best browser automation skills', href: '/best/browser-automation' },
      { label: 'Browser workflow task', href: '/tasks/automate-browser-workflow' },
      { label: 'Web scraping skills', href: '/ai-agent-skills/web-scraping' },
      { label: 'Testing skills', href: '/use-cases/testing-qa' },
    ],
    faq: [
      {
        question: 'When should an agent use browser automation?',
        answer:
          'Use browser automation when the task requires real UI state, logged-in context, screenshots, or form flows that are not available through an API.',
      },
      {
        question: 'What is the main risk?',
        answer:
          'The main risk is uncontrolled side effects. Good skills include confirmation gates, verification steps, and clear boundaries around account changes or purchases.',
      },
    ],
  },
  {
    slug: 'data-analysis',
    path: clusterPath('data-analysis'),
    metaTitle: 'Data Analysis Skills for AI Agents | OpenAgentSkill',
    title: 'Data analysis skills for AI agents.',
    eyebrow: 'Data agent skills',
    primaryKeyword: 'data analysis skills for AI agents',
    description:
      'Compare skills for CSV analysis, spreadsheet profiling, charts, metrics, business analysis, notebooks, and structured-data workflows.',
    searchIntent:
      'Users searching for agent skills that analyze CSVs, spreadsheets, datasets, charts, and metrics.',
    useCaseSlug: 'data-analysis',
    taskSlugs: ['analyze-csv-data'],
    proof: [
      { label: 'Input', value: 'CSV' },
      { label: 'Output', value: 'Insights' },
      { label: 'Workflow', value: 'Profile + chart' },
      { label: 'Review', value: 'Reproducible' },
    ],
    agentUseCases: [
      'Profile CSV files and explain suspicious columns',
      'Generate charts and plain-language metric summaries',
      'Validate spreadsheet outputs before sharing',
      'Turn raw data into a reproducible analysis plan',
    ],
    evaluationSignals: [
      'Produces reproducible steps and code where possible',
      'Flags missing data, outliers, and schema assumptions',
      'Uses readable charts and concise conclusions',
      'Keeps sensitive data handling explicit',
    ],
    related: [
      { label: 'Best data analysis skills', href: '/best/data-analysis' },
      { label: 'Analyze CSV task', href: '/tasks/analyze-csv-data' },
      { label: 'Finance skills', href: '/ai-agent-skills/finance-quant' },
      { label: 'Sports analytics skills', href: '/ai-agent-skills/world-cup-football' },
    ],
    faq: [
      {
        question: 'Can agents use these skills for spreadsheets?',
        answer:
          'Yes. Many data analysis skills support CSV or spreadsheet-style workflows, but sensitive business data should be handled with explicit approval.',
      },
      {
        question: 'What should a data analysis skill output?',
        answer:
          'A good skill should produce reproducible steps, data-quality notes, charts or tables when useful, and a concise explanation of the result.',
      },
    ],
  },
  {
    slug: 'github-automation',
    path: clusterPath('github-automation'),
    metaTitle: 'GitHub Automation Skills for AI Agents | OpenAgentSkill',
    title: 'GitHub automation skills for AI agents.',
    eyebrow: 'GitHub agent skills',
    primaryKeyword: 'GitHub automation skills for AI agents',
    description:
      'Find skills for issue triage, pull-request review, CI debugging, release notes, changelogs, repository summaries, and developer operations.',
    searchIntent:
      'Developers searching for reusable GitHub and repository automation skills for AI agents.',
    useCaseSlug: 'github-automation',
    taskSlugs: ['triage-github-issues', 'review-pull-requests', 'fix-ci-failures'],
    proof: [
      { label: 'Surface', value: 'GitHub' },
      { label: 'Workflow', value: 'PR + issues' },
      { label: 'Output', value: 'Review notes' },
      { label: 'Agent handoff', value: 'Repo-aware' },
    ],
    agentUseCases: [
      'Triage issues and identify duplicates',
      'Review pull requests with repository context',
      'Summarize releases, changelogs, and activity',
      'Debug GitHub Actions failures and propose fixes',
    ],
    evaluationSignals: [
      'Reads diffs and repository metadata safely',
      'Avoids mutating labels or comments without approval',
      'Explains confidence and missing context',
      'Includes verification steps for proposed code changes',
    ],
    related: [
      { label: 'Best GitHub automation skills', href: '/best/github-automation' },
      { label: 'GitHub issue task', href: '/tasks/triage-github-issues' },
      { label: 'Coding agent skills', href: '/ai-agent-skills/coding-agents' },
      { label: 'Codex skills', href: '/agents/codex' },
    ],
    faq: [
      {
        question: 'Can an agent comment on issues automatically?',
        answer:
          'The safer default is draft-first automation: generate labels, summaries, or replies, then require human approval before posting externally.',
      },
      {
        question: 'What makes GitHub automation useful?',
        answer:
          'Useful skills connect repository context, diffs, issues, CI logs, and changelog output into one repeatable workflow.',
      },
    ],
  },
  {
    slug: 'security-compliance',
    path: clusterPath('security-compliance'),
    metaTitle: 'Security and Compliance Skills for AI Agents | OpenAgentSkill',
    title: 'Security and compliance skills for AI agents.',
    eyebrow: 'Security agent skills',
    primaryKeyword: 'security skills for AI agents',
    description:
      'Compare skills for vulnerability scanning, secret detection, dependency review, policy checks, audit notes, and security-aware workflows.',
    searchIntent:
      'Teams looking for AI agent skills that can help scan projects, summarize risks, and prepare reviewable remediation steps.',
    useCaseSlug: 'security-compliance',
    taskSlugs: ['scan-security-risks', 'review-pull-requests'],
    proof: [
      { label: 'Workflow', value: 'Scan' },
      { label: 'Output', value: 'Risk notes' },
      { label: 'Review', value: 'Human gate' },
      { label: 'Safety', value: 'No formal audit' },
    ],
    agentUseCases: [
      'Scan repositories for common risky patterns',
      'Summarize dependency and secret scanning results',
      'Prepare remediation steps for maintainers',
      'Add policy-aware checks before installing third-party skills',
    ],
    evaluationSignals: [
      'Distinguishes confirmed issues from warnings',
      'Documents scanner scope and false-positive behavior',
      'Does not expose secrets in output',
      'Encourages review before high-stakes compliance decisions',
    ],
    related: [
      { label: 'Best security skills', href: '/best/security-compliance' },
      { label: 'Security scan task', href: '/tasks/scan-security-risks' },
      { label: 'Audits', href: '/audits' },
      { label: 'Coding agent skills', href: '/ai-agent-skills/coding-agents' },
    ],
    faq: [
      {
        question: 'Can these replace a formal security audit?',
        answer:
          'No. They help agents collect signals and summarize risks, but formal audits need qualified human review and organization-specific controls.',
      },
      {
        question: 'How should agents report security findings?',
        answer:
          'They should prioritize confirmed risks, avoid leaking sensitive data, and include clear remediation steps with confidence levels.',
      },
    ],
  },
  {
    slug: 'customer-support',
    path: clusterPath('customer-support'),
    metaTitle: 'Customer Support Skills for AI Agents | OpenAgentSkill',
    title: 'Customer support skills for AI agents.',
    eyebrow: 'Support agent skills',
    primaryKeyword: 'customer support skills for AI agents',
    description:
      'Find skills for ticket triage, helpdesk summaries, CRM notes, knowledge lookup, support reply drafts, and escalation workflows.',
    searchIntent:
      'Support and SaaS teams searching for reusable skills that help agents handle customer workflows.',
    useCaseSlug: 'customer-support',
    taskSlugs: ['build-rag-knowledge-base', 'summarize-research-sources'],
    proof: [
      { label: 'Workflow', value: 'Triage' },
      { label: 'Data', value: 'Tickets + KB' },
      { label: 'Output', value: 'Draft replies' },
      { label: 'Review', value: 'Human send' },
    ],
    agentUseCases: [
      'Classify support tickets and summarize urgency',
      'Look up product knowledge before drafting replies',
      'Prepare CRM notes after customer conversations',
      'Escalate risky or high-value requests with context',
    ],
    evaluationSignals: [
      'Keeps private customer data handling explicit',
      'Separates draft replies from external sending',
      'Uses product knowledge or source citations',
      'Supports labels, priority, and escalation fields',
    ],
    related: [
      { label: 'Best customer support skills', href: '/best/customer-support' },
      { label: 'Customer support use case', href: '/use-cases/customer-support' },
      { label: 'RAG skills', href: '/ai-agent-skills/rag-knowledge' },
      { label: 'Content automation skills', href: '/ai-agent-skills/seo-content' },
    ],
    faq: [
      {
        question: 'Should support agents send replies automatically?',
        answer:
          'A review-first workflow is safer. Let agents draft and cite context, then require a human or policy gate before external replies.',
      },
      {
        question: 'What does a support skill need to know?',
        answer:
          'It should know the ticket context, relevant product knowledge, escalation rules, privacy boundaries, and preferred response style.',
      },
    ],
  },
  {
    slug: 'seo-content',
    path: clusterPath('seo-content'),
    metaTitle: 'SEO Content Skills for AI Agents | OpenAgentSkill',
    title: 'SEO content skills for AI agents.',
    eyebrow: 'Content agent skills',
    primaryKeyword: 'SEO content skills for AI agents',
    description:
      'Find skills for source-based SEO drafts, launch notes, content repurposing, markdown writing, social posts, and publishing workflows.',
    searchIntent:
      'Creators and founders searching for agent skills that turn research and product updates into useful content.',
    useCaseSlug: 'content-automation',
    taskSlugs: ['generate-seo-content', 'summarize-research-sources'],
    proof: [
      { label: 'Workflow', value: 'Draft' },
      { label: 'Input', value: 'Sources' },
      { label: 'Output', value: 'Markdown' },
      { label: 'Quality', value: 'No filler' },
    ],
    agentUseCases: [
      'Turn product updates into search-oriented drafts',
      'Repurpose research into blog posts, X threads, and guides',
      'Create markdown outlines with cited source context',
      'Generate social copy for newly indexed skills',
    ],
    evaluationSignals: [
      'Uses source material instead of generic claims',
      'Keeps title, URL, meta description, and structure explicit',
      'Fits the product voice and channel constraints',
      'Avoids unsupported claims and keyword stuffing',
    ],
    related: [
      { label: 'Best content automation skills', href: '/best/content-automation' },
      { label: 'SEO content task', href: '/tasks/generate-seo-content' },
      { label: 'X growth kit', href: '/x-kit' },
      { label: 'Research skills', href: '/use-cases/research-agents' },
    ],
    faq: [
      {
        question: 'Can AI agents write SEO content that ranks?',
        answer:
          'They can help produce useful drafts, but ranking depends on original value, links, distribution, crawlability, and whether the page satisfies a real search intent.',
      },
      {
        question: 'What should agents avoid?',
        answer:
          'Avoid generic filler, unsupported claims, copied text, keyword stuffing, and content that does not help a specific reader finish a job.',
      },
    ],
  },
]

export const FEATURED_SKILL_CLUSTERS = SKILL_CLUSTERS.filter((cluster) =>
  ['web-scraping', 'coding-agents', 'finance-quant', 'world-cup-football', 'rag-knowledge', 'browser-automation'].includes(cluster.slug)
)

export function getSkillCluster(slug: string) {
  return SKILL_CLUSTERS.find((cluster) => cluster.slug === slug)
}
