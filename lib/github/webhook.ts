import { createHmac, timingSafeEqual } from 'node:crypto'

const GITHUB_SIGNATURE_PATTERN = /^sha256=([a-f0-9]{64})$/i

export function verifyGitHubWebhookSignature(payload: string, signature: string | null, secret: string) {
  const match = signature?.match(GITHUB_SIGNATURE_PATTERN)
  if (!match || !secret) return false
  const received = Buffer.from(match[1], 'hex')
  const expected = createHmac('sha256', secret).update(payload).digest()
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export function isAgentSkillSourcePath(path: string) {
  const normalized = path.trim().replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase()
  return normalized === 'skill.md' || normalized.endsWith('/skill.md')
}

export function changedPathsFromPush(payload: Record<string, unknown>) {
  const paths = new Set<string>()
  const commits = Array.isArray(payload.commits) ? payload.commits : []
  for (const value of commits) {
    if (!value || typeof value !== 'object') continue
    const commit = value as Record<string, unknown>
    for (const field of ['added', 'modified', 'removed'] as const) {
      const entries = Array.isArray(commit[field]) ? commit[field] : []
      for (const path of entries) if (typeof path === 'string') paths.add(path)
    }
  }
  return Array.from(paths)
}

export function pushTouchesAgentSkill(payload: Record<string, unknown>) {
  return changedPathsFromPush(payload).some(isAgentSkillSourcePath)
}
