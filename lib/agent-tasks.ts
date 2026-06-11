import type { SkillRecord } from '@/lib/db/skills'
import { dedupeRankedSkills, rankSkillsForQuery } from '@/lib/registry'
import { getUseCaseBySlug, scoreSkillForUseCase } from '@/lib/use-cases'

export interface AgentTaskDefinition {
  slug: string
  title: string
  shortTitle: string
  useCaseSlug: string
  intent: string
  description: string
  agentPrompt: string
  keywords: string[]
  successCriteria: string[]
  avoidWhen: string[]
}

export const AGENT_TASKS: AgentTaskDefinition[] = [
  {
    slug: 'scrape-pricing-pages',
    title: 'Scrape competitor pricing pages',
    shortTitle: 'Scrape pricing pages',
    useCaseSlug: 'web-scraping',
    intent: 'Extract pricing data from public competitor pages and turn it into clean structured output.',
    description:
      'Find skills for crawling public pricing pages, extracting plan names, prices, feature tables, and producing markdown or JSON for downstream analysis.',
    agentPrompt:
      'Find the best skill for scraping public competitor pricing pages, extracting structured pricing tables, and returning clean markdown or JSON.',
    keywords: ['scrape pricing', 'pricing pages', 'competitor pricing', 'web scraping', 'crawl', 'extract tables'],
    successCriteria: ['Returns structured pricing fields', 'Handles ordinary public webpages', 'Can be tested against a sample URL'],
    avoidWhen: ['The site requires login or payment', 'Robots or terms prohibit automated crawling', 'The task needs human-only judgment'],
  },
  {
    slug: 'crawl-documentation-site',
    title: 'Crawl a documentation site',
    shortTitle: 'Crawl docs',
    useCaseSlug: 'web-scraping',
    intent: 'Turn documentation pages into clean markdown or records that an agent can search and reuse.',
    description:
      'Find skills for crawling docs, converting HTML to markdown, preserving links, and preparing agent-ready source material.',
    agentPrompt:
      'Find the best skill for crawling a documentation website and converting pages into clean markdown with useful metadata.',
    keywords: ['crawl docs', 'documentation crawler', 'website to markdown', 'html markdown', 'knowledge ingestion'],
    successCriteria: ['Preserves source URLs', 'Produces clean markdown', 'Can limit crawl scope'],
    avoidWhen: ['Docs block crawling', 'The content is private without authorization', 'You need pixel-perfect browser state'],
  },
  {
    slug: 'review-pull-requests',
    title: 'Review pull requests',
    shortTitle: 'Review PRs',
    useCaseSlug: 'coding-agents',
    intent: 'Help a coding agent inspect diffs, summarize risk, and suggest targeted review comments.',
    description:
      'Find skills for repository inspection, code review, diff analysis, CI context, and practical pull-request feedback.',
    agentPrompt:
      'Find the best skill for reviewing pull requests, summarizing risky changes, and suggesting concise code review comments.',
    keywords: ['review pull request', 'pr review', 'github diff', 'code review', 'repository analysis'],
    successCriteria: ['Reads changed files', 'Explains risky changes', 'Produces actionable comments'],
    avoidWhen: ['The repository is unavailable locally', 'Secrets or private code cannot be shared', 'The change requires domain expertise only a maintainer has'],
  },
  {
    slug: 'fix-ci-failures',
    title: 'Fix CI failures',
    shortTitle: 'Fix CI',
    useCaseSlug: 'testing-qa',
    intent: 'Debug failing checks, inspect logs, patch likely causes, and verify the fix.',
    description:
      'Find skills for GitHub Actions logs, test failures, browser checks, and repeatable validation workflows.',
    agentPrompt:
      'Find the best skill for diagnosing CI failures, reading check logs, proposing a fix, and verifying the change.',
    keywords: ['fix ci', 'github actions', 'failing checks', 'test failure', 'debug ci'],
    successCriteria: ['Identifies failing command', 'Links failure to code path', 'Provides verification steps'],
    avoidWhen: ['CI logs are inaccessible', 'The failure depends on external credentials', 'The fix would require production access'],
  },
  {
    slug: 'convert-pdf-to-markdown',
    title: 'Convert PDFs to markdown',
    shortTitle: 'PDF to markdown',
    useCaseSlug: 'document-processing',
    intent: 'Extract readable text, tables, and metadata from PDFs for agent workflows.',
    description:
      'Find skills for PDF parsing, OCR fallback, table extraction, and clean markdown conversion.',
    agentPrompt:
      'Find the best skill for converting PDF files into clean markdown while preserving headings, tables, and metadata.',
    keywords: ['pdf markdown', 'convert pdf', 'document extraction', 'ocr', 'extract tables'],
    successCriteria: ['Handles common PDFs', 'Keeps headings and tables usable', 'Reports extraction limits'],
    avoidWhen: ['The PDF is encrypted', 'Scanned documents need manual OCR review', 'Legal/medical data requires compliance review'],
  },
  {
    slug: 'build-rag-knowledge-base',
    title: 'Build a RAG knowledge base',
    shortTitle: 'Build RAG',
    useCaseSlug: 'rag-knowledge',
    intent: 'Ingest docs, chunk content, retrieve relevant passages, and cite sources in agent answers.',
    description:
      'Find skills for document ingestion, retrieval, embeddings, knowledge indexing, and grounded answer workflows.',
    agentPrompt:
      'Find the best skill for building a RAG knowledge base over documents with retrieval, citations, and verification steps.',
    keywords: ['rag', 'knowledge base', 'retrieval', 'embedding', 'semantic search', 'documents'],
    successCriteria: ['Supports source attribution', 'Can test retrieval quality', 'Separates ingestion from answer generation'],
    avoidWhen: ['Source documents are not curated', 'Answers require real-time data', 'Private data cannot leave the workspace'],
  },
  {
    slug: 'analyze-csv-data',
    title: 'Analyze CSV data',
    shortTitle: 'Analyze CSV',
    useCaseSlug: 'data-analysis',
    intent: 'Load tabular files, profile columns, find patterns, and produce concise analysis.',
    description:
      'Find skills for CSV profiling, spreadsheet analysis, charting, metric validation, and business-friendly summaries.',
    agentPrompt:
      'Find the best skill for analyzing CSV files, profiling columns, finding trends, and explaining the results clearly.',
    keywords: ['csv analysis', 'data analysis', 'spreadsheet', 'charts', 'pandas', 'analytics'],
    successCriteria: ['Profiles columns', 'Flags missing or suspicious data', 'Produces reproducible analysis steps'],
    avoidWhen: ['The data is sensitive and unapproved for processing', 'The task requires certified financial advice', 'The CSV schema is unknown and huge'],
  },
  {
    slug: 'automate-browser-workflow',
    title: 'Automate a browser workflow',
    shortTitle: 'Browser workflow',
    useCaseSlug: 'browser-automation',
    intent: 'Navigate web apps, fill forms, take screenshots, and verify state through browser automation.',
    description:
      'Find skills for Playwright, browser-use, UI testing, form flows, and visual or DOM verification.',
    agentPrompt:
      'Find the best skill for automating a browser workflow, filling forms, and verifying the final page state safely.',
    keywords: ['browser automation', 'playwright', 'fill forms', 'web workflow', 'ui verification'],
    successCriteria: ['Waits for real state changes', 'Captures screenshots or DOM checks', 'Avoids final external side effects without approval'],
    avoidWhen: ['CAPTCHA or payment is required', 'The workflow changes account settings', 'Credentials are missing'],
  },
  {
    slug: 'generate-seo-content',
    title: 'Generate SEO content drafts',
    shortTitle: 'SEO content',
    useCaseSlug: 'content-automation',
    intent: 'Turn research and product updates into useful search-oriented drafts.',
    description:
      'Find skills for summarization, article outlines, markdown drafting, keyword-aware copy, and repeatable publishing workflows.',
    agentPrompt:
      'Find the best skill for turning product updates and research into useful SEO content drafts with clear source context.',
    keywords: ['seo content', 'blog draft', 'content automation', 'copywriting', 'markdown'],
    successCriteria: ['Uses source material', 'Produces structured draft sections', 'Avoids generic filler'],
    avoidWhen: ['Claims are not sourced', 'The brand voice is undefined', 'The content needs legal or medical review'],
  },
  {
    slug: 'triage-github-issues',
    title: 'Triage GitHub issues',
    shortTitle: 'Triage issues',
    useCaseSlug: 'github-automation',
    intent: 'Classify issues, identify duplicates, summarize priority, and suggest next actions.',
    description:
      'Find skills for issue review, repository context, labels, duplicate detection, and developer workflow summaries.',
    agentPrompt:
      'Find the best skill for triaging GitHub issues, identifying duplicates, assigning labels, and summarizing next actions.',
    keywords: ['github issues', 'issue triage', 'repository automation', 'labels', 'duplicate issues'],
    successCriteria: ['Summarizes user impact', 'Suggests labels and owners', 'Links to related issues or code'],
    avoidWhen: ['The repository is private without access', 'Issue labels carry compliance meaning', 'The triage changes external state without approval'],
  },
  {
    slug: 'scan-security-risks',
    title: 'Scan a project for security risks',
    shortTitle: 'Security scan',
    useCaseSlug: 'security-compliance',
    intent: 'Find risky dependencies, exposed secrets, unsafe patterns, and practical remediation steps.',
    description:
      'Find skills for security scanning, dependency review, secret detection, audit notes, and policy-aware automation.',
    agentPrompt:
      'Find the best skill for scanning a code project for security risks and producing prioritized remediation steps.',
    keywords: ['security scan', 'vulnerability', 'secret scanning', 'dependency audit', 'sast'],
    successCriteria: ['Prioritizes findings', 'Explains remediation', 'Separates warnings from confirmed issues'],
    avoidWhen: ['The scan touches production secrets', 'The result is used as a formal compliance audit', 'Repository access is incomplete'],
  },
  {
    slug: 'summarize-research-sources',
    title: 'Summarize research sources',
    shortTitle: 'Research summary',
    useCaseSlug: 'research-agents',
    intent: 'Collect sources, compare claims, and produce a concise evidence-backed brief.',
    description:
      'Find skills for web research, source comparison, summarization, and report generation.',
    agentPrompt:
      'Find the best skill for summarizing research sources, comparing claims, and writing a concise evidence-backed brief.',
    keywords: ['research summary', 'source comparison', 'market research', 'summarize sources', 'report'],
    successCriteria: ['Separates facts from interpretation', 'Cites source URLs', 'Highlights contradictions'],
    avoidWhen: ['Sources are not reliable', 'The task requires real-time regulated advice', 'The topic needs expert review'],
  },
]

export const FEATURED_AGENT_TASKS = AGENT_TASKS.slice(0, 8)

export function getAgentTaskBySlug(slug: string) {
  return AGENT_TASKS.find((task) => task.slug === slug)
}

export function selectSkillsForTask(skills: SkillRecord[], task: AgentTaskDefinition, limit = 8) {
  const useCase = getUseCaseBySlug(task.useCaseSlug)
  const ranked = dedupeRankedSkills(rankSkillsForQuery(skills, `${task.agentPrompt} ${task.keywords.join(' ')}`))
    .map((item) => ({
      ...item,
      score: item.score + (useCase ? scoreSkillForUseCase(item.skill, useCase) : 0),
    }))
    .sort((a, b) => b.score - a.score || Number(b.skill.github_stars || 0) - Number(a.skill.github_stars || 0))

  return ranked.slice(0, limit)
}
