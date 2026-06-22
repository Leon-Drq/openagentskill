import type { SkillRecord } from '@/lib/db/skills'
import { dedupeRankedSkills, rankSkillsForQuery } from '@/lib/registry'

export interface RegistryEvalCase {
  id: string
  task: string
  expectedSlugs?: string[]
  expectedTerms?: string[]
  minTopScore?: number
}

export const REGISTRY_EVAL_CASES: RegistryEvalCase[] = [
  {
    id: 'generic-web-scraping',
    task: 'Scrape competitor pricing pages and extract structured data',
    expectedSlugs: ['crawl4ai', 'firecrawl', 'any4ai-anycrawl', 'mishushakov-llm-scraper'],
    expectedTerms: ['crawl', 'scraper', 'firecrawl', 'extraction'],
    minTopScore: 80,
  },
  {
    id: 'browser-automation',
    task: 'Control a browser, fill forms, and verify a web app workflow',
    expectedTerms: ['browser', 'playwright', 'automation', 'puppeteer'],
    minTopScore: 60,
  },
  {
    id: 'github-pr-review',
    task: 'Review pull requests, inspect repository changes, and summarize GitHub issues',
    expectedTerms: ['github', 'pull request', 'review', 'repository'],
    minTopScore: 55,
  },
  {
    id: 'rag-documents',
    task: 'Build a RAG workflow over PDFs and retrieve reliable context',
    expectedTerms: ['rag', 'retrieval', 'document', 'pdf', 'vector'],
    minTopScore: 55,
  },
  {
    id: 'data-analysis',
    task: 'Analyze CSV data, create charts, and explain trends',
    expectedTerms: ['data', 'csv', 'analysis', 'chart', 'spreadsheet'],
    minTopScore: 50,
  },
  {
    id: 'content-automation',
    task: 'Turn product updates into blog posts, newsletters, and social copy',
    expectedTerms: ['content', 'writing', 'blog', 'newsletter', 'markdown'],
    minTopScore: 50,
  },
  {
    id: 'security-scan',
    task: 'Scan a codebase for vulnerabilities, exposed secrets, and dependency risks',
    expectedTerms: ['security', 'vulnerability', 'secret', 'dependency', 'audit'],
    minTopScore: 50,
  },
  {
    id: 'database-sql',
    task: 'Inspect a database schema, write SQL, and explain query results',
    expectedTerms: ['database', 'sql', 'postgres', 'query', 'schema'],
    minTopScore: 50,
  },
  {
    id: 'stock-news-analysis',
    task: 'Analyze stock news from the last 30 days and summarize market risks',
    expectedTerms: ['stock', 'market', 'finance', 'research', 'news'],
    minTopScore: 55,
  },
  {
    id: 'sec-filing-summary',
    task: 'Summarize SEC filings and prepare investor notes',
    expectedTerms: ['sec', 'filing', 'finance', 'investor', '10-k'],
    minTopScore: 50,
  },
  {
    id: 'quant-backtest',
    task: 'Backtest a trading strategy and explain drawdowns',
    expectedTerms: ['quant', 'backtest', 'trading', 'portfolio', 'finance'],
    minTopScore: 50,
  },
  {
    id: 'world-cup-dashboard',
    task: 'Build a World Cup dashboard from football match data',
    expectedTerms: ['football', 'soccer', 'world cup', 'sports', 'match'],
    minTopScore: 50,
  },
  {
    id: 'football-xg-analysis',
    task: 'Compare football teams using expected goals and event data',
    expectedTerms: ['football', 'soccer', 'xg', 'match', 'sports'],
    minTopScore: 50,
  },
  {
    id: 'pdf-table-extraction',
    task: 'Extract tables from PDF reports and convert them to markdown',
    expectedTerms: ['pdf', 'table', 'markdown', 'document', 'extract'],
    minTopScore: 52,
  },
  {
    id: 'office-to-markdown',
    task: 'Convert Word, PowerPoint, and spreadsheet files into clean markdown',
    expectedTerms: ['markdown', 'document', 'office', 'spreadsheet', 'convert'],
    minTopScore: 50,
  },
  {
    id: 'youtube-research',
    task: 'Research recent YouTube videos and produce a grounded summary',
    expectedTerms: ['youtube', 'research', 'summary', 'web', 'recent'],
    minTopScore: 45,
  },
  {
    id: 'reddit-market-scan',
    task: 'Scan Reddit discussions for product feedback and market signals',
    expectedTerms: ['reddit', 'research', 'market', 'feedback', 'social'],
    minTopScore: 45,
  },
  {
    id: 'hacker-news-monitoring',
    task: 'Monitor Hacker News and summarize trending developer discussions',
    expectedTerms: ['hacker news', 'research', 'developer', 'trending', 'summary'],
    minTopScore: 45,
  },
  {
    id: 'pull-request-tests',
    task: 'Inspect a pull request and generate focused regression tests',
    expectedTerms: ['pull request', 'github', 'test', 'review', 'code'],
    minTopScore: 52,
  },
  {
    id: 'repo-architecture',
    task: 'Explain a repository architecture and identify risky modules',
    expectedTerms: ['repository', 'code', 'architecture', 'review', 'github'],
    minTopScore: 50,
  },
  {
    id: 'browser-qa-flow',
    task: 'Run a browser QA flow and capture evidence for broken UI states',
    expectedTerms: ['browser', 'playwright', 'qa', 'test', 'automation'],
    minTopScore: 55,
  },
  {
    id: 'form-automation',
    task: 'Fill forms in a browser and verify the submitted result',
    expectedTerms: ['browser', 'form', 'automation', 'playwright', 'web'],
    minTopScore: 52,
  },
  {
    id: 'rag-citations',
    task: 'Build a RAG answer with citations from a document collection',
    expectedTerms: ['rag', 'retrieval', 'citation', 'document', 'vector'],
    minTopScore: 52,
  },
  {
    id: 'vector-search',
    task: 'Index documents and retrieve context with vector search',
    expectedTerms: ['vector', 'rag', 'retrieval', 'index', 'document'],
    minTopScore: 50,
  },
  {
    id: 'seo-keyword-brief',
    task: 'Research SEO keywords and generate article briefs',
    expectedTerms: ['seo', 'keyword', 'content', 'brief', 'marketing'],
    minTopScore: 45,
  },
  {
    id: 'social-launch-copy',
    task: 'Turn a product launch into social posts and newsletter copy',
    expectedTerms: ['social', 'newsletter', 'copy', 'content', 'launch'],
    minTopScore: 45,
  },
  {
    id: 'crm-cleanup',
    task: 'Clean CRM exports and prepare a growth report',
    expectedTerms: ['crm', 'data', 'growth', 'marketing', 'csv'],
    minTopScore: 42,
  },
  {
    id: 'spreadsheet-analysis',
    task: 'Analyze spreadsheet data and produce charts with explanation',
    expectedTerms: ['spreadsheet', 'csv', 'chart', 'data', 'analysis'],
    minTopScore: 50,
  },
  {
    id: 'database-migration-review',
    task: 'Review a database migration for schema and query risks',
    expectedTerms: ['database', 'migration', 'sql', 'schema', 'review'],
    minTopScore: 50,
  },
  {
    id: 'secret-scanning',
    task: 'Scan a repository for exposed API keys and secrets',
    expectedTerms: ['secret', 'security', 'api key', 'scan', 'repository'],
    minTopScore: 52,
  },
  {
    id: 'dependency-vulnerability',
    task: 'Audit dependencies for vulnerabilities and summarize remediation',
    expectedTerms: ['dependency', 'vulnerability', 'security', 'audit', 'remediation'],
    minTopScore: 52,
  },
  {
    id: 'contract-review',
    task: 'Review a contract and summarize risky clauses',
    expectedTerms: ['contract', 'legal', 'review', 'risk', 'document'],
    minTopScore: 42,
  },
  {
    id: 'privacy-policy-review',
    task: 'Review a privacy policy for compliance obligations',
    expectedTerms: ['privacy', 'policy', 'legal', 'compliance', 'review'],
    minTopScore: 42,
  },
  {
    id: 'education-tutor',
    task: 'Create an adaptive tutor that explains a topic step by step',
    expectedTerms: ['education', 'tutor', 'teach', 'learning', 'explain'],
    minTopScore: 42,
  },
  {
    id: 'video-generation-workflow',
    task: 'Create a video generation workflow for short creative clips',
    expectedTerms: ['video', 'generation', 'creative', 'design', 'media'],
    minTopScore: 42,
  },
  {
    id: 'image-design-workflow',
    task: 'Generate image design prompts and refine visual assets',
    expectedTerms: ['image', 'design', 'creative', 'prompt', 'visual'],
    minTopScore: 42,
  },
  {
    id: 'workflow-automation',
    task: 'Connect repeated operational tasks across APIs and tools',
    expectedTerms: ['workflow', 'automation', 'api', 'integration', 'tools'],
    minTopScore: 50,
  },
  {
    id: 'scheduled-agent-run',
    task: 'Run an agent task on a schedule and report results',
    expectedTerms: ['schedule', 'agent', 'automation', 'workflow', 'report'],
    minTopScore: 42,
  },
  {
    id: 'customer-support-triage',
    task: 'Triage customer support messages and draft replies',
    expectedTerms: ['support', 'customer', 'ticket', 'reply', 'triage'],
    minTopScore: 42,
  },
  {
    id: 'api-docs-generation',
    task: 'Generate API documentation from source code and examples',
    expectedTerms: ['api', 'documentation', 'code', 'examples', 'developer'],
    minTopScore: 42,
  },
  {
    id: 'data-visualization',
    task: 'Create data visualizations from analytics exports',
    expectedTerms: ['data', 'visualization', 'chart', 'analytics', 'csv'],
    minTopScore: 45,
  },
]

