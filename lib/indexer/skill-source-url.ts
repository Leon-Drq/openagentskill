export interface ParsedSkillSource {
  owner: string
  repo: string
  fullName: string
  sourceUrl: string
  directoryUrl: string
  skillName?: string
}

function normalizeSourceUrl(raw: string) {
  const trimmed = raw.trim().replace(/[),.;]+$/, '')
  if (!trimmed) return ''
  if (/^(?:www\.)?(?:github\.com|skills\.sh)\//i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}

function validRepoParts(owner: string, repo: string) {
  if (!owner || !repo) return false
  if (['topics', 'features', 'marketplace', 'orgs', 'collections'].includes(owner.toLowerCase())) return false
  if (['issues', 'pull', 'pulls', 'tree', 'blob', 'discussions', 'releases'].includes(repo.toLowerCase())) return false
  return true
}

export function parseSkillSourceUrl(raw: string): ParsedSkillSource | null {
  const normalized = normalizeSourceUrl(raw)

  const githubMatch = normalized.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i)
  if (githubMatch) {
    const owner = githubMatch[1]
    const repo = githubMatch[2].replace(/\.git$/i, '')
    if (!validRepoParts(owner, repo)) return null

    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      sourceUrl: normalized,
      directoryUrl: `https://github.com/${owner}/${repo}`,
    }
  }

  const skillsMatch = normalized.match(/skills\.sh\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/([A-Za-z0-9_.-]+))?/i)
  if (!skillsMatch) return null

  const owner = skillsMatch[1]
  const repo = skillsMatch[2]
  const skillName = skillsMatch[3]
  if (!validRepoParts(owner, repo)) return null

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    sourceUrl: normalized,
    directoryUrl: `https://github.com/${owner}/${repo}`,
    ...(skillName ? { skillName } : {}),
  }
}
