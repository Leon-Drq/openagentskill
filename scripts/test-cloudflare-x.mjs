import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
import {sqliteD1} from './fixtures/sqlite-d1.mjs'
import {createD1ServiceFetch} from '../lib/db/cloudflare-service.ts'
import {createD1PublicFetch} from '../lib/db/cloudflare-public-write.ts'
import {openXToken} from '../lib/db/cloudflare-x.ts'
const {sqlite,database}=sqliteD1()
for(const n of ['0001_commerce','0002_auth','0003_business','0004_catalog','0005_account_profile','0006_telemetry','0007_quality','0008_outcomes','0009_skill_writes'])sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${n}.sql`,import.meta.url),'utf8'))
const prior=process.env.INDEXER_SECRET,secret=crypto.randomUUID()+crypto.randomUUID();process.env.INDEXER_SECRET=secret
const client=transport=>createClient('https://d1.internal','fixture',{auth:{persistSession:false,autoRefreshToken:false},db:{retry:false},global:{fetch:transport}})
const service=client(createD1ServiceFetch(database)),pub=client(createD1PublicFetch(database))
const ok=async p=>{const r=await p;assert.equal(r.error,null,JSON.stringify(r.error));return r.data}
const rpc=(name,args={})=>pub.rpc(name,{p_server_secret:secret,...args})
try{
 assert.equal((await pub.rpc('get_x_oauth_connection',{p_server_secret:'wrong'})).error.code,'42501')
 assert.ok((await service.rpc('get_x_oauth_connection',{})).error)
 assert.equal(await ok(rpc('get_x_oauth_connection')),null)
 const tokens={x_user_id:'fixture-x-user',username:'fixture',scope:'tweet.read tweet.write offline.access',access_token:'fixture-access-only',refresh_token:'fixture-refresh-only',expires_at:'2026-12-01T00:00:00Z'}
 const connected=await ok(rpc('upsert_x_oauth_connection',{p_connection:tokens}));assert.equal(connected.username,'fixture');assert.equal(connected.access_token,undefined)
 const cipher=sqlite.prepare('SELECT access_token_cipher,refresh_token_cipher FROM x_oauth_connections').get()
 assert.ok(!Buffer.from(cipher.access_token_cipher).toString().includes(tokens.access_token));assert.throws(()=>openXToken(cipher.access_token_cipher,'refresh'))
 const received=await ok(rpc('get_x_oauth_connection'));assert.equal(received.access_token,tokens.access_token);assert.equal(received.refresh_token,tokens.refresh_token)
 await ok(rpc('update_x_oauth_tokens',{p_access_token:'fixture-new-access'}))
 const renewed=await ok(rpc('get_x_oauth_connection'));assert.equal(renewed.access_token,'fixture-new-access');assert.equal(renewed.refresh_token,tokens.refresh_token)
 const skill=await ok(service.from('skills').insert({slug:'x-fixture',name:'Video skill fixture',description:'Useful video workflow',author_name:'Fixture',repository:'https://github.com/fixture/source',github_repo:'fixture/source',category:'video',license:'MIT',ai_review_approved:true,github_stars:9000}).select('*').single())
 sqlite.prepare('UPDATE skills SET quality_score=80 WHERE id=?').run(skill.id)
 assert.equal((await ok(rpc('pick_x_post_skill'))).slug,skill.slug)
 const item={skill_id:skill.id,skill_slug:skill.slug,post_text:'A local fixture only',metadata:{old:1,nullable:'before'}}
 const queued=await ok(rpc('enqueue_x_content_queue_item',{p_item:item}));assert.equal(queued.status,'queued')
 assert.equal((await ok(rpc('enqueue_x_content_queue_item',{p_item:item}))).reason,'duplicate_active')
 const claims=await Promise.all([ok(rpc('claim_x_content_queue_item')),ok(rpc('claim_x_content_queue_item'))]);assert.equal(claims.filter(Boolean).length,1);assert.equal(claims.find(Boolean).skill.slug,skill.slug)
 await ok(rpc('complete_x_content_queue_item',{p_item_id:queued.id,p_status:'posted',p_x_post_id:'fixture-post-1',p_metadata:{nullable:null,flag:false,list:[1,2]}}))
 assert.deepEqual(JSON.parse(sqlite.prepare('SELECT metadata FROM x_content_queue').get().metadata),{old:1,nullable:null,flag:false,list:[1,2]})
 await ok(rpc('record_x_post',{p_post:{queue_item_id:queued.id,skill_id:skill.id,skill_slug:skill.slug,x_post_id:'fixture-post-1',post_text:'Local fixture',posted_at:new Date().toISOString()}}))
 assert.equal((await ok(rpc('enqueue_x_content_queue_item',{p_item:item}))).reason,'duplicate_posted')
 assert.equal(await ok(rpc('pick_x_post_skill')),null)
 assert.equal((await ok(rpc('get_x_post_metric_targets'))).length,1)
 await ok(rpc('record_x_post_metric',{p_metric:{x_post_id:'fixture-post-1',queue_item_id:queued.id,skill_slug:skill.slug,reply_count:2,raw_metrics:{fixture:true}}}))
 assert.equal((await ok(rpc('get_x_post_metric_targets'))).length,0)
 const draft={source_tweet_id:'fixture-tweet-1',source_author_username:'fixture',skill_slug:skill.slug,draft_text:'Local fixture reply',metadata:{outreach_kind:'creator_x_reply',auto_publish:true}}
 const first=await ok(rpc('record_x_reply_draft',{p_draft:draft}));assert.equal(first.status,'drafted')
 assert.equal((await ok(rpc('record_x_reply_draft',{p_draft:draft}))).reason,'duplicate_draft')
 await ok(rpc('record_x_reply_draft',{p_draft:{...draft,source_tweet_id:'fixture-tweet-2'}}));await ok(rpc('record_x_reply_draft',{p_draft:{...draft,source_tweet_id:'fixture-tweet-3'}}))
 const replies=await Promise.all([ok(rpc('claim_auto_creator_x_reply_draft')),ok(rpc('claim_auto_creator_x_reply_draft')),ok(rpc('claim_auto_creator_x_reply_draft'))])
 assert.equal(replies.filter(r=>r?.id).length,2);assert.equal(replies.filter(r=>r?.reason==='creator_reply_daily_cap_reached').length,1)
 const status=await ok(rpc('get_creator_outreach_status'));assert.equal(status.posting,2);assert.equal(status.queued,1)
 const claimed=replies.find(r=>r?.id)
 assert.ok((await rpc('complete_auto_creator_x_reply_draft',{p_draft_id:claimed.id,p_status:'draft'})).error)
 await ok(rpc('complete_auto_creator_x_reply_draft',{p_draft_id:claimed.id,p_status:'posted',p_x_post_id:'fixture-reply',p_metadata:{review:null}}))
 const stale=replies.find(r=>r?.id&&r.id!==claimed.id)
 sqlite.prepare('UPDATE x_reply_drafts SET updated_at=? WHERE id=?').run('2020-01-01T00:00:00.000000Z',stale.id)
 await ok(rpc('claim_auto_creator_x_reply_draft'))
 const retired=sqlite.prepare('SELECT status,metadata FROM x_reply_drafts WHERE id=?').get(stale.id);assert.equal(retired.status,'error');assert.equal(JSON.parse(retired.metadata).stale_lock_policy,'manual_review_required')
 console.log('D1 X automation passed: secret enforcement, authenticated encrypted tokens, refresh preservation, queue deduplication and exclusive claims, metrics windows, JSON merge, daily cap and stale-lock no-retry policy. No external requests were made.')
}finally{sqlite.close();if(prior===undefined)delete process.env.INDEXER_SECRET;else process.env.INDEXER_SECRET=prior}
