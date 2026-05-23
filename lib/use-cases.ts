import type { SkillRecord } from '@/lib/db/skills'

export interface UseCaseDefinition {
  slug: string
  shortTitle: string
  title: string
  eyebrow: string
  description: string
  heroPrompt: string
  keywords: string[]
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
