import { NextRequest } from 'next/server'
import { z } from 'zod'
import { buyer, paymentBody, paymentDb, paymentError, PaymentError, paymentJson } from '@/lib/payments/server'
import { paymentMode, stripeClient } from '@/lib/payments/stripe'

export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  try {
    const parsed = z.object({ orderId: z.string().uuid() }).strict().safeParse(await paymentBody(request))
    if (!parsed.success) throw new PaymentError('invalid_body')
    const user = await buyer(), db = paymentDb()
    const { data: order, error } = await db.from('commerce_orders').select('*').eq('id', parsed.data.orderId).eq('user_id', user.id).eq('livemode', paymentMode() === true).maybeSingle()
    if (error) throw error
    if (!order || order.status !== 'pending' || !order.stripe_session_id) throw new PaymentError('payment_processing', 409)
    const stripe = stripeClient()
    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
    if (session.status === 'complete') throw new PaymentError('payment_processing', 409)
    if (session.status === 'open') await stripe.checkout.sessions.expire(session.id)
    const result = await db.from('commerce_orders').update({ status: 'expired' }).eq('id', order.id).eq('status', 'pending')
    if (result.error) throw result.error
    return paymentJson({ canceled: true })
  } catch (error) { return paymentError(error) }
}
