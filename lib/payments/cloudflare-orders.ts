import 'server-only'
import { randomUUID } from 'node:crypto'
import { PLAN_AMOUNTS, type PaidOrder, type PurchasePlan } from './policy'

interface Statement { bind(...values: (string | number | null)[]): Statement }
interface Result { success: boolean; results?: Record<string, unknown>[] }
export interface CommerceDatabase {
  prepare(sql: string): Statement
  batch(statements: Statement[]): Promise<Result[]>
}
const uuid = (value: unknown): value is string => typeof value === 'string'
  && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)
const stripeId = (value: unknown, prefix: string): value is string => typeof value === 'string'
  && new RegExp(`^${prefix}_[A-Za-z0-9_]{1,240}$`).test(value)
const cutoff = "(strftime('%Y-%m-%dT%H:%M:%f','now','-24 hours','-5 minutes') || '000Z')"
const candidate = `user_id = ?2 AND livemode = ?3 AND (
  (?5 IS NULL AND plan = 'lifetime' AND status = 'paid') OR
  (status = 'pending' AND skill_slug IS ?5 AND created_at > ${cutoff}))`

// PostgreSQL adds calendar months with day clamping. SQLite's default +12 months
// and JS setUTCFullYear both roll February 29 forward instead; clamp explicitly.
export function updatesAfterTwelveMonths(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) throw new Error('invalid_paid_at')
  const paid = new Date(value)
  if (!Number.isFinite(paid.getTime()) || paid.toISOString().slice(0,19) !== value.slice(0,19)) throw new Error('invalid_paid_at')
  const result = new Date(paid)
  const month = paid.getUTCMonth(), day = paid.getUTCDate()
  result.setUTCDate(1)
  result.setUTCFullYear(paid.getUTCFullYear() + 1)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), month + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result.toISOString()
}

/** Server-private replacement for the two PostgreSQL order RPCs.
 * It does not authenticate callers or validate Stripe events. Only the verified
 * checkout/webhook service may call it. It is not exposed by a generic SQL API.
 */
export function createD1OrderTransactions(db: CommerceDatabase) {
  return { async rpc(name: string, args: Record<string, unknown>): Promise<{
    data: PaidOrder | null; error: Error | null;
  }> {
    try {
      if (name === 'commerce_reserve_order') {
        const { p_user: user, p_live: live, p_plan: plan, p_slug: slug, p_release: release,
          p_amount: amount, p_customer: customer, p_locale: locale, p_name: product, p_price: price } = args
        if (!uuid(user) || typeof live !== 'boolean' || typeof plan !== 'string'
          || !Object.hasOwn(PLAN_AMOUNTS, plan) || amount !== PLAN_AMOUNTS[plan as PurchasePlan]
          || !stripeId(customer, 'cus') || typeof product !== 'string' || !product.length || product.length > 500
          || typeof locale !== 'string' || !['en','zh','ja','ko','es','de','fr','id'].includes(locale)
          || (price !== null && !stripeId(price, 'price'))
          || (['monthly','yearly'].includes(plan) ? price === null : price !== null)
          || (plan === 'single' ? typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,199}$/.test(slug) || !uuid(release)
            : slug !== null || release !== null)) throw new Error('invalid_reservation')
        const id = randomUUID()
        const values = [id, user, Number(live), plan, slug, release, amount, customer, locale, product, price] as (string | number | null)[]
        // Conditional INSERT serializes on D1's writer. Both statements run in
        // one batch transaction, retaining the result of the same reservation.
        // A result-read failure rolls back the insert before any Stripe call.
        const results = await db.batch([
          db.prepare(`INSERT INTO commerce_orders
            (id,user_id,livemode,plan,skill_slug,release_id,amount_cents,currency,stripe_customer_id,checkout_locale,product_name,stripe_price_id,created_at)
            SELECT ?1,?2,?3,?4,?5,?6,?7,'usd',?8,?9,?10,?11,(strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z')
            WHERE NOT EXISTS (SELECT 1 FROM commerce_orders WHERE ${candidate})
            RETURNING id`).bind(...values),
          db.prepare(`SELECT * FROM commerce_orders WHERE id = ?1 OR (${candidate})
            ORDER BY (plan = 'lifetime' AND status = 'paid') DESC, created_at DESC, rowid DESC LIMIT 1`)
            .bind(id, user, Number(live), plan, slug as string | null),
        ])
        if (results.length !== 2 || results.some(result => !result.success)) throw new Error('database_unavailable')
        const row = results[1].results?.[0]
        if (!row || (row.livemode !== 0 && row.livemode !== 1)) throw new Error('reservation_missing')
        return { data: { ...row, livemode: row.livemode === 1 } as unknown as PaidOrder, error: null }
      }
      if (name === 'commerce_complete_order') {
        const { p_order: order, p_session: session, p_intent: intent, p_subscription: subscription, p_paid_at: paidAt } = args
        if (!uuid(order) || !stripeId(session, 'cs') || (intent !== null && !stripeId(intent, 'pi'))
          || (subscription !== null && !stripeId(subscription, 'sub')) || typeof paidAt !== 'string'
          || (!intent && !subscription)) throw new Error('invalid_completion')
        const until = updatesAfterTwelveMonths(paidAt)
        const normalized = new Date(paidAt).toISOString()
        const results = await db.batch([db.prepare(`UPDATE commerce_orders SET status = 'paid',
          stripe_session_id = ?2, stripe_payment_intent_id = ?3, stripe_subscription_id = ?4,
          paid_at = coalesce(paid_at,?5),
          updates_until = CASE WHEN plan = 'single' THEN coalesce(updates_until,?6) ELSE NULL END
          WHERE id = ?1 AND status IN ('pending','expired','failed','paid')
            AND (stripe_session_id IS NULL OR stripe_session_id = ?2)
            AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id IS ?3)
            AND (stripe_subscription_id IS NULL OR stripe_subscription_id IS ?4)
            AND ((plan IN ('single','lifetime') AND ?3 IS NOT NULL AND ?4 IS NULL)
              OR (plan IN ('monthly','yearly') AND ?4 IS NOT NULL))`)
          .bind(order, session, intent as string | null, subscription as string | null, normalized, until)])
        if (results.length !== 1 || !results[0].success) throw new Error('database_unavailable')
        return { data: null, error: null }
      }
      throw new Error('unsupported_operation')
    } catch {
      // SQL/driver errors may contain bound customer data. Return only a code.
      return { data: null, error: new Error('commerce_database_unavailable') }
    }
  } }
}
