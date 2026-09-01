function normalizePath(value: string | null | undefined) {
  return (value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/')
}

function normalizeFullName(value: string) {
  return value.trim().replace(/^\/+|\/+$/g, '').toLowerCase()
}

export function buildCandidateSourceKey(
  repositoryId: number | null | undefined,
  fullName: string,
  sourcePath?: string | null
) {
  const repositoryKey = repositoryId ? String(repositoryId) : `name:${normalizeFullName(fullName)}`
  return `github:${repositoryKey}:${normalizePath(sourcePath) || '@repo'}`
}

export function canonicalGitHubSourceUrl(fullName: string, ref?: string | null, path?: string | null) {
  const [owner, repo] = fullName.split('/')
  const normalizedPath = normalizePath(path)
  if (!normalizedPath) return `https://github.com/${owner}/${repo}`
  const branch = (ref || 'HEAD').trim()
  if (/SKILL\.md$/i.test(normalizedPath)) {
    return `https://github.com/${owner}/${repo}/blob/${branch}/${normalizedPath}`
  }
  return `https://github.com/${owner}/${repo}/tree/${branch}/${normalizedPath}`
}

export { normalizePath as normalizeCandidateSourcePath }
