import type { GitHubRepo } from '@/lib/schema/skill-schema'

const GITHUB_API = 'https://api.github.com'
const MAX_DISCOVERED_SKILLS = 50
const MAX_PACKAGE_FILES = 30
const MAX_FILE_BYTES = 120_000

export interface GitHubSkillReference {
  owner: string
  repo: string
  ref: string | null
  path: string | null
}

export interface SkillFrontmatter {
  name: string
  description: string
  version?: string
  license?: string
  author?: string
  category?: string
  tags: string[]
  frameworks: string[]
}

export interface DiscoveredGitHubSkill {
  owner: string
  repo: string
  ref: string
  path: string
  directory: string
  sourceUrl: string
  document: string
  frontmatter: SkillFrontmatter
}

interface GitHubTreeItem {
  path: string
  type: 'blob' | 'tree'
  size?: number
}

function githubHeaders() {
  const token = (process.env.GITHUB_TOKEN || '').trim()
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'OpenAgentSkill-Submission/2.0',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function cleanSegment(value: string) {
  return decodeURIComponent(value).trim()
}

function normalizePath(value: string | null | undefined) {
  const normalized = (value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/')

  if (!normalized) return null
  if (normalized.split('/').some((segment) => segment === '.' || segment === '..')) return null
  return normalized
}

export function parseGitHubSkillReference(input: string): GitHubSkillReference | null {
  const value = input.trim()
  if (!value) return null

  if (/^[\w.-]+\/[\w.-]+(?:\.git)?$/.test(value)) {
    const [owner, repoValue] = value.split('/')
    return { owner, repo: repoValue.replace(/\.git$/i, ''), ref: null, path: null }
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  const parts = url.pathname.split('/').filter(Boolean).map(cleanSegment)
  if (url.hostname === 'raw.githubusercontent.com' && parts.length >= 4) {
    return {
      owner: parts[0],
      repo: parts[1].replace(/\.git$/i, ''),
      ref: parts[2],
      path: normalizePath(parts.slice(3).join('/')),
    }
  }

  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return null
  if (parts.length < 2) return null

  const owner = parts[0]
  const repo = parts[1].replace(/\.git$/i, '')
  const marker = parts[2]
  if ((marker === 'tree' || marker === 'blob') && parts.length >= 4) {
    return {
      owner,
      repo,
      ref: parts[3],
      path: normalizePath(parts.slice(4).join('/')),
    }
  }

  return { owner, repo, ref: null, path: null }
}

function parseInlineList(value: string | undefined) {
  if (!value) return []
  const content = value.trim().replace(/^\[|\]$/g, '')
  if (!content) return []
  return content
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
    .slice(0, 10)
}

function unquote(value: string) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function parseFrontmatterBlock(source: string) {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return { values: new Map<string, string>(), body: source }

  const lines = match[1].split(/\r?\n/)
  const values = new Map<string, string>()
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const entry = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/)
    if (!entry) {
      index += 1
      continue
    }

    const key = entry[1].toLowerCase()
    const rawValue = entry[2]
    if (rawValue === '|' || rawValue === '>') {
      const block: string[] = []
      index += 1
      while (index < lines.length && (/^\s+/.test(lines[index]) || !lines[index].trim())) {
        block.push(lines[index].replace(/^\s{1,4}/, ''))
        index += 1
      }
      values.set(key, rawValue === '>' ? block.join(' ').replace(/\s+/g, ' ').trim() : block.join('\n').trim())
      continue
    }

    values.set(key, unquote(rawValue))
    index += 1
  }

  return { values, body: source.slice(match[0].length) }
}

function firstBodyParagraph(body: string) {
  return body
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.replace(/^#+\s*/gm, '').replace(/\s+/g, ' ').trim())
    .find((paragraph) => paragraph.length >= 20 && !paragraph.startsWith('```')) || ''
}

export function parseSkillDocument(source: string): SkillFrontmatter | null {
  const { values, body } = parseFrontmatterBlock(source)
  const name = (values.get('name') || '').trim()
  const description = (values.get('description') || firstBodyParagraph(body)).trim()
  if (!name || !description) return null

  return {
    name: name.slice(0, 120),
    description: description.slice(0, 1000),
    version: values.get('version') || undefined,
    license: values.get('license') || undefined,
    author: values.get('author') || undefined,
    category: values.get('category') || undefined,
    tags: parseInlineList(values.get('tags') || values.get('keywords')),
    frameworks: parseInlineList(values.get('frameworks')),
  }
}

async function fetchRepositoryTree(owner: string, repo: string, ref: string) {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    { headers: githubHeaders(), signal: AbortSignal.timeout(15_000) }
  )

  if (!response.ok) throw new Error(`Unable to read repository tree (${response.status}).`)

  const payload = await response.json() as { tree?: GitHubTreeItem[]; truncated?: boolean }
  return { tree: payload.tree || [], truncated: Boolean(payload.truncated) }
}

async function fetchRepositoryFile(owner: string, repo: string, ref: string, path: string) {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`,
    {
      headers: { ...githubHeaders(), Accept: 'application/vnd.github.raw+json' },
      signal: AbortSignal.timeout(15_000),
    }
  )

  if (!response.ok) throw new Error(`Unable to read ${path} (${response.status}).`)

  const content = await response.text()
  if (content.length > MAX_FILE_BYTES) throw new Error(`${path} is too large to review safely.`)
  return content
}

function sourceUrl(owner: string, repo: string, ref: string, path: string) {
  const directory = path.replace(/\/?SKILL\.md$/i, '')
  if (!directory) return `https://github.com/${owner}/${repo}/blob/${ref}/SKILL.md`
  return `https://github.com/${owner}/${repo}/tree/${ref}/${directory}`
}

export async function discoverGitHubSkills(
  reference: GitHubSkillReference,
  repository: GitHubRepo
): Promise<{ skills: DiscoveredGitHubSkill[]; truncated: boolean }> {
  const ref = reference.ref || repository.defaultBranch
  const requestedPath = normalizePath(reference.path)
  const exactSkillPath = requestedPath && /(^|\/)SKILL\.md$/i.test(requestedPath)
    ? requestedPath
    : null

  let paths: string[] = []
  let truncated = false
  if (exactSkillPath) {
    paths = [exactSkillPath]
  } else {
    const treeResult = await fetchRepositoryTree(reference.owner, reference.repo, ref)
    truncated = treeResult.truncated
    const prefix = requestedPath ? `${requestedPath.replace(/\/$/, '')}/`.toLowerCase() : null
    paths = treeResult.tree
      .filter((item) => item.type === 'blob' && /(^|\/)SKILL\.md$/i.test(item.path))
      .map((item) => item.path)
      .filter((path) => !prefix || path.toLowerCase().startsWith(prefix))
      .slice(0, MAX_DISCOVERED_SKILLS)
  }

  const skills = (
    await Promise.all(paths.map(async (path) => {
      try {
        const document = await fetchRepositoryFile(reference.owner, reference.repo, ref, path)
        const frontmatter = parseSkillDocument(document)
        if (!frontmatter) return null
        const directory = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
        return {
          owner: reference.owner,
          repo: reference.repo,
          ref,
          path,
          directory,
          sourceUrl: sourceUrl(reference.owner, reference.repo, ref, path),
          document,
          frontmatter,
        } satisfies DiscoveredGitHubSkill
      } catch {
        return null
      }
    }))
  ).filter((skill): skill is DiscoveredGitHubSkill => Boolean(skill))

  return { skills, truncated }
}

const REVIEWABLE_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.yaml', '.yml', '.toml', '.sh', '.bash', '.zsh',
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.go', '.rs', '.java', '.rb',
])

