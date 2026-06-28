import type { SkillRecord } from '@/lib/db/skills'

export interface UseCaseDefinition {
  slug: string
  shortTitle: string
  title: string
  eyebrow: string
  description: string
  heroPrompt: string
  keywords: string[]
  featuredSlugs?: string[]
  workflows: string[]
  agentTasks: string[]
}

export const USE_CASES: UseCaseDefinition[] = [
  {
    slug: 'web-scraping',
    shortTitle: 'Web scraping',
    title: 'Web scraping and data extraction skills',
    eyebrow: 'Collect structured data',
    description:
      'Find skills for crawling websites, extracting structured data, monitoring pages, and turning messy web content into agent-ready inputs.',
    heroPrompt: 'I need my agent to scrape websites and extract structured data from pages.',
    keywords: ['crawl', 'crawler', 'scrape', 'scraper', 'web scraping', 'extract', 'browser', 'html', 'firecrawl', 'playwright'],
    workflows: ['Extract product data from websites', 'Monitor competitor pages', 'Turn HTML into clean markdown', 'Feed crawled content into RAG'],
    agentTasks: ['Crawl target URLs', 'Extract tables and metadata', 'Normalize messy page content'],
  },
  {
    slug: 'coding-agents',
    shortTitle: 'Coding agents',
    title: 'Coding agent and developer workflow skills',
    eyebrow: 'Build and ship code',
    description:
      'Discover skills for code generation, repository analysis, pull-request review, testing, debugging, and agentic software engineering.',
    heroPrompt: 'I need a coding agent that can understand a repository, edit code, and review pull requests.',
    keywords: ['code', 'coding', 'developer', 'devtools', 'github', 'pull request', 'review', 'repository', 'testing', 'debug'],
    workflows: ['Analyze a codebase', 'Review a pull request', 'Generate tests', 'Automate release notes'],
    agentTasks: ['Inspect source files', 'Explain architecture', 'Patch bugs and verify changes'],
  },
  {
    slug: 'rag-knowledge',
    shortTitle: 'RAG and knowledge',
    title: 'RAG and knowledge workflow skills',
    eyebrow: 'Search private knowledge',
    description:
      'Use these skills to ingest documents, index knowledge, retrieve relevant context, and make agents better at answering with grounded sources.',
    heroPrompt: 'I need my agent to build a RAG workflow over documents and retrieve reliable context.',
    keywords: ['rag', 'retrieval', 'embedding', 'vector', 'knowledge', 'document', 'pdf', 'search', 'semantic', 'llamaindex'],
    workflows: ['Index documents', 'Search a knowledge base', 'Summarize source material', 'Ground answers in retrieved context'],
    agentTasks: ['Chunk documents', 'Create embeddings', 'Retrieve and cite relevant passages'],
  },
  {
    slug: 'browser-automation',
    shortTitle: 'Browser automation',
    title: 'Browser automation skills for AI agents',
    eyebrow: 'Operate web apps',
    description:
      'Find skills that help agents click through websites, fill forms, test user flows, verify UI state, and interact with browser-based tools.',
    heroPrompt: 'I need my agent to control a browser, fill forms, and verify web app workflows.',
    keywords: ['browser', 'playwright', 'puppeteer', 'selenium', 'automation', 'form', 'ui', 'web automation', 'e2e', 'test'],
    workflows: ['Fill forms', 'Verify checkout or signup flows', 'Take screenshots', 'Run end-to-end web tests'],
    agentTasks: ['Navigate pages', 'Click and type safely', 'Check visual and DOM state'],
  },
  {
    slug: 'research-agents',
    shortTitle: 'Research agents',
    title: 'Research and analysis skills for agents',
    eyebrow: 'Investigate faster',
    description:
      'Browse skills for market research, web research, summarization, source comparison, report writing, and evidence-backed analysis.',
    heroPrompt: 'I need my agent to research a topic, compare sources, and produce a concise report.',
    keywords: ['research', 'analysis', 'summarize', 'summary', 'report', 'search', 'market', 'news', 'source', 'compare'],
    workflows: ['Research a market', 'Compare multiple sources', 'Summarize long content', 'Draft evidence-backed reports'],
    agentTasks: ['Search sources', 'Extract claims', 'Synthesize findings'],
  },
  {
    slug: 'workflow-automation',
    shortTitle: 'Workflow automation',
    title: 'Workflow automation and productivity skills',
    eyebrow: 'Automate repeated work',
    description:
      'Find skills for connecting tools, automating operational tasks, scheduling jobs, processing files, and reducing repetitive manual work.',
    heroPrompt: 'I need my agent to automate a repeated workflow across tools and files.',
    keywords: ['automation', 'workflow', 'productivity', 'integration', 'schedule', 'task', 'file', 'csv', 'email', 'spreadsheet'],
    workflows: ['Process recurring files', 'Connect everyday tools', 'Schedule repeated tasks', 'Generate operational summaries'],
    agentTasks: ['Move data between tools', 'Transform files', 'Trigger repeatable actions'],
  },
  {
    slug: 'document-processing',
    shortTitle: 'Document processing',
    title: 'Document processing and PDF extraction skills',
    eyebrow: 'Parse messy files',
    description:
      'Find skills for parsing PDFs, extracting tables, running OCR, converting documents, and preparing file content for agent workflows.',
    heroPrompt: 'I need my agent to read PDFs, extract tables, and turn documents into structured data.',
    keywords: ['document', 'documents', 'pdf', 'ocr', 'parser', 'parse', 'extract', 'table', 'docx', 'markdown'],
    workflows: ['Extract tables from PDFs', 'Convert files to markdown', 'Run OCR over scans', 'Normalize document metadata'],
    agentTasks: ['Read uploaded files', 'Extract structured fields', 'Prepare clean context for downstream agents'],
  },
  {
    slug: 'data-analysis',
    shortTitle: 'Data analysis',
    title: 'Data analysis and spreadsheet skills for agents',
    eyebrow: 'Analyze datasets',
    description:
      'Discover skills for inspecting CSVs, summarizing datasets, creating charts, validating metrics, and helping agents reason over structured data.',
    heroPrompt: 'I need my agent to analyze CSV data, produce insights, and explain trends.',
    keywords: ['data analysis', 'analytics', 'csv', 'spreadsheet', 'chart', 'visualization', 'pandas', 'notebook', 'metric'],
    workflows: ['Profile a dataset', 'Generate charts', 'Explain business metrics', 'Validate spreadsheet outputs'],
    agentTasks: ['Load tabular data', 'Calculate trends', 'Summarize findings clearly'],
  },
  {
    slug: 'finance-quant',
    shortTitle: 'Finance and quant',
    title: 'Finance, quant, and market analysis skills for agents',
    eyebrow: 'Analyze markets',
    description:
      'Find skills for financial research, market data, quant backtesting, portfolio analysis, SEC filings, trading research, and investor workflows.',
    heroPrompt: 'I need my agent to analyze markets, financial data, filings, portfolios, and quant strategies.',
    keywords: [
      'finance',
      'financial',
      'quant',
      'trading',
      'portfolio',
      'market',
      'stocks',
      'equity',
      'crypto',
      'backtest',
      'backtesting',
      'sec filing',
      'filings',
      'edgar',
      '10-k',
      '10-q',
      'fundamental',
      'technical analysis',
      'risk',
      'alpha',
      'factor',
    ],
    workflows: ['Analyze public companies', 'Backtest quant strategies', 'Track portfolios and risk', 'Summarize filings and market data'],
    agentTasks: ['Retrieve market data', 'Compare financial signals', 'Generate investor-ready analysis'],
  },
  {
    slug: 'sports-analytics',
    shortTitle: 'Sports analytics',
    title: 'Sports, football, and World Cup analytics skills for agents',
    eyebrow: 'Analyze matches',
    description:
      'Discover skills for football data, World Cup analysis, match prediction, xG, player scouting, video tracking, dashboards, and sports research agents.',
    heroPrompt: 'I need my agent to analyze football matches, World Cup data, xG, players, teams, and predictions.',
    keywords: [
      'sports',
      'football',
      'soccer',
      'world cup',
      'fifa',
      'match',
      'matches',
      'player',
      'team',
      'statsbomb',
      'xg',
      'expected goals',
      'soccernet',
      'tracking',
      'scouting',
      'prediction',
      'fantasy football',
      'transfermarkt',
    ],
    workflows: ['Build World Cup dashboards', 'Analyze xG and match events', 'Scout players and teams', 'Generate prediction research'],
    agentTasks: ['Load football datasets', 'Compare teams and players', 'Explain match and tournament signals'],
  },
  {
    slug: 'github-automation',
    shortTitle: 'GitHub automation',
    title: 'GitHub automation skills for agent workflows',
    eyebrow: 'Manage repositories',
    description:
      'Browse skills for pull requests, issues, repository triage, changelog generation, release notes, and developer workflow automation.',
    heroPrompt: 'I need my agent to triage GitHub issues, review pull requests, and summarize repository changes.',
    keywords: ['github', 'git', 'pull request', 'issue', 'repository', 'changelog', 'release', 'ci', 'actions', 'review'],
    workflows: ['Triage issues', 'Review pull requests', 'Generate changelogs', 'Summarize repository activity'],
    agentTasks: ['Inspect repository metadata', 'Compare code changes', 'Write concise engineering summaries'],
  },
  {
    slug: 'testing-qa',
    shortTitle: 'Testing and QA',
    title: 'Testing and QA skills for AI agents',
    eyebrow: 'Verify behavior',
    description:
      'Find skills that help agents generate tests, run browser checks, inspect failures, validate APIs, and keep product flows reliable.',
    heroPrompt: 'I need my agent to test a web app, reproduce bugs, and verify fixes.',
    keywords: ['test', 'testing', 'qa', 'e2e', 'playwright', 'puppeteer', 'selenium', 'browser', 'ci', 'bug'],
    workflows: ['Generate regression tests', 'Verify user flows', 'Debug failing checks', 'Validate API responses'],
    agentTasks: ['Run test suites', 'Capture failures', 'Report what changed after a fix'],
  },
  {
    slug: 'content-automation',
    shortTitle: 'Content automation',
    title: 'Content automation skills for agent publishing',
    eyebrow: 'Publish consistently',
    description:
      'Use these skills for drafting posts, repurposing research, preparing markdown, generating summaries, and supporting repeatable content workflows.',
    heroPrompt: 'I need my agent to turn research and product updates into useful content drafts.',
    keywords: ['content', 'copywriting', 'writing', 'blog', 'markdown', 'summary', 'summarize', 'social', 'newsletter'],
    workflows: ['Draft launch notes', 'Repurpose research into posts', 'Generate newsletters', 'Prepare social copy'],
    agentTasks: ['Summarize source material', 'Adapt tone for channels', 'Create reusable publishing drafts'],
  },
  {
    slug: 'marketing-growth',
    shortTitle: 'Marketing and growth',
    title: 'Marketing, SEO, and growth automation skills',
    eyebrow: 'Grow distribution',
    description:
      'Discover skills for SEO research, keyword workflows, content operations, web analytics, lead generation, CRM cleanup, and repeatable growth automation.',
    heroPrompt: 'I need my agent to research keywords, improve SEO, analyze growth channels, and prepare marketing workflows.',
    keywords: ['marketing', 'seo', 'keyword', 'growth', 'analytics', 'crm', 'lead generation', 'email automation', 'content marketing'],
    workflows: ['Research SEO keywords', 'Analyze growth channels', 'Prepare lead lists', 'Automate marketing ops'],
    agentTasks: ['Collect channel signals', 'Prioritize opportunities', 'Draft structured campaign assets'],
  },
  {
    slug: 'design-creative',
    shortTitle: 'Design and creative',
    title: 'Design and creative production skills for agents',
    eyebrow: 'Create assets',
    description:
      'Find skills for design systems, Figma workflows, UI generation, presentations, image and video production, and creative automation.',
    heroPrompt: 'I need my agent to produce design assets, UI directions, presentations, or creative media workflows.',
    keywords: ['design', 'figma', 'ui generation', 'ux', 'presentation', 'creative', 'image generation', 'video generation', 'design system'],
    workflows: ['Prepare design assets', 'Generate UI directions', 'Build presentation materials', 'Automate creative production'],
    agentTasks: ['Inspect visual requirements', 'Generate reusable assets', 'Package output for review'],
  },
  {
    slug: 'presentation-generation',
    shortTitle: 'Presentation generation',
    title: 'Presentation and slide deck skills for AI agents',
    eyebrow: 'Create decks',
    description:
      'Find skills for turning briefs, PDFs, URLs, research notes, and product updates into editable PPTX decks, HTML slides, visual stories, and speaker-ready presentation assets.',
    heroPrompt:
      'I need my agent to create a polished presentation deck from a brief, document, URL, or research notes, preferably with editable PPTX or HTML slides.',
    keywords: [
      'presentation',
      'presentations',
      'ppt',
      'pptx',
      'powerpoint',
      'slides',
      'slide deck',
      'deck',
      'pitch deck',
      'html slides',
      'speaker notes',
      'keynote',
      'visual story',
      'research presentation',
      'product update deck',
      'notebooklm',
    ],
    featuredSlugs: [
      'hugohe3-ppt-master',
      'zarazhangrui-frontend-slides',
      'alchaincyf-huashu-design',
      'op7418-guizang-ppt-skill',
      'lewislulu-html-ppt-skill',
      'jimliu-baoyu-skills',
      'joeseesun-qiaomu-anything-to-notebooklm',
    ],
    workflows: ['Create PPTX from a brief', 'Turn research into slides', 'Generate HTML decks', 'Prepare speaker notes'],
    agentTasks: ['Choose the right deck format', 'Generate editable slide structure', 'Check visual and license risk'],
  },
  {
    slug: 'security-compliance',
    shortTitle: 'Security and compliance',
    title: 'Security and compliance skills for agents',
    eyebrow: 'Reduce risk',
    description:
      'Explore skills for vulnerability checks, secret scanning, dependency review, policy validation, and security-aware automation.',
    heroPrompt: 'I need my agent to scan a project for security risks and summarize what needs attention.',
    keywords: ['security', 'vulnerability', 'scanner', 'secret', 'compliance', 'policy', 'dependency', 'sast', 'audit'],
    workflows: ['Scan dependencies', 'Find exposed secrets', 'Review security findings', 'Prepare audit notes'],
    agentTasks: ['Inspect risky files', 'Prioritize findings', 'Explain remediation steps'],
  },
  {
    slug: 'legal-compliance',
    shortTitle: 'Legal and compliance',
    title: 'Legal, policy, and compliance review skills',
    eyebrow: 'Review risk',
    description:
      'Browse skills for contract analysis, policy review, privacy checks, compliance workflows, governance notes, and document risk review.',
    heroPrompt: 'I need my agent to review contracts, privacy policies, or compliance documents and summarize risks.',
    keywords: ['legal', 'contract', 'policy', 'privacy', 'gdpr', 'compliance', 'governance', 'terms', 'risk review'],
    workflows: ['Review contracts', 'Summarize policy risk', 'Check privacy requirements', 'Prepare compliance notes'],
    agentTasks: ['Extract obligations', 'Highlight risky clauses', 'Prepare review-ready summaries'],
  },
  {
    slug: 'education-tutoring',
    shortTitle: 'Education and tutoring',
    title: 'Education, tutoring, and learning workflow skills',
    eyebrow: 'Teach better',
    description:
      'Find skills for tutoring, course generation, quiz creation, learning analytics, classroom automation, and structured study workflows.',
    heroPrompt: 'I need my agent to teach a topic, generate course material, create quizzes, or analyze learning progress.',
    keywords: ['education', 'tutoring', 'teaching', 'course generation', 'quiz generation', 'learning analytics', 'classroom', 'student'],
    workflows: ['Generate lessons', 'Create quizzes', 'Tutor step by step', 'Analyze learning progress'],
    agentTasks: ['Break down concepts', 'Create practice material', 'Adapt explanations to the learner'],
  },
  {
    slug: 'database-sql',
    shortTitle: 'Database and SQL',
    title: 'Database and SQL skills for AI agents',
    eyebrow: 'Work with data stores',
    description:
      'Find skills for SQL generation, database inspection, migration review, query optimization, and agent workflows around persistent data.',
    heroPrompt: 'I need my agent to inspect database schemas, write SQL, and explain query results.',
    keywords: ['database', 'sql', 'postgres', 'mysql', 'sqlite', 'schema', 'query', 'migration', 'analytics'],
    workflows: ['Inspect schemas', 'Generate SQL', 'Review migrations', 'Summarize query results'],
    agentTasks: ['Understand table relationships', 'Write safer queries', 'Explain database changes'],
  },
  {
    slug: 'multimodal-media',
    shortTitle: 'Multimodal media',
    title: 'Multimodal media skills for AI agents',
    eyebrow: 'Process rich media',
    description:
      'Browse skills for image, video, audio, transcription, metadata extraction, and multimodal content workflows.',
    heroPrompt: 'I need my agent to process images, video, or audio and extract useful information.',
    keywords: ['image', 'video', 'audio', 'transcription', 'vision', 'multimodal', 'media', 'metadata', 'ocr'],
    workflows: ['Transcribe audio', 'Extract video metadata', 'Summarize images', 'Prepare media for search'],
    agentTasks: ['Read media metadata', 'Convert formats', 'Summarize visual or audio content'],
  },
  {
    slug: 'customer-support',
    shortTitle: 'Customer support',
    title: 'Customer support skills for AI agents',
    eyebrow: 'Answer users',
    description:
      'Find skills for ticket triage, support summarization, knowledge lookup, CRM updates, and response drafting.',
    heroPrompt: 'I need my agent to triage support requests and draft useful replies from product knowledge.',
    keywords: ['support', 'ticket', 'customer', 'crm', 'helpdesk', 'zendesk', 'intercom', 'email', 'knowledge'],
    workflows: ['Classify tickets', 'Draft support replies', 'Update CRM notes', 'Escalate urgent requests'],
    agentTasks: ['Read user messages', 'Find relevant knowledge', 'Prepare clear next steps'],
  },
  {
    slug: 'sales-crm',
    shortTitle: 'Sales and CRM',
    title: 'Sales and CRM automation skills for agents',
    eyebrow: 'Manage pipeline work',
    description:
      'Discover skills for lead enrichment, CRM cleanup, outreach preparation, meeting summaries, and sales operations automation.',
    heroPrompt: 'I need my agent to enrich leads, update CRM records, and prepare sales follow-ups.',
    keywords: ['sales', 'crm', 'lead', 'pipeline', 'outreach', 'prospect', 'meeting', 'email', 'hubspot', 'salesforce'],
    workflows: ['Enrich leads', 'Clean CRM records', 'Draft follow-ups', 'Summarize sales calls'],
    agentTasks: ['Research accounts', 'Extract contact details', 'Write structured CRM updates'],
  },
  {
    slug: 'email-calendar',
    shortTitle: 'Email and calendar',
    title: 'Email and calendar automation skills for agents',
    eyebrow: 'Coordinate work',
    description:
      'Find skills that help agents summarize inboxes, draft replies, schedule meetings, prepare agendas, and manage follow-ups.',
    heroPrompt: 'I need my agent to summarize email, draft replies, and prepare calendar follow-ups.',
    keywords: ['email', 'calendar', 'meeting', 'gmail', 'outlook', 'schedule', 'agenda', 'follow-up', 'inbox'],
    workflows: ['Summarize inboxes', 'Draft replies', 'Prepare meeting agendas', 'Track follow-ups'],
    agentTasks: ['Extract action items', 'Coordinate time-sensitive tasks', 'Write concise replies'],
  },
  {
    slug: 'local-desktop',
    shortTitle: 'Local desktop',
    title: 'Local desktop and computer-use skills',
    eyebrow: 'Operate local tools',
    description:
      'Browse skills for computer-use agents, desktop automation, file operations, local app control, and cross-application workflows.',
    heroPrompt: 'I need my agent to operate local files and desktop apps in a repeatable workflow.',
    keywords: ['computer use', 'desktop', 'local', 'file', 'filesystem', 'automation', 'gui', 'app', 'terminal'],
    workflows: ['Process local folders', 'Operate desktop apps', 'Automate GUI steps', 'Coordinate files across tools'],
    agentTasks: ['Navigate local resources', 'Run repeatable desktop actions', 'Verify file outputs'],
  },
]

