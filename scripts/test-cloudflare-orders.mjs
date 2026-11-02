import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { createD1OrderTransactions, updatesAfterTwelveMonths } from '../lib/payments/cloudflare-orders.ts'
import { commerceTimestamp, commerceValue } from './rehearse-cloudflare-commerce.mjs'

assert.equal(commerceTimestamp('2026-10-13 03:37:49.123456+00'),'2026-10-13T03:37:49.123456Z')
assert.equal(commerceTimestamp('2026-10-13T03:37:49.123Z'),'2026-10-13T03:37:49.123000Z')
assert.throws(()=>commerceTimestamp('2025-02-29 00:00:00+00'))
assert.throws(()=>commerceTimestamp('2026-10-13 03:37:49+08'))
assert.equal(commerceValue('livemode','false'),0)
assert.equal(commerceValue('size_bytes','209925'),209925)
assert.throws(()=>commerceValue('amount_cents','9007199254740993'))
assert.throws(()=>commerceValue('withdrawn','unknown'))
assert.equal(commerceValue('paid_at',null),null)

const db = new DatabaseSync(':memory:')
db.exec('PRAGMA foreign_keys=ON')
db.exec(readFileSync(new URL('../cloudflare/migrations/data/0001_commerce.sql', import.meta.url), 'utf8'))
const user = '10000000-0000-4000-8000-000000000001'
const other = '10000000-0000-4000-8000-000000000002'
const release = '20000000-0000-4000-8000-000000000001'
db.prepare('INSERT INTO account_identities(id) VALUES (?),(?)').run(user,other)
db.prepare(`INSERT INTO commerce_releases(id,skill_slug,version,object_path,sha256,size_bytes)
  VALUES (?,'test-skill','1',?, ?,100)`).run(release,`test-skill/1/${'a'.repeat(64)}.zip`,'a'.repeat(64))
let failRead = false
const binding = {
  prepare(sql) { return { sql, values: [], bind(...values) { return { sql, values } } } },
  async batch(statements) {
    db.exec('BEGIN IMMEDIATE')
    try {
      const results = statements.map((s,i) => {
        if (failRead && i === 1) throw new Error('private customer details')
        return { success:true, results:db.prepare(s.sql).all(...s.values).map(r=>({...r})) }
      })
      db.exec('COMMIT'); return results
    } catch(error) { db.exec('ROLLBACK'); throw error }
  },
}
const store=createD1OrderTransactions(binding)
const args = (plan='single',extra={}) => ({ p_user:user,p_live:false,p_plan:plan,
  p_slug:plan==='single'?'test-skill':null,p_release:plan==='single'?release:null,
  p_amount:{single:499,monthly:999,yearly:7900,lifetime:16900}[plan],p_customer:'cus_test',
  p_locale:'en',p_name:"Test product'); DROP TABLE commerce_orders; --",
  p_price:['monthly','yearly'].includes(plan)?'price_test':null,...extra })
const reserve=(plan,extra)=>store.rpc('commerce_reserve_order',args(plan,extra))
const complete=(id,extra={})=>store.rpc('commerce_complete_order',{p_order:id,p_session:'cs_test_'+id.replaceAll('-',''),
  p_intent:'pi_test_'+id.replaceAll('-',''),p_subscription:null,p_paid_at:'2024-02-29T12:34:56.789Z',...extra})
const count=()=>db.prepare('SELECT count(*) AS n FROM commerce_orders').get().n
const get=id=>db.prepare('SELECT * FROM commerce_orders WHERE id=?').get(id)
const clear=()=>db.exec('DELETE FROM commerce_orders')

for(const extra of [{p_user:'missing'},{p_live:'false'},{p_amount:1},{p_plan:'unknown'},
  {p_release:null},{p_slug:null},{p_locale:'invalid'},{p_price:'price_wrong'},
  {p_customer:'cus_bad\n'},{p_name:''}]) assert.ok((await reserve('single',extra)).error)
assert.equal(count(),0)
failRead=true
assert.equal((await reserve('single')).error.message,'commerce_database_unavailable')
assert.equal(count(),0,'uncertain read rolls back insertion')
failRead=false
const simultaneous=await Promise.all(Array.from({length:30},()=>reserve('single')))
assert.ok(simultaneous.every(r=>!r.error),JSON.stringify(simultaneous.map(r=>r.error?.message)))
assert.equal(new Set(simultaneous.map(r=>r.data.id)).size,1)
assert.equal(count(),1,'concurrent checkout requests share one order')
assert.equal(simultaneous[0].data.livemode,false,'D1 integer booleans are converted for application policy')
assert.equal(simultaneous[0].data.product_name,args().p_name,'bound names cannot become SQL')
assert.notEqual((await reserve('single',{p_live:true})).data.id,simultaneous[0].data.id)
assert.notEqual((await reserve('single',{p_user:other})).data.id,simultaneous[0].data.id)
assert.equal(count(),3,'separate owner and payment mode remain isolated')
assert.throws(()=>db.prepare('DELETE FROM account_identities WHERE id=?').run(user),/FOREIGN KEY/)

