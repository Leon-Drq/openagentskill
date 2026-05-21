import { createPublicClient } from '@/lib/supabase/public'

type SearchSort = 'stars' | 'updated'

interface HighStarQuery {
  q: string
  category: string
  tags: string[]
  frameworks: string[]
  sort?: SearchSort
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
}

export interface BulkImportSummary {
  targetNew: number
  minStars: number
  searchRequests: number
  candidatesFound: number
  skippedExisting: number
  imported: number
  updated: number
  errors: number
}

const GITHUB_API_BASE = 'https://api.github.com'

const HIGH_STAR_QUERIES: HighStarQuery[] = [
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
    q: 'topic:mcp-server',
    category: 'mcp-servers',
    tags: ['mcp', 'server'],
    frameworks: ['MCP'],
  },
  {
    q: '"mcp server"',
    category: 'mcp-servers',
    tags: ['mcp', 'server'],
    frameworks: ['MCP'],
  },
  {
    q: 'topic:mcp-tool',
    category: 'mcp-servers',
    tags: ['mcp', 'tool'],
    frameworks: ['MCP'],
  },
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
]

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

function buildSkill(repo: GitHubSearchRepo, query: HighStarQuery) {
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
    long_description: `${description}\n\nImported by the high-star GitHub discovery pipeline because it matches agent, MCP, automation, RAG, or developer-tool signals.`,
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
    },
    ai_review_approved: true,
    ai_review_issues: [],
    ai_review_suggestions: [],
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

function getSearchPlan(maxSearchRequests: number, pageSeed: number) {
  const plan: Array<{ query: HighStarQuery; page: number }> = []
  const maxPage = 10

  for (let i = 0; i < maxSearchRequests; i += 1) {
    const queryIndex = (pageSeed + i) % HIGH_STAR_QUERIES.length
    const page = 1 + (Math.floor((pageSeed + i) / HIGH_STAR_QUERIES.length) % maxPage)
    plan.push({ query: HIGH_STAR_QUERIES[queryIndex], page })
  }

  return plan
}

export async function bulkImportHighStarSkills(
  options: BulkImportOptions = {}
): Promise<{ summary: BulkImportSummary; results: Array<{ repo: string; status: string; slug?: string; reason?: string }> }> {
  const targetNew = clamp(Math.floor(options.targetNew || 500), 1, 500)
  const minStars = clamp(Math.floor(options.minStars || 500), 100, 1_000_000)
  const perPage = clamp(Math.floor(options.perPage || 100), 10, 100)
  const maxSearchRequests = clamp(
    Math.floor(options.maxSearchRequests || (process.env.GITHUB_TOKEN ? 20 : 10)),
    1,
    process.env.GITHUB_TOKEN ? 30 : 10
  )
  const pageSeed = Math.max(
    0,
    Math.floor(options.pageSeed ?? Math.floor(Date.now() / 86_400_000))
  )
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
  const summary: BulkImportSummary = {
    targetNew,
    minStars,
    searchRequests: 0,
    candidatesFound: 0,
    skippedExisting: 0,
    imported: 0,
    updated: 0,
    errors: 0,
  }

  for (const { query, page } of getSearchPlan(maxSearchRequests, pageSeed)) {
    if (summary.imported >= targetNew) break

    summary.searchRequests += 1

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
      seenSlugs.add(slug)

      const skill = buildSkill(repo, query)
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
            stars: repo.stargazers_count,
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

  return { summary, results }
}
