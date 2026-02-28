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

/**
 * Search GitHub for repositories containing SKILL.md.
 * Returns up to `perPage` results sorted by stars descending.
 */
export async function searchSkillRepos(
  page = 1,
  perPage = 20
): Promise<CandidateRepo[]> {
  // Search for repos that have a SKILL.md file in the root
  const query = 'filename:SKILL.md path:/'
  const url = `${GITHUB_API_BASE}/search/code?q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`

  const response = await fetch(url, { headers: githubHeaders() })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GitHub Code Search failed: ${response.status} ${body}`)
  }

  const data = await response.json()

  if (!data.items || data.items.length === 0) return []

  // De-duplicate by repository (multiple files may match per repo)
  const seen = new Set<string>()
  const repos: CandidateRepo[] = []

  for (const item of data.items) {
    const r = item.repository
    if (seen.has(r.full_name)) continue
    seen.add(r.full_name)

    repos.push({
      owner: r.owner.login,
      repo: r.name,
      fullName: r.full_name,
      description: r.description || '',
      stars: r.stargazers_count ?? 0,
      language: r.language ?? null,
      updatedAt: r.updated_at,
      htmlUrl: r.html_url,
    })
  }

  return repos
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
