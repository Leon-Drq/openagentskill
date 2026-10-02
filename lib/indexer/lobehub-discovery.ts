import { canonicalGitHubSourceUrl } from './candidate-identity'
import type { CandidateRepo } from './github-search'
import { parseGitHubSkillReference } from '@/lib/github/skill-source'
import { validateGitHubRepo, GitHubAPIError } from '@/lib/github/api'

export const LOBEHUB_DISCOVERY_URL = 'https://lobehub.com/skills?category=all'
const MAX_BYTES = 1_500_000
// Read public source references only. Never execute embedded scripts, install
// packages, copy marketplace descriptions or trust marketplace review badges.
export function extractLobeHubSources(html: string, limit = 5): string[] {
  const text = html.slice(0, MAX_BYTES).replaceAll('\\/', '/').replaceAll('\\u002F', '/')
  const references = text.match(/https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/(?:tree|blob)\/[^\s"'<>\\]+/g) || []
  const seen = new Set<string>()
  const sources: string[] = []
  for (const url of references) {
    const parsed = parseGitHubSkillReference(url)
    if (!parsed?.path || !parsed.ref) continue
    // Files must be explicit instruction files; tree paths are resolved and
    // scanned by the existing validator before any public publication.
    if (/\/blob\//.test(url) && !/\/SKILL\.md$/i.test(url)) continue
    const key = `${parsed.owner.toLowerCase()}/${parsed.repo.toLowerCase()}:${parsed.ref}:${parsed.path}`
    if (seen.has(key)) continue
    seen.add(key); sources.push(url)
    if (sources.length >= Math.min(20, Math.max(1, limit))) break
  }
  return sources
}

export async function discoverLobeHubSources(limit = 5) {
  const response = await fetch(LOBEHUB_DISCOVERY_URL, {
    headers: { 'User-Agent': 'OpenAgentSkill-Discovery/1.0 (+https://www.openagentskill.com)' },
    signal: AbortSignal.timeout(12_000), cache: 'no-store', redirect: 'error',
  })
  if (!response.ok) throw new Error(`LobeHub discovery unavailable (${response.status})`)
  if (Number(response.headers.get('content-length') || 0) > MAX_BYTES) throw new Error('LobeHub discovery response too large')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('LobeHub discovery response empty')
  const chunks: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      const result = await reader.read(); if (result.done) break
      size += result.value.byteLength
      if (size > MAX_BYTES) throw new Error('LobeHub discovery response too large')
      chunks.push(result.value)
    }
  } finally { await reader.cancel() }
  const available = extractLobeHubSources(Buffer.concat(chunks).toString('utf8'), 20)
  const offset = (Math.floor(Date.now() / 86_400_000) % 4) * 5
  const sources = [...available.slice(offset), ...available.slice(0, offset)].slice(0, Math.min(5, Math.max(1, limit)))
  if (!sources.length) throw new Error('LobeHub public source format changed; no candidates enqueued')
  const candidates: CandidateRepo[] = []; const errors: string[] = []
  const repos = new Map<string, Awaited<ReturnType<typeof validateGitHubRepo>>>()
  for (const source of sources) {
    const parsed = parseGitHubSkillReference(source)!
    const fullName = `${parsed.owner}/${parsed.repo}`
    try {
      let repo = repos.get(fullName.toLowerCase())
      if (!repo) {
        if (repos.size) await new Promise(resolve => setTimeout(resolve, 2100))
        repo = await validateGitHubRepo(fullName, { checkReadme: false, checkSkillJson: false })
        repos.set(fullName.toLowerCase(), repo)
      }
      if (repo.isPrivate) continue
      candidates.push({ githubId: repo.id, owner: repo.owner, repo: repo.repo, fullName: repo.fullName,
        description: repo.description || '', stars: repo.stars || 0, language: repo.language || null,
        updatedAt: repo.updatedAt, pushedAt: repo.pushedAt, htmlUrl: `https://github.com/${repo.fullName}`,
        skillSourceUrl: canonicalGitHubSourceUrl(repo.fullName, parsed.ref, parsed.path), discovery: { source: 'lobehub-public-directory', market: { url: LOBEHUB_DISCOVERY_URL, sourceUrl: source, observedAt: new Date().toISOString() } },
      })
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'GitHub source lookup failed')
      if (error instanceof GitHubAPIError && [403,429].includes(error.statusCode || 0)) break
    }
  }
  return { candidates, sourcesFound: sources.length, errors }
}
