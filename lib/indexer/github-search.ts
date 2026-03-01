/**
 * GitHub Search Module for Skill Auto-Indexer
 *
 * Uses GitHub Code Search API to find repositories containing SKILL.md,
 * which signals they are designed to be Open Agent Skills.
 */

const GITHUB_API_BASE = 'https://api.github.com'

function githubHeaders() {
  return {
    Accept: 'application/vnd.github.v3+json',
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  }
}

export interface CandidateRepo {
  owner: string
  repo: string
  fullName: string
  description: string
  stars: number
  language: string | null
  updatedAt: string
  htmlUrl: string
}

// Search queries rotated across indexer runs to discover diverse repos
const SEARCH_QUERIES = [
  'topic:mcp-server',
  'topic:model-context-protocol',
  'topic:ai-agent stars:>5',
  'topic:llm-tools stars:>10',
  '"mcp server" language:python stars:>5',
  '"mcp server" language:typescript stars:>5',
  'filename:SKILL.md',
  '"agent skill" stars:>3',
  'topic:openai-tools stars:>10',
  'topic:claude-mcp stars:>3',
]

/**
 * Search GitHub for agent skill / MCP server repositories.
 * Rotates across multiple search queries for broad discovery.
 */
export async function searchSkillRepos(
  page = 1,
  perPage = 20
): Promise<CandidateRepo[]> {
  // Pick query based on page number to rotate across all queries over time
  const query = SEARCH_QUERIES[(page - 1) % SEARCH_QUERIES.length]
  const sort = 'stars'
  const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&order=desc&per_page=${perPage}&page=${Math.ceil(page / SEARCH_QUERIES.length)}`

  const response = await fetch(url, {
    headers: githubHeaders(),
    next: { revalidate: 3600 },
  } as RequestInit)

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GitHub Repo Search failed [${query}]: ${response.status} ${body}`)
  }

  const data = await response.json()
  if (!data.items || data.items.length === 0) return []

  return data.items.map((r: any) => ({
    owner: r.owner.login,
    repo: r.name,
    fullName: r.full_name,
    description: r.description || '',
    stars: r.stargazers_count ?? 0,
    language: r.language ?? null,
    updatedAt: r.updated_at,
    htmlUrl: r.html_url,
  }))
}

/**
 * Filter out repositories that are already in the database.
 */
export async function filterNewRepos(
  candidates: CandidateRepo[],
  existingSlugs: Set<string>
): Promise<CandidateRepo[]> {
  return candidates.filter((c) => {
    const slug = `${c.owner}-${c.repo}`.toLowerCase()
    return !existingSlugs.has(slug)
  })
}

/**
 * Fetch all current slugs from the database to avoid re-processing.
 */
export async function fetchExistingSlugs(): Promise<Set<string>> {
  const { createPublicClient } = await import('@/lib/supabase/public')
  const supabase = createPublicClient()

  const { data, error } = await supabase.from('skills').select('slug')
  if (error) throw new Error(`Failed to fetch existing slugs: ${error.message}`)

  return new Set((data || []).map((r: { slug: string }) => r.slug))
}
