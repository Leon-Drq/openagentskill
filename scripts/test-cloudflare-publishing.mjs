import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
import {sqliteD1} from './fixtures/sqlite-d1.mjs'
import {createD1ServiceFetch} from '../lib/db/cloudflare-service.ts'
import {createD1PublicFetch} from '../lib/db/cloudflare-public-write.ts'
const {sqlite,database}=sqliteD1()
for(const n of ['0001_commerce','0002_auth','0003_business','0004_catalog','0005_account_profile','0006_telemetry','0007_quality','0008_outcomes','0009_skill_writes'])sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${n}.sql`,import.meta.url),'utf8'))
const client=transport=>createClient('https://d1.internal','fixture',{auth:{persistSession:false,autoRefreshToken:false},db:{retry:false},global:{fetch:transport}})
const service=client(createD1ServiceFetch(database)),pub=client(createD1PublicFetch(database))
const ok=async p=>{const r=await p;assert.equal(r.error,null,JSON.stringify(r.error));return r.data}
const p={slug:'owner-fixture',name:'Video processing',description:'Process video footage',long_description:'Fixture document',author_name:'Fixture',author_url:'https://github.com/fixture',repository:'https://github.com/fixture/source',github_repo:'fixture/source',github_stars:10,github_forks:1,github_language:null,github_last_pushed_at:'2026-10-01T00:00:00Z',category:'video',tags:['video'],frameworks:[],version:'1.0',license:'MIT',install_command:'fixture',source_ref:'a'.repeat(40),source_path:'SKILL.md',source_commit_sha:'a'.repeat(40),source_content_hash:'a'.repeat(64)}
const args={p_request_id:crypto.randomUUID(),p_skill:p,p_reason:'Owner requested fixture publication',p_scan:{advisory:true,executed:false}}
try{
 assert.ok((await pub.rpc('publish_owner_skill',args)).error)
 const first=await ok(service.rpc('publish_owner_skill',args));assert.equal(first.status,'published');assert.equal(first.ai_review_approved,false)
 const replay=await ok(service.rpc('publish_owner_skill',args));assert.equal(replay.replayed,true)
 assert.ok((await service.rpc('publish_owner_skill',{...args,p_reason:'A different owner request'})).error)
 const unchanged=await ok(service.rpc('publish_owner_skill',{...args,p_request_id:crypto.randomUUID()}));assert.equal(unchanged.status,'unchanged')
 sqlite.prepare("UPDATE skills SET ai_review_approved=1,ai_review_score=?,listing_status='reviewed' WHERE slug=?").run(JSON.stringify({quality:9}),p.slug)
 const revised=await ok(service.rpc('publish_owner_skill',{...args,p_request_id:crypto.randomUUID(),p_skill:{...p,source_commit_sha:'b'.repeat(40),source_content_hash:'b'.repeat(64)}}))
 assert.equal(revised.status,'updated');assert.equal(revised.ai_review_approved,false)
 const history=JSON.parse(sqlite.prepare('SELECT previous_review FROM owner_skill_publications ORDER BY rowid DESC LIMIT 1').get().previous_review)
 assert.equal(history.approved,true);assert.deepEqual(history.scores,{quality:9})
 const skill=sqlite.prepare('SELECT * FROM skills WHERE slug=?').get(p.slug)
 assert.equal(skill.ai_review_score,null);assert.equal(skill.verified,0)
 const submission=crypto.randomUUID()
 sqlite.prepare("INSERT INTO skill_submissions(id,github_repo,skill_path,submission_source,status,ai_review_result,validation_result) VALUES (?,?,?,'web','rejected',?,?)").run(submission,p.github_repo,p.source_path,JSON.stringify({rejected:true}),JSON.stringify({old:true}))
 const meta={p_request_id:crypto.randomUUID(),p_repository:p.github_repo,p_path:p.source_path,p_submission_id:submission,p_metadata:{logoUrl:'https://example.test/logo.svg'},p_reason:'Correct product logo reference'}
 assert.equal((await ok(service.rpc('update_skill_product_metadata',{...meta,p_dry_run:true}))).dry_run,true)
 assert.equal(sqlite.prepare('SELECT count(*) n FROM skill_product_metadata_changes').get().n,0)
 const saved=await ok(service.rpc('update_skill_product_metadata',meta));assert.equal(saved.submission_status,'rejected');assert.equal(saved.ai_review_approved,false)
 assert.equal((await ok(service.rpc('update_skill_product_metadata',meta))).replayed,true)
 const sub=sqlite.prepare('SELECT * FROM skill_submissions WHERE id=?').get(submission)
 assert.equal(sub.status,'rejected');assert.deepEqual(JSON.parse(sub.ai_review_result),{rejected:true});assert.equal(JSON.parse(sub.validation_result).old,true)
 sqlite.exec("CREATE TRIGGER force_owner_failure BEFORE INSERT ON owner_skill_publications BEGIN SELECT raise(ABORT,'fixture rollback'); END")
 assert.ok((await service.rpc('publish_owner_skill',{...args,p_request_id:crypto.randomUUID(),p_skill:{...p,name:'Must roll back',source_commit_sha:'c'.repeat(40),source_content_hash:'c'.repeat(64)}})).error)
 assert.equal(sqlite.prepare('SELECT name FROM skills').get().name,p.name)
 sqlite.exec('DROP TRIGGER force_owner_failure')
 const editorial=crypto.randomUUID(),sources=['https://example.test/one','https://example.test/two','https://example.test/three']
 const draft={slug:'editorial-fixture',title:'A researched fixture about useful video workflows',summary:'A practical comparison of video workflows with documented inputs, outputs, costs and constraints.',content:['## Methodology','## Comparison','## Examples','## Limitations',...sources,...Array(650).fill('evidence')].join('\n'),sources,uniqueValue:'x'.repeat(110),factCheckedBy:'Fixture editor'}
 sqlite.prepare("INSERT INTO seo_editorial_queue(id,week_start,slot,topic_key,brief,draft,status) VALUES (?,?,1,'fixture','{}',?,'draft')").run(editorial,'2026-11-02',JSON.stringify(draft))
 const published=await ok(service.rpc('publish_seo_editorial',{p_id:editorial}));assert.equal(published.published,true)
 assert.equal((await ok(service.rpc('publish_seo_editorial',{p_id:editorial}))).duplicate,true)
 const second=crypto.randomUUID();sqlite.prepare("INSERT INTO seo_editorial_queue(id,week_start,slot,topic_key,brief,draft,status) VALUES (?,?,2,'fixture-2','{}',?,'draft')").run(second,'2026-11-02',JSON.stringify({...draft,slug:'duplicate-editorial'}))
 assert.ok((await service.rpc('publish_seo_editorial',{p_id:second})).error)
 assert.equal(sqlite.prepare('SELECT count(*) n FROM blog_posts').get().n,1)
 assert.equal(sqlite.prepare('SELECT count(*) n FROM d1_write_guards').get().n,0)
 console.log('D1 publishing passed: owner-only transport, idempotency, immutable review history, revision approval reset, metadata-only update, dry run, rollback and editorial duplicate gates.')
}finally{sqlite.close()}

