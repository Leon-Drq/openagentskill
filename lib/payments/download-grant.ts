import { createHmac, timingSafeEqual } from 'node:crypto'
import { DOWNLOAD_TTL_SECONDS, validRelease, type PackageRelease } from './policy'

function signature(payload: string, userId: string, secret: string) {
  if (Buffer.byteLength(secret) < 32 || !userId || userId.includes('\0')) throw new Error('download_grant_not_configured')
  return createHmac('sha256', secret).update(`openagentskill-download-v1\0${userId}\0${payload}`).digest()
}

export function issueDownloadGrant(release: PackageRelease, userId: string, secret: string, now = Date.now()) {
  if (!validRelease(release, release.skill_slug)) throw new Error('package_unavailable')
  const payload = Buffer.from(JSON.stringify({ v: 1, slug: release.skill_slug, id: release.id,
    sha: release.sha256, exp: Math.floor(now / 1000) + DOWNLOAD_TTL_SECONDS })).toString('base64url')
  return `${payload}.${signature(payload, userId, secret).toString('base64url')}`
}

export function verifyDownloadGrant(token: string, userId: string, secret: string, now = Date.now()) {
  if (!token || token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)) return null
  const [payload, provided] = token.split('.')
  const expected = signature(payload, userId, secret)
  const actual = Buffer.from(provided, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  try {
    const grant = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const seconds = Math.floor(now / 1000)
    if (grant.v !== 1 || typeof grant.slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,199}$/.test(grant.slug)
      || typeof grant.id !== 'string' || !grant.id || grant.id.length > 200
      || typeof grant.sha !== 'string' || !/^[a-f0-9]{64}$/.test(grant.sha)
      || !Number.isSafeInteger(grant.exp) || grant.exp <= seconds || grant.exp > seconds + DOWNLOAD_TTL_SECONDS) return null
    return grant as { v: 1; slug: string; id: string; sha: string; exp: number }
  } catch { return null }
}
