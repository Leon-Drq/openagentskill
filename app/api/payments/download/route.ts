import { NextRequest } from 'next/server'
import { z } from 'zod'
import { buyer, downloadableRelease, paymentBody, paymentDb, paymentError, PaymentError, paymentJson, verifyPackage } from '@/lib/payments/server'
import { DOWNLOAD_TTL_SECONDS, PACKAGE_BUCKET } from '@/lib/payments/policy'

export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  try {
    const parsed = z.object({ slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,199}$/) }).strict().safeParse(await paymentBody(request))
    if (!parsed.success) throw new PaymentError('invalid_body')
    const user = await buyer()
    const release = await downloadableRelease(user.id, parsed.data.slug)
    await verifyPackage(release)
    const { data, error } = await paymentDb().storage.from(PACKAGE_BUCKET).createSignedUrl(release.object_path, DOWNLOAD_TTL_SECONDS,
      { download: `${release.skill_slug}-${release.version}.${!release.delivery_kind || release.delivery_kind === 'package' ? 'zip' : 'txt'}` })
    if (error || !data?.signedUrl) throw new Error('download_unavailable')
    return paymentJson({ url: data.signedUrl, version: release.version, sha256: release.sha256, expiresIn: DOWNLOAD_TTL_SECONDS })
  } catch (error) { return paymentError(error) }
}
