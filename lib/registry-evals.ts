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
