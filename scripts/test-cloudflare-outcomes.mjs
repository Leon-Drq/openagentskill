import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
import {sqliteD1} from './fixtures/sqlite-d1.mjs'
import {createD1ServiceFetch} from '../lib/db/cloudflare-service.ts'
import {createD1PublicFetch} from '../lib/db/cloudflare-public-write.ts'
const {sqlite,database}=sqliteD1()
for(const n of ['0001_commerce','0002_auth','0003_business','0004_catalog','0005_account_profile','0006_telemetry','0007_quality','0008_outcomes'])sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${n}.sql`,import.meta.url),'utf8'))
for(const slug of ['first','second','private'])sqlite.prepare(`INSERT INTO skills(id,slug,name,description,author_name,repository,github_repo,category,license,ai_review_approved) VALUES (?,?,'Fixture','Fixture','Fixture','https://example.invalid',?,'development','MIT',?)`).run(slug,slug,'fixture/'+slug,slug==='private'?0:1)
const client=transport=>createClient('https://d1.internal','fixture',{auth:{persistSession:false,autoRefreshToken:false},db:{retry:false},global:{fetch:transport}})
const service=client(createD1ServiceFetch(database)),publicClient=client(createD1PublicFetch(database))
const base={p_event_id:'run-001',p_skill_slug:'first',p_task:'A real task',p_agent:'production-agent',p_outcome:'success',p_install_used:true,p_metadata:{output_quality:'4.5',used_in_production:true,human_review_required:false}}
const record=async args=>{const r=await service.rpc('record_agent_outcome',{...base,...args});assert.equal(r.error,null,JSON.stringify(r.error));return r.data}
const stats=slug=>sqlite.prepare('SELECT * FROM agent_outcome_stats WHERE skill_slug=?').get(slug)
try{
 assert.ok((await publicClient.rpc('record_agent_outcome',base)).error,'Only the server may call the receipt-validated outcome writer')
 const first=await record({});assert.equal(first.success,true)
 const initial=stats('first');assert.equal(initial.total_outcomes,1);assert.equal(initial.verified_installs,1);assert.equal(initial.avg_output_quality,4.5);assert.equal(initial.production_outcomes,1)
 assert.equal(initial.agent_proven_score,Number(Math.max(0,Math.min(100,22+Math.log(2)*7.9+Math.log(2)*5.5+((1+3.4)/6*100-55)*0.52+7.5+1.5+1.5)).toFixed(1)))
 assert.equal((await record({})).id,first.id)
 assert.equal(stats('first').total_outcomes,1)
 assert.equal(sqlite.prepare('SELECT count(*) n FROM skill_feedback').get().n,1)
 assert.equal(sqlite.prepare('SELECT count(*) n FROM skill_download_receipts').get().n,1)
 await record({p_outcome:'failed',p_install_used:false,p_metadata:{output_quality:'bad',used_in_production:'FALSE',human_review_required:'TRUE'}})
 assert.equal(stats('first').verified_installs,0);assert.equal(stats('first').failed_outcomes,1);assert.equal(stats('first').human_review_required_outcomes,1)
 assert.equal(stats('first').avg_output_quality,null);assert.equal(stats('first').install_success_rate,null)
 assert.equal(sqlite.prepare('SELECT count(*) n FROM skill_feedback WHERE success=0').get().n,1)
 await record({p_skill_slug:'second',p_install_used:true})
 assert.equal(stats('first'),undefined);assert.equal(stats('second').verified_installs,1)
 assert.equal(sqlite.prepare('SELECT count(*) n FROM skill_download_receipts').get().n,1,'The original execution receipt stays unique after correction')
 assert.equal((await record({p_skill_slug:'private'})).error,'skill_not_found')
 assert.equal(stats('second').total_outcomes,1,'Rejected correction must leave accepted feedback intact')
 assert.equal((await record({p_outcome:'bogus'})).error,'invalid_outcome')
 for(const [id,extra] of [['smoke-002',{}],['run-003',{p_risk_blocked:true}],['run-004',{p_setup_required:true}],['run-005',{p_metadata:{dry_run:true}}]])await record({p_event_id:id,...extra})
 assert.equal(sqlite.prepare('SELECT count(*) n FROM skill_download_receipts').get().n,1)
 // A downstream feedback failure rolls back the outcome and its derived counters.
 sqlite.exec("CREATE TRIGGER fail_outcome_feedback BEFORE INSERT ON skill_feedback WHEN NEW.agent_id='rollback-agent' BEGIN SELECT raise(ABORT,'forced fixture'); END")
 const failed=await service.rpc('record_agent_outcome',{...base,p_event_id:'run-rollback',p_agent:'rollback-agent'})
 assert.ok(failed.error);assert.equal(sqlite.prepare("SELECT count(*) n FROM agent_outcomes WHERE event_id='run-rollback'").get().n,0)
 sqlite.exec('DROP TRIGGER fail_outcome_feedback')
 // Keep 30-day windows and invalid numeric metadata consistent with PostgreSQL.
 sqlite.exec("UPDATE agent_outcomes SET created_at='2000-01-01T00:00:00.000000Z',metadata='{\"output_quality\":\"1.2.3\"}' WHERE skill_slug='first'")
 assert.equal(stats('first').recent_outcomes_30d,0);assert.equal(stats('first').recent_success_rate,null);assert.equal(stats('first').avg_output_quality,null)
 sqlite.exec('DELETE FROM agent_outcomes')
 assert.equal(sqlite.prepare('SELECT count(*) n FROM agent_outcome_stats').get().n,0)
 console.log('D1 outcome tests passed: receipt privilege, retries, corrections, scoring, verified installs, fixture exclusion, atomic rollback and UTC windows.')
}finally{sqlite.close()}
