import { NextRequest } from 'next/server'
import { z } from 'zod'
import { buyer, downloadableRelease, paymentBody, paymentDb, paymentError, PaymentError, paymentJson, verifyPackage, releaseBytes } from '@/lib/payments/server'
import { DOWNLOAD_TTL_SECONDS, PACKAGE_BUCKET } from '@/lib/payments/policy'
import { downloadResponse } from '@/lib/skills/downloads'
import { MAX_DOWNLOAD_BYTES } from '@/lib/skills/download-policy'
import { issueDownloadGrant, verifyDownloadGrant } from '@/lib/payments/download-grant'
import type { PackageRelease } from '@/lib/payments/policy'

export const runtime = 'nodejs'
const filename = (release: PackageRelease) => `${release.skill_slug}-${release.version}.${!release.delivery_kind || release.delivery_kind === 'package' ? 'zip' : 'txt'}`
async function transfer(release: PackageRelease, userId: string) {
  if (release.size_bytes > MAX_DOWNLOAD_BYTES) throw new PaymentError('package_unavailable', 409)
  const bytes = await releaseBytes(release)
  return downloadResponse({ userId, slug: release.skill_slug, bytes,
    size: release.size_bytes, sha256: release.sha256, kind: 'paid-file', filename: filename(release) })
}

// The legacy JSON client receives a short-lived first-party URL on Cloudflare.
// It is bound to the authenticated buyer and rechecks payment/revocation at use.
// Explicit HEAD prevents Next from mapping it to GET and recording a download.
export function HEAD() { return paymentJson({ error: 'method_not_allowed' }, 405) }
export async function GET(request: NextRequest) {
  try {
    if (process.env.HOSTING_PROVIDER !== 'cloudflare') throw new PaymentError('not_found', 404)
    const user = await buyer()
    const grant = verifyDownloadGrant(request.nextUrl.searchParams.get('grant') || '', user.id, process.env.PACKAGE_DOWNLOAD_SECRET || '')
    if (!grant) throw new PaymentError('download_expired', 403)
    const release = await downloadableRelease(user.id, grant.slug)
    if (release.id !== grant.id || release.sha256 !== grant.sha) throw new PaymentError('package_unavailable', 409)
    return await transfer(release, user.id)
  } catch (error) { return paymentError(error) }
}
export async function POST(request: NextRequest) {
  try {
    const parsed = z.object({ slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,199}$/) }).strict().safeParse(await paymentBody(request))
    if (!parsed.success) throw new PaymentError('invalid_body')
    const user = await buyer()
    const release = await downloadableRelease(user.id, parsed.data.slug)
    await verifyPackage(release)
    if (request.headers.get('accept') === 'application/octet-stream') {
      return await transfer(release, user.id)
    }
    if (process.env.HOSTING_PROVIDER === 'cloudflare') {
      const url = new URL('/api/payments/download', request.url)
      url.searchParams.set('grant', issueDownloadGrant(release, user.id, process.env.PACKAGE_DOWNLOAD_SECRET || ''))
      return paymentJson({ url: url.href, version: release.version, sha256: release.sha256, expiresIn: DOWNLOAD_TTL_SECONDS })
    }
    const { data, error } = await paymentDb().storage.from(PACKAGE_BUCKET).createSignedUrl(release.object_path, DOWNLOAD_TTL_SECONDS,
      { download: filename(release) })
    if (error || !data?.signedUrl) throw new Error('download_unavailable')
    return paymentJson({ url: data.signedUrl, version: release.version, sha256: release.sha256, expiresIn: DOWNLOAD_TTL_SECONDS })
  } catch (error) { return paymentError(error) }
}
