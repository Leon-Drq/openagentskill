import { GitHubRepo, SkillManifest, SkillManifestSchema } from '../schema/skill-schema'
import { parseGitHubSkillReference } from './skill-source'

export class GitHubAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'GitHubAPIError'
  }
}

// Parse GitHub URL to owner/repo format
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const reference = parseGitHubSkillReference(url)
  return reference ? { owner: reference.owner, repo: reference.repo } : null
}

// Validate GitHub repository
export async function validateGitHubRepo(
  ownerRepo: string,
  options: { checkReadme?: boolean; checkSkillJson?: boolean } = {}
): Promise<GitHubRepo> {
  const parsed = parseGitHubUrl(ownerRepo)
  if (!parsed) {
    throw new GitHubAPIError('Invalid GitHub repository format')
  }

  const { owner, repo } = parsed
  
  // Fetch repo info from GitHub API
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      // Add GitHub token if available for higher rate limits
      ...(process.env.GITHUB_TOKEN && {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      }),
    },
    signal: AbortSignal.timeout(12_000),
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new GitHubAPIError('Repository not found', 404)
    }
    throw new GitHubAPIError(`GitHub API error: ${response.statusText}`, response.status)
  }

  const data = await response.json()

  const optionalHeaders = {
    'Accept': 'application/vnd.github.v3+json',
    ...(process.env.GITHUB_TOKEN && {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    }),
  }
  const [readmeResponse, skillJsonResponse] = await Promise.all([
    options.checkReadme === false
      ? null
      : fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
          headers: optionalHeaders,
          signal: AbortSignal.timeout(12_000),
        }),
    options.checkSkillJson === false
      ? null
      : fetch(`https://api.github.com/repos/${owner}/${repo}/contents/skill.json`, {
          headers: optionalHeaders,
          signal: AbortSignal.timeout(12_000),
        }),
  ])

  return {
    id: typeof data.id === 'number' ? data.id : undefined,
    owner,
    repo,
    fullName: data.full_name,
    description: data.description || undefined,
    stars: data.stargazers_count,
    forks: data.forks_count,
    language: data.language || undefined,
    license: data.license?.spdx_id || undefined,
    updatedAt: data.updated_at,
    pushedAt: typeof data.pushed_at === 'string' ? data.pushed_at : null,
    defaultBranch: data.default_branch,
    hasReadme: Boolean(readmeResponse?.ok),
    hasSkillJson: Boolean(skillJsonResponse?.ok),
  }
}

export async function fetchRepositoryCommitSha(owner: string, repo: string, ref: string): Promise<string | null> {
  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
      signal: AbortSignal.timeout(12_000),
    }
  )

  if (!response.ok) return null
  const data = await response.json() as { sha?: string }
  return typeof data.sha === 'string' && /^[a-f0-9]{40}$/i.test(data.sha) ? data.sha : null
}

// Fetch README content
export async function fetchReadme(owner: string, repo: string): Promise<string> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/readme`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3.raw',
        ...(process.env.GITHUB_TOKEN && {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
    }
  )

  if (!response.ok) {
    throw new GitHubAPIError('README not found', response.status)
  }

  return response.text()
}

// Fetch skill.json if exists
export async function fetchSkillManifest(
  owner: string,
  repo: string
): Promise<SkillManifest | null> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/skill.json`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3.raw',
        ...(process.env.GITHUB_TOKEN && {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
    }
  )

  if (!response.ok) {
    return null
  }

  const content = await response.text()
  const json = JSON.parse(content)
  
  // Validate against schema
  const result = SkillManifestSchema.safeParse(json)
  if (!result.success) {
    throw new GitHubAPIError('Invalid skill.json format')
  }

  return result.data
}

// Fetch main code files for AI review
export async function fetchCodeFiles(
  owner: string,
  repo: string,
  maxFiles: number = 5
): Promise<{ path: string; content: string }[]> {
  // Fetch repository tree
  const treeResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN && {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
    }
  )

  if (!treeResponse.ok) {
    throw new GitHubAPIError('Failed to fetch repository tree')
  }

  const treeData = await treeResponse.json()
  
  // Filter for code files (exclude node_modules, dist, etc.)
  const codeExtensions = ['.js', '.ts', '.py', '.go', '.rs', '.java', '.cpp', '.c']
  const excludePaths = ['node_modules', 'dist', 'build', '.git', 'vendor']
  
  const codeFiles = treeData.tree
    .filter((item: any) => {
      const isCodeFile = codeExtensions.some(ext => item.path.endsWith(ext))
      const isExcluded = excludePaths.some(exclude => item.path.includes(exclude))
      return isCodeFile && !isExcluded && item.type === 'blob'
    })
    .slice(0, maxFiles)

  // Fetch content for each file
  const files = await Promise.all(
    codeFiles.map(async (file: any) => {
      const contentResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3.raw',
            ...(process.env.GITHUB_TOKEN && {
              'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            }),
          },
        }
      )
      
      if (!contentResponse.ok) {
        return { path: file.path, content: '' }
      }

      const content = await contentResponse.text()
      return { path: file.path, content }
    })
  )

  return files
}