function extension(path: string) {
  const file = path.slice(path.lastIndexOf('/') + 1)
  const dot = file.lastIndexOf('.')
  return dot >= 0 ? file.slice(dot).toLowerCase() : ''
}

export async function fetchSkillPackageFiles(skill: DiscoveredGitHubSkill) {
  const { tree } = await fetchRepositoryTree(skill.owner, skill.repo, skill.ref)
  const prefix = skill.directory ? `${skill.directory}/` : ''
  const paths = tree
    .filter((item) => item.type === 'blob')
    .filter((item) => !prefix || item.path.startsWith(prefix))
    .filter((item) => REVIEWABLE_EXTENSIONS.has(extension(item.path)))
    .filter((item) => !/(^|\/)(node_modules|dist|build|vendor|\.git)(\/|$)/i.test(item.path))
    .filter((item) => !item.size || item.size <= MAX_FILE_BYTES)
    .sort((a, b) => {
      if (a.path === skill.path) return -1
      if (b.path === skill.path) return 1
      return a.path.localeCompare(b.path)
    })
    .slice(0, MAX_PACKAGE_FILES)
    .map((item) => item.path)

  return Promise.all(paths.map(async (path) => ({
    path,
    content: path === skill.path
      ? skill.document
      : await fetchRepositoryFile(skill.owner, skill.repo, skill.ref, path).catch(() => ''),
  })))
}
