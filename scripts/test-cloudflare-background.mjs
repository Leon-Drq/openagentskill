import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
import {sqliteD1} from './fixtures/sqlite-d1.mjs'
import {createD1ServiceFetch} from '../lib/db/cloudflare-service.ts'
import {createD1PublicFetch} from '../lib/db/cloudflare-public-write.ts'
const {sqlite,database}=sqliteD1()
for(const n of ['0001_commerce','0002_auth','0003_business','0004_catalog','0005_account_profile','0006_telemetry','0007_quality','0008_outcomes'])sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${n}.sql`,import.meta.url),'utf8'))
const prior=process.env.INDEXER_SECRET,secret=crypto.randomUUID()+crypto.randomUUID();process.env.INDEXER_SECRET=secret
const client=transport=>createClient('https://d1.internal','fixture',{auth:{persistSession:false,autoRefreshToken:false},db:{retry:false},global:{fetch:transport}})
const service=client(createD1ServiceFetch(database)),pub=client(createD1PublicFetch(database))
const ok=async p=>{const r=await p;assert.equal(r.error,null,JSON.stringify(r.error));return r.data}
try{
 assert.equal((await pub.rpc('record_indexer_run',{p_server_secret:'wrong',p_run:{}})).error.code,'42501')
 assert.ok((await service.rpc('record_indexer_run',{p_run:{}})).error)
 assert.equal(sqlite.prepare('SELECT count(*) n FROM indexer_runs').get().n,0)
 const run=await ok(pub.rpc('record_indexer_run',{p_server_secret:secret,p_run:{mode:'fixture',imported:3,metadata:{test:true}}}))
 assert.equal(run.mode,'fixture');assert.equal(run.imported,3);assert.equal(run.completed_at,null);assert.deepEqual(run.metadata,{test:true})
 assert.equal((await ok(pub.rpc('list_indexer_runs',{p_server_secret:secret,p_limit:5})))[0].id,run.id)
 assert.ok((await pub.from('indexer_runs').select('*')).error)
 for(const slug of ['first','second','private'])sqlite.prepare(`INSERT INTO skills(id,slug,name,description,author_name,repository,github_repo,category,license,ai_review_approved) VALUES (?,?,'Fixture','Fixture','Fixture','https://example.invalid',?,'development','MIT',?)`).run(slug,slug,'fixture/'+slug,slug==='private'?0:1)
 const updated=await ok(pub.rpc('update_skill_github_metadata',{p_server_secret:secret,p_slug:'first',p_github_stars:999,p_github_forks:20,p_github_language:'TypeScript',p_github_last_pushed_at:new Date().toISOString()}))
 assert.equal(updated.skill.github_stars,999);assert.equal(updated.skill.github_forks,20);assert.equal(updated.skill.ai_review_approved,true)
 assert.equal(JSON.parse(sqlite.prepare("SELECT quality_signals FROM skills WHERE slug='first'").get().quality_signals).star_score,21)
 assert.equal(await ok(service.rpc('refresh_skill_quality_scores',{p_slug:'first'})),1)
 for(let i=1;i<=3;i++)sqlite.prepare(`INSERT INTO skill_candidates(id,source_key,github_full_name,github_owner,github_repo,canonical_source_url,github_stars,status,next_attempt_at)
 VALUES (?,?,?,'fixture',?,?,?,'discovered','2000-01-01T00:00:00.000000Z')`).run('c'+i,'source'+i,'fixture/c'+i,'c'+i,'https://github.com/fixture/c'+i,i*100)
 const claim=worker=>ok(service.rpc('claim_skill_candidates',{p_statuses:['discovered'],p_limit:1,p_worker_id:worker,p_lease_seconds:120}))
 const claims=await Promise.all([claim('worker-aaa'),claim('worker-bbb')])
 assert.equal(claims[0][0].id,'c3');assert.equal(claims[1][0].id,'c2');assert.equal(claims[0][0].attempt_count,1)
 assert.ok((await pub.rpc('claim_skill_candidates',{p_statuses:['discovered'],p_limit:1,p_worker_id:'worker-evil'})).error)
 sqlite.prepare("UPDATE skill_candidates SET lease_expires_at='2000-01-01T00:00:00.000000Z' WHERE id='c3'").run()
 assert.equal((await claim('worker-ccc'))[0].attempt_count,2)
 const coverage=await ok(service.rpc('refresh_registry_coverage_stats',{}))
 assert.equal(coverage.id,true);assert.equal(coverage.discovered_projects,5);assert.equal(coverage.installable_skills,2);assert.equal(coverage.validated_skills,2)
 const end=new Date().toISOString().slice(0,10),yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10)
 for(const [slug,views,copies] of [['first',40,2],['second',5,0],['private',9999,999]])sqlite.prepare('INSERT INTO skill_events_daily(skill_slug,event_date,views,install_copies) VALUES (?,?,?,?)').run(slug,yesterday,views,copies)
 const trending=await ok(service.rpc('get_trending_activity_candidates',{window_end:end,page_size:100,page_offset:0}))
 assert.equal(trending.length,2);assert.equal(trending[0].skill.slug,'first');assert.equal(trending[0].candidate_count,2)
 assert.equal(trending[0].activity.total_events,42);assert.ok(Math.abs(trending[0].score-(Math.log(1+(30+2*8)*1.35)*16+4))<1e-9)
 assert.deepEqual(trending[0].skill.tags,[])
 assert.deepEqual(await ok(service.rpc('get_trending_activity_candidates',{window_end:'2000-01-01'})),[])
 console.log('D1 background tests passed: secret checks, typed run logs, metadata quality refresh, atomic exclusive leases, coverage and UTC trending.')
}finally{sqlite.close();if(prior===undefined)delete process.env.INDEXER_SECRET;else process.env.INDEXER_SECRET=prior}
