import { NextRequest } from 'next/server'
import { z } from 'zod'
import { buyer, downloadableRelease, paymentBody, paymentError, PaymentError, paymentJson, releaseText } from '@/lib/payments/server'

export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  try {
    const parsed = z.object({ slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,199}$/) }).strict().safeParse(await paymentBody(request))
    if (!parsed.success) throw new PaymentError('invalid_body')
    const user = await buyer()
    // Re-check payment/refund and subscription state with Stripe before reading.
    const release = await downloadableRelease(user.id, parsed.data.slug)
    const text = await releaseText(release)
    return paymentJson({ text, kind: release.delivery_kind, version: release.version, sha256: release.sha256 })
  } catch (error) { return paymentError(error) }
}
