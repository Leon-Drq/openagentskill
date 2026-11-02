import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
import {sqliteD1} from './fixtures/sqlite-d1.mjs'
import {createD1PublicFetch} from '../lib/db/cloudflare-public-write.ts'
import {createD1ServiceFetch} from '../lib/db/cloudflare-service.ts'
const {sqlite,database}=sqliteD1()
for(const n of ['0001_commerce','0002_auth','0003_business','0004_catalog','0005_account_profile','0006_telemetry','0007_quality'])sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${n}.sql`,import.meta.url),'utf8'))
const user='a0000000-0000-4000-8000-000000000001'
sqlite.prepare('INSERT INTO account_identities(id) VALUES (?)').run(user)
sqlite.prepare('INSERT INTO profiles(id) VALUES (?)').run(user)
for(const slug of ['first','second','private'])sqlite.prepare(`INSERT INTO skills(id,slug,name,description,author_name,repository,github_repo,category,license,ai_review_approved) VALUES (?,?,'Fixture','Fixture','Fixture','https://example.invalid',?,'development','MIT',?)`).run(slug,slug,'fixture/'+slug,slug==='private'?0:1)
const client=transport=>createClient('https://d1.internal','fixture',{auth:{persistSession:false,autoRefreshToken:false},db:{retry:false},global:{fetch:transport}})
const publicClient=client(createD1PublicFetch(database)),service=client(createD1ServiceFetch(database))
const base={skill_slug:'first',event_type:'view',source:'web',is_verified:false,metadata:{}}
try{
 assert.equal((await publicClient.from('skill_events').insert({...base,skill_slug:'private'})).error.code,'42501')
 for(const extra of [{user_id:user},{source:'agent'},{is_verified:true},{event_type:'install_success'},{created_at:'2000-01-01T00:00:00Z'},{metadata:[]}])assert.ok((await publicClient.from('skill_events').insert({...base,...extra})).error)
 assert.equal((await publicClient.from('skill_events').insert(base)).error,null)
 assert.equal(sqlite.prepare("SELECT views FROM skill_event_stats WHERE skill_slug='first'").get().views,1)
 const events=[{event_key:'fixture-1',skill_slug:'first',event_type:'view',created_at:'2026-10-01T23:59:59.999999Z'},
 {event_key:'fixture-2',skill_slug:'first',event_type:'install_copy',created_at:'2026-10-02T00:00:00.000000Z'},
 {event_key:'fixture-3',skill_slug:'second',event_type:'outbound_github',created_at:'2026-10-02T01:00:00.000000Z'}]
 assert.equal((await service.from('skill_events').insert(events)).error,null)
 const compare=()=>{
  for(const slug of ['first','second']){
   const expected=sqlite.prepare('SELECT count(*) n,sum(event_type=?) views,sum(event_type=?) copies,sum(event_type IN (?,?)) outbound,max(created_at) last FROM skill_events WHERE skill_slug=?').get('view','install_copy','outbound_github','outbound_docs',slug)
   const actual=sqlite.prepare('SELECT * FROM skill_event_stats WHERE skill_slug=?').get(slug)
   if(!expected.n)assert.equal(actual,undefined)
   else{assert.equal(actual.total_events,expected.n);assert.equal(actual.views,expected.views);assert.equal(actual.install_copies,expected.copies);assert.equal(actual.outbound_clicks,expected.outbound);assert.equal(actual.last_event_at,expected.last)}
  }
  const expected=sqlite.prepare('SELECT skill_slug,substr(created_at,1,10) event_date,count(*) total_events,min(created_at) first_event_at,max(created_at) last_event_at FROM skill_events GROUP BY 1,2 ORDER BY 1,2').all()
  const actual=sqlite.prepare('SELECT skill_slug,event_date,total_events,first_event_at,last_event_at FROM skill_events_daily ORDER BY 1,2').all()
  assert.deepEqual(actual,expected)
 }
 compare()
 assert.equal((await service.from('skill_events').upsert({...events[1],skill_slug:'second',event_type:'outbound_docs',created_at:'2026-10-03T00:00:00.000000Z'},{onConflict:'event_key'})).error,null)
 compare()
 assert.equal((await service.from('skill_events').delete().eq('event_key','fixture-1')).error,null);compare()
 assert.equal((await service.from('skill_events').delete().eq('skill_slug','second')).error,null);compare()
 const before=sqlite.prepare('SELECT count(*) n FROM skill_events').get().n
 assert.ok((await service.from('skill_events').insert([{...events[0],event_key:'rollback-1'},{...events[1],event_key:'rollback-2',skill_slug:'missing'}])).error)
 assert.equal(sqlite.prepare('SELECT count(*) n FROM skill_events').get().n,before);compare()
 const downloaded=await service.rpc('record_skill_download',{p_user_id:user,p_slug:'first',p_sha256:'a'.repeat(64),p_kind:'paid-file'})
 assert.equal(downloaded.error,null);assert.equal(downloaded.data,1)
 assert.equal((await service.rpc('record_skill_download_action',{p_user_id:null,p_visitor_key:'b'.repeat(64),p_slug:'first',p_kind:'external-open'})).data,2)
 assert.equal((await service.rpc('record_skill_download_action',{p_user_id:user,p_visitor_key:null,p_slug:'first',p_kind:'command-copy'})).data,3)
 assert.equal(sqlite.prepare("SELECT site_downloads FROM skills WHERE slug='first'").get().site_downloads,3)
 assert.ok((await publicClient.rpc('record_skill_download',{p_user_id:user,p_slug:'first',p_sha256:'a'.repeat(64),p_kind:'paid-file'})).error)
 assert.ok((await service.rpc('record_skill_download_action',{p_user_id:null,p_visitor_key:null,p_slug:'first',p_kind:'external-open'})).error)
 // Retries for a source execution carry one unique receipt, even when corrected.
 sqlite.prepare("INSERT INTO skill_download_receipts(skill_slug,artifact_kind,source_event_key) VALUES ('first','agent-use','outcome:one') ON CONFLICT DO NOTHING").run()
 sqlite.prepare("INSERT INTO skill_download_receipts(skill_slug,artifact_kind,source_event_key) VALUES ('first','agent-use','outcome:one') ON CONFLICT DO NOTHING").run()
 assert.equal(sqlite.prepare("SELECT downloads FROM skill_download_totals WHERE skill_slug='first'").get().downloads,4)
 sqlite.prepare(`UPDATE skills SET github_stars=99,verified=1,tags='["a","b","c"]',ai_review_score='{"total":80}',author_user_id=? WHERE slug='second'`).run(user)
 for(let i=0;i<20;i++){
  const feedback=await publicClient.rpc('record_agent_feedback',{p_skill_slug:'second',p_agent_id:'production-agent',p_success:true,p_latency_ms:100})
  assert.equal(feedback.error,null);assert.equal(feedback.data.points_awarded,1)
 }
 const usage=sqlite.prepare("SELECT * FROM skill_stats WHERE skill_slug='second'").get()
 assert.equal(usage.total_calls,20);assert.equal(usage.unique_agents,1);assert.equal(usage.success_rate,100);assert.equal(usage.avg_latency_ms,100)
 const scored=sqlite.prepare("SELECT quality_score,quality_signals FROM skills WHERE slug='second'").get()
 assert.equal(scored.quality_score,76);assert.deepEqual(JSON.parse(scored.quality_signals),{star_score:14,review_score:12,freshness_score:15,usage_score:20,metadata_score:15,model:'v2'})
 assert.equal(sqlite.prepare('SELECT sum(amount) n FROM point_events WHERE user_id=?').get(user).n,20)
 assert.equal(sqlite.prepare("SELECT count(*) n FROM activity_feed WHERE event_type='skill_called'").get().n,20)
 assert.equal(sqlite.prepare("SELECT downloads FROM skill_download_totals WHERE skill_slug='second'").get().downloads,20)
 for(const agent of ['fixture-run','smoke_check','production-agent']){
  const feedback=await publicClient.rpc('record_agent_feedback',{p_skill_slug:'second',p_agent_id:agent,p_success:false,p_latency_ms:200,p_metadata:{source:agent==='production-agent'?'web-widget':'sdk'}})
  assert.equal(feedback.error,null)
 }
 assert.equal(sqlite.prepare("SELECT downloads FROM skill_download_totals WHERE skill_slug='second'").get().downloads,20,'Fixture and browser feedback cannot count as Agent executions')
 assert.equal((await publicClient.rpc('record_agent_feedback',{p_skill_slug:'private',p_agent_id:'production-agent',p_success:true})).data.error,'skill_not_found')
 assert.equal(sqlite.prepare("SELECT count(*) n FROM skill_feedback WHERE skill_slug='private'").get().n,0)
 sqlite.exec("DELETE FROM skill_feedback WHERE skill_slug='second'")
 assert.equal(sqlite.prepare("SELECT usage_score FROM (SELECT json_extract(quality_signals,'$.usage_score') usage_score FROM skills WHERE slug='second')").get().usage_score,0)
 sqlite.exec("DELETE FROM skills WHERE slug='first'")
 assert.equal(sqlite.prepare("SELECT count(*) n FROM skill_event_stats WHERE skill_slug='first'").get().n,0)
 assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(),[])
 console.log('Cloudflare telemetry passed: anonymous publication/verification restrictions, UTC day boundaries, corrected events, atomic aggregate rollback, download totals and execution deduplication.')
}finally{sqlite.close()}