clear()
const membership=await Promise.all(['monthly','yearly','lifetime'].map(plan=>reserve(plan)))
assert.equal(new Set(membership.map(r=>r.data.id)).size,1,'all membership plans share a reservation')
assert.equal(membership[0].data.plan,'monthly','original immutable plan/price survives repeated checkout')
const monthly=membership[0].data
assert.equal((await complete(monthly.id,{p_intent:null,p_subscription:'sub_test'})).error,null)
const lifetime=(await reserve('lifetime')).data
assert.ok(lifetime)
assert.equal((await complete(lifetime.id)).error,null)
assert.equal((await reserve('yearly')).data.id,lifetime.id,'paid lifetime membership prevents a second charge')
assert.equal(count(),2)
const separateSingle=(await reserve('single')).data
assert.notEqual(separateSingle.id,lifetime.id,'single products do not use membership reservation')

clear()
const old=(await reserve('single')).data
db.prepare("UPDATE commerce_orders SET created_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours','-4 minutes') WHERE id=?").run(old.id)
assert.equal((await reserve('single')).data.id,old.id)
db.prepare("UPDATE commerce_orders SET created_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours','-6 minutes') WHERE id=?").run(old.id)
assert.notEqual((await reserve('single')).data.id,old.id,'reservation expires after the original 24h5m window')

clear()
const paid=(await reserve('single')).data
assert.equal((await complete(paid.id)).error,null)
assert.equal(get(paid.id).status,'paid')
assert.equal(get(paid.id).updates_until,'2025-02-28T12:34:56.789Z','leap day uses PostgreSQL calendar-month semantics')
await complete(paid.id,{p_paid_at:'2026-11-02T10:00:00.000Z'})
assert.equal(get(paid.id).paid_at,'2024-02-29T12:34:56.789Z')
assert.equal(get(paid.id).updates_until,'2025-02-28T12:34:56.789Z','replayed webhook cannot extend entitlement')
await complete(paid.id,{p_intent:'pi_other'})
assert.equal(get(paid.id).stripe_payment_intent_id,'pi_test_'+paid.id.replaceAll('-',''),'completion cannot rebind a payment')
await complete(paid.id,{p_session:'cs_other'})
assert.notEqual(get(paid.id).stripe_session_id,'cs_other')
for(const revoked of ['refunded','disputed']) {
  db.prepare('UPDATE commerce_orders SET status=? WHERE id=?').run(revoked,paid.id)
  await complete(paid.id)
  assert.equal(get(paid.id).status,revoked,'late payment cannot revive revoked access')
}
for(const recoverable of ['expired','failed']) {
  db.prepare('UPDATE commerce_orders SET status=? WHERE id=?').run(recoverable,paid.id)
  await complete(paid.id)
  assert.equal(get(paid.id).status,'paid','settled delayed payment may complete an expired checkout')
}
const second=(await reserve('single',{p_user:other})).data
assert.ok((await complete(second.id,{p_intent:get(paid.id).stripe_payment_intent_id})).error)
assert.equal(get(second.id).status,'pending','a Stripe payment cannot fulfill two different orders')
assert.ok((await complete(second.id,{p_paid_at:'2025-02-29T00:00:00Z'})).error)
assert.equal((await complete(second.id,{p_subscription:'sub_wrong'})).error,null)
assert.equal(get(second.id).status,'pending','single/lifetime purchases cannot be fulfilled as subscriptions')
assert.ok((await reserve('single',{p_user:'10000000-0000-4000-8000-000000000099'})).error)
assert.ok((await store.rpc('arbitrary_sql',{sql:'DELETE FROM commerce_orders'})).error)
assert.equal(updatesAfterTwelveMonths('2023-03-31T23:59:59Z'),'2024-03-31T23:59:59.000Z')
assert.equal(updatesAfterTwelveMonths('2024-12-31T00:00:00Z'),'2025-12-31T00:00:00.000Z')
assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok')
assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
db.close()
console.log('D1 order transactions: concurrency, ownership/mode isolation, immutable reservations/payments, lifetime deduplication, expiry, refund/dispute finality, leap-year entitlement, constraints and rollback passed.')