export function getUseCaseBySlug(slug: string) {
  return USE_CASES.find((useCase) => useCase.slug === slug)
}

function searchableSkillText(skill: SkillRecord) {
  return [
    skill.name,
    skill.description,
    skill.long_description,
    skill.tagline,
    skill.category,
    skill.github_repo,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function scoreSkillForUseCase(skill: SkillRecord, useCase: UseCaseDefinition) {
  const text = searchableSkillText(skill)
  let score = 0

  if (useCase.featuredSlugs?.includes(skill.slug)) score += 90

  for (const keyword of useCase.keywords) {
    const normalized = keyword.toLowerCase()
    if (text.includes(normalized)) score += normalized.includes(' ') ? 5 : 3
  }

  if (skill.verified) score += 2
  score += Math.min(10, Math.log10(Math.max(1, skill.github_stars)) * 2)
  score += Math.min(6, Number(skill.quality_score || 0) / 20)

  return score
}

export function selectSkillsForUseCase(skills: SkillRecord[], useCase: UseCaseDefinition, limit = 12) {
  const scored = skills
    .map((skill) => ({ skill, score: scoreSkillForUseCase(skill, useCase) }))
    .filter((item) => item.score >= 6)
    .sort((a, b) => b.score - a.score || b.skill.github_stars - a.skill.github_stars)

  return scored.slice(0, limit).map((item) => item.skill)
}

export function getUseCasesForSkill(skill: SkillRecord, limit = 3) {
  return USE_CASES
    .map((useCase) => ({ useCase, score: scoreSkillForUseCase(skill, useCase) }))
    .filter((item) => item.score >= 6)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.useCase)
}
