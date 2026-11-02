import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
import {sqliteD1} from './fixtures/sqlite-d1.mjs'
import {createD1ServiceFetch} from '../lib/db/cloudflare-service.ts'
import {createD1PublicFetch} from '../lib/db/cloudflare-public-write.ts'
import {classifySkill} from '../lib/skills/taxonomy.ts'
const {sqlite,database}=sqliteD1()
for(const n of ['0001_commerce','0002_auth','0003_business','0004_catalog','0005_account_profile','0006_telemetry','0007_quality','0008_outcomes','0009_skill_writes'])sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${n}.sql`,import.meta.url),'utf8'))
const client=transport=>createClient('https://d1.internal','fixture',{auth:{persistSession:false,autoRefreshToken:false},db:{retry:false},global:{fetch:transport}})
const service=client(createD1ServiceFetch(database)),pub=client(createD1PublicFetch(database))
const ok=async p=>{const r=await p;assert.equal(r.error,null,JSON.stringify(r.error));return r.data}
const base={slug:'video-fixture',name:'Video editing skill',description:'Create a video',author_name:'Fixture',repository:'https://github.com/fixture/source',github_repo:'fixture/source',category:'development',license:'MIT',ai_review_approved:true,source_path:'skills/video/SKILL.md',tags:['video']}
try{
 const row=await ok(service.from('skills').insert(base).select('*').single())
 assert.ok(row.id);assert.equal(row.primary_category,classifySkill(base).primary_category)
 assert.equal((await ok(pub.from('skill_directory_entries').select('slug'))).length,1)
 assert.ok((await pub.from('skills').insert({...base,slug:'public-forgery'})).error)
 const staticSkill=await ok(service.from('skills').insert({...base,slug:'static-fixture',source_path:'skills/static/SKILL.md',ai_review_score:{method:'static',policy_version:'risk-first-v1',decision:'approved'}}).select('*').single())
 assert.equal(staticSkill.ai_review_approved,false);assert.equal(staticSkill.listing_status,'static_checked')
 const duplicate=await service.from('skills').insert({...base,slug:'duplicate-source'})
 assert.equal(duplicate.error.code,'23505')
 assert.equal(sqlite.prepare('SELECT count(*) n FROM d1_write_guards').get().n,0)
 const updated=await ok(service.from('skills').upsert({...base,name:'Image drawing skill',description:'Render an image',tags:['image']},{onConflict:'slug'}).select('*').single())
 assert.equal(updated.id,row.id);assert.equal(updated.primary_category,classifySkill({...base,name:'Image drawing skill',description:'Render an image',tags:['image']}).primary_category)
 const patch=await ok(service.from('skills').update({category:'mcp-server'}).eq('id',row.id).select('*').single())
 assert.equal(patch.category,'mcp-server');assert.equal((await ok(pub.from('skill_directory_entries').select('slug'))).length,1)
 await ok(service.from('skills').update({category:'development'}).eq('id',row.id))
 assert.equal((await ok(pub.from('skill_directory_entries').select('slug'))).length,2)
 const rollback=await service.from('skills').insert([{...base,slug:'first-in-batch',source_path:'skills/first/SKILL.md'},{...base,slug:'duplicate-in-batch'}])
 assert.equal(rollback.error.code,'23505');assert.equal(sqlite.prepare("SELECT count(*) n FROM skills WHERE slug='first-in-batch'").get().n,0)
 // Inject a competing edit after the snapshot read. Its value must survive a
 // retry; directory/taxonomy membership must reflect the final merged record.
 let inject=true
 const racing={prepare:database.prepare.bind(database),async batch(statements){if(inject){inject=false;sqlite.prepare('UPDATE skills SET description=? WHERE id=?').run('A new concurrent description',row.id)}return database.batch(statements)}}
 const racingService=client(createD1ServiceFetch(racing))
 const merged=await ok(racingService.from('skills').update({name:'Research workflow skill'}).eq('id',row.id).select('*').single())
 assert.equal(merged.description,'A new concurrent description');assert.equal(merged.name,'Research workflow skill')
 assert.equal(merged.primary_category,classifySkill(merged).primary_category)
 assert.equal(sqlite.prepare('SELECT count(*) n FROM d1_write_guards').get().n,0)
 // An equality filter is retained inside the atomic patch, not just its read.
 const noMatch=await ok(service.from('skills').update({name:'Wrong lease'}).eq('id',row.id).eq('name','Old name').select('*'))
 assert.deepEqual(noMatch,[])
 // Trusted service CRUD stays unreachable through the public transport.
 const news=await ok(service.from('newsletter_subscribers').upsert({email:'fixture@example.invalid',cadence:'weekly'},{onConflict:'email'}).select('email,cadence').single())
 assert.equal(news.cadence,'weekly');assert.ok((await pub.from('newsletter_subscribers').select('*')).error)
 console.log('D1 skill writes passed: taxonomy, static-review truth, source uniqueness, directory membership, private CRUD, batch rollback and concurrent-update preservation.')
}finally{sqlite.close()}
