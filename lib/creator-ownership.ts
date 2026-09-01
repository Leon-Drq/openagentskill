import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { User } from '@supabase/supabase-js'
import { parseGitHubSkillReference } from '@/lib/github/skill-source'

const CHALLENGE_PREFIX = 'oas_claim_'
export const CLAIM_CHALLENGE_TTL_MS = 24 * 60 * 60 * 1000

export interface GitHubIdentity {
  id: string
  username: string
  avatarUrl: string | null
}

export function createClaimChallenge() {
  return `${CHALLENGE_PREFIX}${randomBytes(24).toString('base64url')}`
}

export function hashClaimChallenge(value: string) {
  return createHash('sha256').update(value.trim()).digest('hex')
}

export function challengeMatches(value: string, expectedHash: string) {
  const actual = Buffer.from(hashClaimChallenge(value), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function getClaimChallengePath(skillSlug: string) {
  const safeSlug = skillSlug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  return `.openagentskill/claim-${safeSlug || 'skill'}.txt`
}

export function getGitHubIdentity(user: Pick<User, 'identities'>): GitHubIdentity | null {
  const identity = user.identities?.find((item) => item.provider === 'github')
  if (!identity) return null
  const data = identity.identity_data || {}
  const username = String(data.user_name || data.preferred_username || data.login || '').trim()
  const id = String(data.provider_id || data.sub || identity.id || '').trim()
  if (!username || !id) return null
  return {
    id,
    username,
    avatarUrl: typeof data.avatar_url === 'string' ? data.avatar_url : null,
  }
}

export function parseSkillRepository(repository: string | null | undefined, githubRepo?: string | null) {
  const reference = parseGitHubSkillReference(repository || githubRepo || '')
  return reference ? { owner: reference.owner, repo: reference.repo, ref: reference.ref } : null
}

function githubHeaders() {
  const token = (process.env.GITHUB_TOKEN || '').trim()
  return {
    Accept: 'application/vnd.github.raw+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'OpenAgentSkill-Ownership/1.0',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function fetchRepositoryChallenge(options: {
  owner: string
  repo: string
  ref: string
  path: string
}) {
  const encodedPath = options.path.split('/').map(encodeURIComponent).join('/')
  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/contents/${encodedPath}?ref=${encodeURIComponent(options.ref)}`,
    { headers: githubHeaders(), cache: 'no-store', signal: AbortSignal.timeout(12_000) }
  )
  if (!response.ok) return null
  const value = (await response.text()).trim()
  return value.length <= 500 ? value : null
}

export function getLicenseEvidence(frontmatterLicense?: string, repositoryLicense?: string) {
  const declared = frontmatterLicense?.trim()
  const repository = repositoryLicense?.trim()
  const license = declared || repository || 'Unknown'
  const normalized = license.toLowerCase()
  return {
    license,
    source: declared ? 'skill_frontmatter' : repository ? 'github_repository' : 'unknown',
    status: !license || ['unknown', 'noassertion', 'other'].includes(normalized)
      ? 'missing'
      : /non-commercial|cc-by-nc/.test(normalized)
        ? 'restricted'
        : 'detected',
  } as const
}
