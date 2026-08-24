export interface GitHubOwnerSource {
  github_repo?: string | null
  repository?: string | null
  publisher_github?: string | null
  author_url?: string | null
}

const RESERVED_GITHUB_PATHS = new Set([
  'about',
  'apps',
  'collections',
  'enterprise',
  'explore',
  'features',
  'marketplace',
  'orgs',
  'pricing',
  'search',
  'settings',
  'site',
  'sponsors',
  'topics',
])

function normalizeOwnerCandidate(value: string | null | undefined, requireGithubUrl = false) {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  if (requireGithubUrl && !/^(?:https?:\/\/)?(?:www\.)?github\.com\//i.test(trimmed)) return ''

  const normalized = trimmed
    .replace(/^https?:\/\/(?:www\.)?github\.com\//i, '')
    .replace(/^github\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
    ?.trim()

  if (!normalized || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(normalized)) return ''
  if (RESERVED_GITHUB_PATHS.has(normalized.toLowerCase())) return ''
  return normalized
}

export function getGitHubOwner(source: GitHubOwnerSource) {
  return (
    normalizeOwnerCandidate(source.github_repo) ||
    normalizeOwnerCandidate(source.repository, true) ||
    normalizeOwnerCandidate(source.publisher_github) ||
    normalizeOwnerCandidate(source.author_url, true)
  )
}

export function getGitHubOwnerUrl(owner: string) {
  return `https://github.com/${encodeURIComponent(owner)}`
}

export function getGitHubAvatarUrl(owner: string, size = 96) {
  const normalizedSize = Math.min(460, Math.max(32, Math.round(size)))
  return `${getGitHubOwnerUrl(owner)}.png?size=${normalizedSize}`
}
