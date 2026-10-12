import { NextRequest } from 'next/server'
import { z } from 'zod'
import { buyer, paymentBody, paymentDb, paymentError, PaymentError, paymentJson, paymentSite } from '@/lib/payments/server'
import { paymentMode, stripeClient } from '@/lib/payments/stripe'
import { safeStripeRedirect } from '@/lib/payments/policy'

export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  try {
    const parsed = z.object({ locale: z.enum(['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']).default('en') }).strict().safeParse(await paymentBody(request))
    if (!parsed.success) throw new PaymentError('invalid_body')
    const user = await buyer()
    const { data, error } = await paymentDb().from('commerce_customers').select('stripe_customer_id').eq('user_id', user.id).eq('livemode', paymentMode() === true).maybeSingle()
    if (error) throw error
    if (!data) throw new PaymentError('no_billing_account', 404)
    const session = await stripeClient().billingPortal.sessions.create({ customer: data.stripe_customer_id,
      return_url: `${paymentSite()}/profile?tab=purchases&lang=${parsed.data.locale}` })
    const url = safeStripeRedirect(session.url, 'portal')
    if (!url) throw new Error('invalid_portal_url')
    return paymentJson({ url })
  } catch (error) { return paymentError(error) }
}
