import { timingSafeEqual } from 'node:crypto'

// Deliberately independent from cron, indexer, public API and Supabase keys.
// Missing credentials fail closed, including in local development.
export function isOwnerPublishAuthorized(request: Request, secret = process.env.OWNER_PUBLISH_TOKEN) {
  if (!secret || secret.length < 32) return false
  const header = request.headers.get('authorization') || ''
  if (!header.startsWith('Bearer ')) return false
  const candidate = Buffer.from(header.slice(7))
  const expected = Buffer.from(secret)
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}
