import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
import {sqliteD1} from './fixtures/sqlite-d1.mjs'
import {createD1ServiceFetch} from '../lib/db/cloudflare-service.ts'
import {createD1PublicFetch} from '../lib/db/cloudflare-public-write.ts'
const {sqlite,database}=sqliteD1()
for(const n of ['0001_commerce','0002_auth','0003_business','0004_catalog','0005_account_profile','0006_telemetry','0007_quality','0008_outcomes','0009_skill_writes','0011_search_cost'])sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${n}.sql`,import.meta.url),'utf8'))
const prior=process.env.INDEXER_SECRET,secret=crypto.randomUUID()+crypto.randomUUID();process.env.INDEXER_SECRET=secret
const client=transport=>createClient('https://d1.internal','fixture',{auth:{persistSession:false,autoRefreshToken:false},db:{retry:false},global:{fetch:transport}})
const service=client(createD1ServiceFetch(database)),pub=client(createD1PublicFetch(database))
const ok=async p=>{const r=await p;assert.equal(r.error,null,JSON.stringify(r.error));return r.data}
const skill={slug:'indexed-fixture',name:'Video processing skill',description:'Process a video',github_repo:'fixture/source',repository:'https://github.com/fixture/source',author_name:'Fixture',category:'video',license:'MIT'}
try{
 assert.equal((await pub.rpc('upsert_indexed_skill',{p_server_secret:'wrong',p_skill:skill})).error.code,'42501')
 const first=await ok(pub.rpc('upsert_indexed_skill',{p_server_secret:secret,p_skill:skill,p_activity:{metadata:{fixture:true}}}))
 assert.equal(first.created,true);assert.equal(first.skill.ai_review_approved,true);assert.equal(first.skill.primary_category,'video-creation')
 assert.equal(sqlite.prepare('SELECT count(*) n FROM activity_feed').get().n,1)
 const update=await ok(service.rpc('upsert_indexed_skill',{p_server_secret:secret,p_skill:{...skill,github_stars:50},p_activity:{}}))
 assert.equal(update.created,false);assert.equal(update.skill.id,first.skill.id);assert.equal(update.skill.github_stars,50)
 assert.equal(sqlite.prepare('SELECT count(*) n FROM activity_feed').get().n,1,'Retrying an existing source must not duplicate its publication activity')
 const args={p_server_secret:secret,p_skill_slug:skill.slug,p_source_commit_sha:'a'.repeat(40),p_source_content_hash:'a'.repeat(64),p_source_ref:'main',p_source_path:'skills/video/SKILL.md',p_version:'1.0.0',p_license:'MIT',p_license_source:'skill_frontmatter',p_metadata:{one:1,nullable:'old',flag:true,nested:{old:1}}}
 const version=await ok(service.rpc('record_skill_source_version',args))
 assert.equal(version.changed,false);assert.equal(version.previous_hash,null);assert.equal(version.license_status,'detected')
 await ok(service.rpc('record_skill_source_version',{...args,p_metadata:{two:2,nullable:null,flag:false,nested:{new:2},array:[1,2]}}))
 const stored=JSON.parse(sqlite.prepare('SELECT metadata FROM skill_versions').get().metadata)
 assert.deepEqual(stored,{one:1,two:2,nullable:null,flag:false,nested:{new:2},array:[1,2]})
 assert.equal(sqlite.prepare('SELECT count(*) n FROM skill_versions').get().n,1)
 const changed=await ok(service.rpc('record_skill_source_version',{...args,p_source_content_hash:'b'.repeat(64),p_license:'CC-BY-NC-4.0'}))
 assert.equal(changed.changed,true);assert.equal(changed.license_status,'restricted')
 assert.equal(sqlite.prepare('SELECT source_sync_status FROM skills').get().source_sync_status,'changed')
 sqlite.exec("CREATE TRIGGER forced_activity_rollback BEFORE INSERT ON activity_feed BEGIN SELECT raise(ABORT,'fixture rollback'); END")
 assert.ok((await service.rpc('upsert_indexed_skill',{p_server_secret:secret,p_skill:{...skill,slug:'rollback-fixture'},p_activity:{}})).error)
 assert.equal(sqlite.prepare("SELECT count(*) n FROM skills WHERE slug='rollback-fixture'").get().n,0)
 assert.equal(sqlite.prepare('SELECT count(*) n FROM d1_write_guards').get().n,0)
 console.log('D1 indexer transactions passed: secret guard, source upsert, first-publication activity, source history, JSON null-preserving merge and atomic rollback.')
}finally{sqlite.close();if(prior===undefined)delete process.env.INDEXER_SECRET;else process.env.INDEXER_SECRET=prior}
