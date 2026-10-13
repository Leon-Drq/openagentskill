import { NextRequest } from 'next/server'
import { z } from 'zod'
import { buyer, downloadableRelease, paymentBody, paymentDb, paymentError, PaymentError, paymentJson, verifyPackage } from '@/lib/payments/server'
import { DOWNLOAD_TTL_SECONDS, PACKAGE_BUCKET } from '@/lib/payments/policy'
import { downloadResponse } from '@/lib/skills/downloads'
import { MAX_DOWNLOAD_BYTES } from '@/lib/skills/download-policy'

export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  try {
    const parsed = z.object({ slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,199}$/) }).strict().safeParse(await paymentBody(request))
    if (!parsed.success) throw new PaymentError('invalid_body')
    const user = await buyer()
    const release = await downloadableRelease(user.id, parsed.data.slug)
    await verifyPackage(release)
    if (request.headers.get('accept') === 'application/octet-stream') {
      if (release.size_bytes > MAX_DOWNLOAD_BYTES) throw new PaymentError('package_unavailable', 409)
      const { data: file, error: fileError } = await paymentDb().storage.from(PACKAGE_BUCKET).download(release.object_path)
      if (fileError || !file) throw new Error('download_unavailable')
      const bytes = new Uint8Array(await file.arrayBuffer())
      return await downloadResponse({ userId: user.id, slug: release.skill_slug, bytes,
        size: release.size_bytes, sha256: release.sha256, kind: 'paid-file',
        filename: `${release.skill_slug}-${release.version}.${!release.delivery_kind || release.delivery_kind === 'package' ? 'zip' : 'txt'}` })
    }
    const { data, error } = await paymentDb().storage.from(PACKAGE_BUCKET).createSignedUrl(release.object_path, DOWNLOAD_TTL_SECONDS,
      { download: `${release.skill_slug}-${release.version}.${!release.delivery_kind || release.delivery_kind === 'package' ? 'zip' : 'txt'}` })
    if (error || !data?.signedUrl) throw new Error('download_unavailable')
    return paymentJson({ url: data.signedUrl, version: release.version, sha256: release.sha256, expiresIn: DOWNLOAD_TTL_SECONDS })
  } catch (error) { return paymentError(error) }
}
