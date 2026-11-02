import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
import {sqliteD1} from './fixtures/sqlite-d1.mjs'
import {createD1UserFetch} from '../lib/db/cloudflare-user-write.ts'
import {createD1ServiceFetch} from '../lib/db/cloudflare-service.ts'
import {processStripeEvent} from '../lib/payments/webhook.ts'
const {sqlite,database}=sqliteD1()
for(const n of ['0001_commerce','0002_auth','0003_business','0004_catalog','0005_account_profile'])sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${n}.sql`,import.meta.url),'utf8'))
const user='90000000-0000-4000-8000-000000000001',other='90000000-0000-4000-8000-000000000002',release='90000000-0000-4000-8000-000000000003'
sqlite.prepare('INSERT INTO account_identities(id) VALUES (?),(?)').run(user,other)
sqlite.prepare('INSERT INTO profiles(id,username) VALUES (?,NULL),(?,?)').run(user,other,'occupied')
sqlite.exec(`INSERT INTO skills(id,slug,name,description,author_name,repository,github_repo,category,license,ai_review_approved) VALUES ('public','public','Fixture','Fixture','Fixture','https://example.invalid','fixture/public','development','MIT',1),('private','private','Fixture','Fixture','Fixture','https://example.invalid','fixture/private','development','MIT',0)`)
sqlite.exec("INSERT INTO showcase_entries(slug) VALUES ('showcase'); INSERT INTO provider_skill_catalog(slug,provider,source_url) VALUES ('provider','scenario','https://example.invalid')")
const client=transport=>createClient('https://d1.internal','fixture',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},db:{retry:false},global:{fetch:transport}})
const account=client(createD1UserFetch(database,user)),anonymous=client(createD1UserFetch(database,null)),admin=client(createD1ServiceFetch(database))
try{
 assert.equal((await account.from('profiles').upsert({id:user,username:'occupied'})).error.code,'23505')
 assert.equal((await account.from('profiles').upsert({id:user,username:'first-handle',display_name:'Original'})).error,null)
 assert.equal((await account.from('profiles').upsert({id:user,username:'renamed-handle'})).error.code,'HANDLE_LOCKED')
 assert.equal((await account.from('profiles').upsert({id:other,bio:'hijack'})).error.code,'42501')
 assert.equal((await account.from('profiles').upsert({id:user,github_verified_at:new Date().toISOString()})).error.code,'42501')
 sqlite.prepare("UPDATE profiles SET github_username='verified',github_verified_at=?,x_username='verified_x',x_verified_at=?,twitter='https://x.com/verified_x' WHERE id=?").run(new Date().toISOString(),new Date().toISOString(),user)
 assert.equal((await account.from('profiles').upsert({id:user,github_username:'impersonated',x_username:'impersonated',twitter:'https://x.com/impersonated',bio:'Edited bio'})).error,null)
 const profile=sqlite.prepare('SELECT * FROM profiles WHERE id=?').get(user)
 assert.equal(profile.github_username,'verified');assert.equal(profile.x_username,'verified_x');assert.equal(profile.bio,'Edited bio')
 assert.equal((await account.from('profiles').upsert({id:user,website:'javascript:alert(1)'})).status,400)
 assert.ok((await account.from('point_events').insert({user_id:user,amount:999,event_type:'invite'})).error)
 assert.ok((await anonymous.from('bookmarks').upsert({user_id:user,skill_slug:'public'})).error)
 assert.equal((await account.from('bookmarks').upsert({user_id:user,skill_slug:'private'})).status,404)
 const repeated=await Promise.all(Array.from({length:20},()=>account.from('bookmarks').upsert({user_id:user,skill_slug:'public'},{onConflict:'user_id,skill_slug',ignoreDuplicates:true})))
 assert.ok(repeated.every(r=>!r.error));assert.equal(sqlite.prepare('SELECT count(*) n FROM bookmarks').get().n,1)
 for(const [name,key,slug] of [['set_skill_vote','skill','public'],['set_showcase_vote','showcase','showcase']]){
   assert.equal((await account.rpc(name,{target_slug:slug,direction:1})).error,null)
   assert.equal((await account.rpc(name,{target_slug:slug,direction:-1})).error,null)
   const totals=await admin.rpc(key==='skill'?'skill_vote_counts':'showcase_vote_counts',{[key==='skill'?'skill_slugs':'case_slugs']:[slug]})
   assert.equal(totals.error,null);assert.equal(totals.data[0].likes,0);assert.equal(totals.data[0].dislikes,1)
   assert.equal((await account.rpc(name,{target_slug:slug,direction:null})).error,null)
 }
 assert.equal((await account.rpc('set_skill_vote',{target_slug:'private',direction:1})).status,404)
 assert.equal((await account.rpc('set_provider_skill_engagement',{target_slug:'provider',intent:'vote',direction:1,target_saved:null})).error,null)
 assert.equal((await account.rpc('set_provider_skill_engagement',{target_slug:'provider',intent:'save',direction:null,target_saved:true})).error,null)
 assert.deepEqual((await account.from('provider_skill_engagement').select('vote,saved')).data,[{vote:1,saved:true}])
 assert.equal((await account.from('provider_skill_engagement').update({saved:false}).eq('user_id',user).eq('skill_slug','provider')).error,null)
 assert.equal((await account.from('bookmarks').delete().eq('user_id',other).eq('skill_slug','public')).status,403)
 assert.equal((await admin.from('auth_users').select('*')).error.code,'42501')
 assert.equal((await admin.from('showcase_entries').upsert({slug:'registered'},{onConflict:'slug',ignoreDuplicates:true}).select('slug').single()).data.slug,'registered')
 assert.equal((await admin.from('commerce_customers').upsert({user_id:user,livemode:false,stripe_customer_id:'cus_fixture'},{onConflict:'user_id,livemode'})).error,null)
 assert.equal((await admin.from('commerce_releases').insert({id:release,skill_slug:'public',version:'1',object_path:`public/1/${'a'.repeat(64)}.zip`,sha256:'a'.repeat(64),size_bytes:100})).error,null)
 const args={p_user:user,p_live:false,p_plan:'single',p_slug:'public',p_release:release,p_amount:499,p_customer:'cus_fixture',p_locale:'en',p_name:'Fixture',p_price:null}
 const reserved=await admin.rpc('commerce_reserve_order',args);assert.equal(reserved.error,null)
 const order=reserved.data
 const linked=await admin.from('commerce_orders').update({stripe_session_id:'cs_fixture'}).eq('id',order.id).or('stripe_session_id.is.null,stripe_session_id.eq.cs_fixture').select('*').single()
 assert.equal(linked.error,null);assert.equal(linked.data.livemode,false)
 assert.ok((await account.from('commerce_orders').update({status:'paid'}).eq('id',order.id)).error)
 assert.equal((await admin.from('commerce_orders').update({status:'paid'})).status,400,'Unbounded service writes fail')
 const session={id:'cs_fixture',metadata:{integration:'openagentskill',order_id:order.id,user_id:user},client_reference_id:order.id,livemode:false,customer:'cus_fixture',currency:'usd',amount_total:499,mode:'payment',status:'complete',payment_status:'paid',payment_intent:'pi_fixture',subscription:null}
 const intent={id:'pi_fixture',status:'succeeded',livemode:false,amount:499,amount_received:499,currency:'usd',customer:'cus_fixture',metadata:session.metadata,latest_charge:{id:'ch_fixture',paid:true,refunded:false,amount_refunded:0,amount:499,disputed:false,payment_intent:'pi_fixture'}}
 const stripe={checkout:{sessions:{retrieve:async()=>session}},paymentIntents:{retrieve:async()=>intent},charges:{retrieve:async()=>intent.latest_charge}}
 const event={id:'evt_fixture',type:'checkout.session.completed',livemode:false,created:1772366400,data:{object:{id:'cs_fixture'}}}
 process.env.STRIPE_SECRET_KEY='sk_test_fixture_never_a_real_key'
 process.env.HOSTING_PROVIDER='cloudflare';process.env.COMMERCE_ENVIRONMENT='sandbox';process.env.COMMERCE_SITE_URL='https://openagentskill-migration.qudongqi2023.workers.dev'
 await processStripeEvent(stripe,event,admin);await processStripeEvent(stripe,event,admin)
 assert.equal((await admin.from('commerce_orders').select('*').eq('id',order.id).single()).data.status,'paid')
 assert.equal((await admin.from('commerce_webhook_events').select('*',{count:'exact'})).count,1)
 // A delayed success webhook must never restore a refunded purchase.
 intent.latest_charge.refunded=true;intent.latest_charge.amount_refunded=499
 await processStripeEvent(stripe,{...event,id:'evt_refund',type:'charge.refunded',data:{object:{id:'ch_fixture'}}},admin)
 intent.latest_charge.refunded=false;intent.latest_charge.amount_refunded=0
 await processStripeEvent(stripe,{...event,id:'evt_delayed'},admin)
 assert.equal((await admin.from('commerce_orders').select('*').eq('id',order.id).single()).data.status,'refunded')
 const before=sqlite.prepare('SELECT count(*) n FROM commerce_customers').get().n
 assert.ok((await admin.from('commerce_customers').insert([{user_id:other,livemode:false,stripe_customer_id:'cus_other'},{user_id:other,livemode:false,stripe_customer_id:'cus_duplicate'}])).error)
 assert.equal(sqlite.prepare('SELECT count(*) n FROM commerce_customers').get().n,before,'A failed batch rolls back every write')
 assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(),[])
 console.log('Cloudflare writes passed: own profile and verified identity, voting/bookmark idempotency, private service boundary, real order/webhook flow, delayed refund protection and rollback. No network or charge.')
}finally{sqlite.close()}
