import { NextRequest } from 'next/server'
import { paymentJson } from '@/lib/payments/server'
import { stripeClient } from '@/lib/payments/stripe'
import { processStripeEvent } from '@/lib/payments/webhook'

export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return paymentJson({ error: 'webhook_not_configured' }, 503)
  const signature = request.headers.get('stripe-signature')
  if (!signature) return paymentJson({ error: 'invalid_signature' }, 400)
  const raw = await request.text()
  if (raw.length > 1048576) return paymentJson({ error: 'invalid_body' }, 413)
  const stripe = stripeClient()
  let event
  try { event = stripe.webhooks.constructEvent(raw, signature, secret) }
  catch { return paymentJson({ error: 'invalid_signature' }, 400) }
  try {
    await processStripeEvent(stripe, event)
    return paymentJson({ received: true })
  } catch {
    console.error('[commerce] webhook processing failed', event.id, event.type)
    return paymentJson({ error: 'webhook_retry' }, 503)
  }
}