function skillText(skill: SkillRecord) {
  return [
    skill.slug,
    skill.name,
    skill.description,
    skill.long_description,
    skill.category,
    skill.github_repo,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function runRegistryEvals(skills: SkillRecord[], cases = REGISTRY_EVAL_CASES) {
  const results = cases.map((testCase) => {
    const ranked = dedupeRankedSkills(rankSkillsForQuery(skills, testCase.task)).slice(0, 5)
    const top = ranked[0]
    const topFiveText = ranked.map((item) => skillText(item.skill)).join(' ')
    const slugHit = Boolean(
      testCase.expectedSlugs?.some((slug) => ranked.some((item) => item.skill.slug === slug))
    )
    const termHit = Boolean(
      testCase.expectedTerms?.some((term) => topFiveText.includes(term.toLowerCase()))
    )
    const scoreHit = !testCase.minTopScore || Number(top?.score || 0) >= testCase.minTopScore
    const passed = Boolean(ranked.length > 0 && scoreHit && (slugHit || termHit))

    return {
      id: testCase.id,
      task: testCase.task,
      passed,
      expected_slugs: testCase.expectedSlugs || [],
      expected_terms: testCase.expectedTerms || [],
      min_top_score: testCase.minTopScore || null,
      top_score: top?.score || 0,
      top_results: ranked.map((item, index) => ({
        rank: index + 1,
        slug: item.skill.slug,
        name: item.skill.name,
        score: item.score,
        stars: item.skill.github_stars,
      })),
    }
  })

  const passed = results.filter((result) => result.passed).length

  return {
    passed,
    failed: results.length - passed,
    total: results.length,
    pass_rate: results.length > 0 ? Math.round((passed / results.length) * 100) : 0,
    results,
  }
}
