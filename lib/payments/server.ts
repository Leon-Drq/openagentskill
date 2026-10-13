import 'server-only'
import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withTimeout } from '@/lib/async'
import { getMotionEntry } from '@/lib/motion/catalog'
import { STUDIO_SKILL } from '@/lib/studio/catalog'
import { validRelease, type PackageRelease, type PaidOrder, PACKAGE_BUCKET, singleReleaseAllowed } from './policy'
import { inspectMembership, inspectPayment, paymentMode, stripeClient } from './stripe'

export const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie', 'Referrer-Policy': 'no-referrer' }
export const paymentJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: privateHeaders })
export class PaymentError extends Error {
  constructor(public code: string, public status = 400) { super(code) }
}
export function paymentError(error: unknown) {
  if (error instanceof PaymentError) return paymentJson({ error: error.code }, error.status)
  // Never put SDK objects, user data or payment secrets into responses/logs.
  console.error('[commerce] request failed', error instanceof Error ? error.name : 'Error')
  return paymentJson({ error: 'temporarily_unavailable' }, 503)
}
export const paymentDb = () => createAdminClient({ requestTimeoutMs: 10000 })
export async function buyer() {
  const client = await createClient()
  const { data: { user }, error } = await withTimeout(client.auth.getUser(), 8000, 'commerce account')
  if (!user || user.is_anonymous) throw new PaymentError('sign_in_required', 401)
  if (error) throw error
  return user
}
export async function paymentBody(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) throw new PaymentError('invalid_origin', 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new PaymentError('invalid_body', 415)
  const body = await request.text()
  if (body.length > 2048) throw new PaymentError('invalid_body', 413)
  try { return JSON.parse(body) } catch { throw new PaymentError('invalid_body') }
}
export function paymentSite() {
  const site = new URL(process.env.COMMERCE_SITE_URL || 'https://www.openagentskill.com')
  if (site.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && site.hostname === 'localhost')) throw new Error('invalid_commerce_site')
  return site.origin
}
export function productDefinition(slug: string) {
  if (slug === STUDIO_SKILL.slug) return { slug, name: STUDIO_SKILL.name, path: STUDIO_SKILL.path }
  const motion = getMotionEntry(slug)
  return motion ? { slug, name: motion.title, path: `/skills/${slug}` } : null
}
export async function releases(slug?: string) {
  let query = paymentDb().from('commerce_releases').select('*').eq('withdrawn', false).lte('released_at', new Date().toISOString()).order('released_at', { ascending: false })
  if (slug) query = query.eq('skill_slug', slug)
  const { data, error } = await query.limit(1000)
  if (error) throw error
  return (data as PackageRelease[]).filter(row => Boolean(productDefinition(row.skill_slug)) && validRelease(row, row.skill_slug))
}
export async function verifyPackage(release: PackageRelease) {
  const { data, error } = await paymentDb().storage.from(PACKAGE_BUCKET).info(release.object_path)
  if (error || !data || Number(data.size) !== release.size_bytes) throw new PaymentError('package_unavailable', 409)
}
// Called only after entitlement checks (or by checkout to validate delivery).
// Plain text stays in private Storage, never in the public motion catalog.
export async function releaseText(release: PackageRelease) {
  if (!validRelease(release, release.skill_slug) || !['prompt', 'skill-instructions'].includes(release.delivery_kind || '')) throw new PaymentError('package_unavailable', 409)
  const { data, error } = await paymentDb().storage.from(PACKAGE_BUCKET).download(release.object_path)
  if (error || !data) throw new PaymentError('package_unavailable', 409)
  const bytes = Buffer.from(await data.arrayBuffer())
  if (bytes.length !== release.size_bytes || createHash('sha256').update(bytes).digest('hex') !== release.sha256) throw new PaymentError('package_unavailable', 409)
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}
export async function paidOrders(userId: string) {
  const { data, error } = await paymentDb().from('commerce_orders').select('*').eq('user_id', userId)
    .eq('livemode', paymentMode() === true).eq('status', 'paid').order('created_at', { ascending: false }).limit(1000)
  if (error) throw error
  return data as PaidOrder[]
}
export async function membershipFor(userId: string) {
  const { data, error } = await paymentDb().from('commerce_subscriptions').select('stripe_subscription_id')
    .eq('user_id', userId).eq('livemode', paymentMode() === true).order('updated_at', { ascending: false }).limit(10)
  if (error) throw error
  if (!data.length || paymentMode() === null) return null
  const stripe = stripeClient()
  for (const row of data) {
    const result = await inspectMembership(stripe, row.stripe_subscription_id)
    if (result.subscription.metadata.user_id !== userId) continue
    if (result.active) return result
  }
  return null
}
export async function downloadableRelease(userId: string, slug: string) {
  const [available, orders] = await Promise.all([releases(slug), paidOrders(userId)])
  if (!available.length) throw new PaymentError('package_unavailable', 409)
  const stripe = stripeClient()
  for (const order of orders.filter(row => row.skill_slug === slug && row.plan === 'single')) {
    const release = available.find(row => singleReleaseAllowed(order, row, userId, paymentMode() === true))
    if (release && order.stripe_payment_intent_id) {
      const state = await inspectPayment(stripe, order.stripe_payment_intent_id)
      if (state.paid && state.intent?.metadata.order_id === order.id) return release
    }
  }
  if (await membershipFor(userId)) return available[0]
  throw new PaymentError('purchase_required', 403)
}
