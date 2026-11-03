import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createClient} from '@supabase/supabase-js'
import {parseOptionalNonNegative} from '../lib/automation/parameters.ts'
import {validateGitHubRepo} from '../lib/github/api.ts'
import {fetchSkillVersionEvidence} from '../lib/github/skill-source.ts'
import {githubResponseError,isGitHubRateLimitError} from '../lib/github/http.ts'
import {searchXSkillRadarRepos} from '../lib/indexer/x-skill-radar.ts'
import {createD1ServiceFetch} from '../lib/db/cloudflare-service.ts'
import {sqliteD1} from './fixtures/sqlite-d1.mjs'

assert.equal(parseOptionalNonNegative(null,undefined),undefined)
assert.equal(parseOptionalNonNegative(null,1),1,'POST body must not be masked by absent query parameter')
assert.equal(parseOptionalNonNegative('0',1),0,'explicit budget disable must remain zero')
assert.equal(parseOptionalNonNegative('',undefined),undefined)
assert.equal(parseOptionalNonNegative(null,false),undefined)
assert.equal(parseOptionalNonNegative(null,-1),undefined)

const missingAgent=await githubResponseError(new Response('User-Agent required',{status:403}))
assert.equal(isGitHubRateLimitError(missingAgent),false)
assert.match(missingAgent.message,/user agent required/)
assert.equal(isGitHubRateLimitError(await githubResponseError(new Response('Resource not accessible by token',{status:403}))),false)
assert.equal(isGitHubRateLimitError(await githubResponseError(new Response('secondary rate limit',{status:403}))),true)
const limited=await githubResponseError(new Response('quota',{status:403,headers:{'x-ratelimit-remaining':'0','retry-after':'120'}}))
assert.equal(limited.retryAfterMs,120_000)

const originalFetch=globalThis.fetch,priorToken=process.env.X_BEARER_TOKEN
try{
 let requests=0
 globalThis.fetch=async(_url,init)=>{requests++;assert.match(new Headers(init.headers).get('user-agent'),/OpenAgentSkill/);return Response.json({full_name:'example/skill',default_branch:'main',stargazers_count:30})}
 assert.equal((await validateGitHubRepo('example/skill',{checkReadme:false,checkSkillJson:false})).stars,30)
 assert.equal(requests,1)
 const skill={owner:'example',repo:'skill',ref:'main',path:'SKILL.md',directory:'',document:'# A skill',frontmatter:{name:'fixture-skill'}}
 globalThis.fetch=async()=>new Response('Missing optional plugin manifest',{status:404})
 assert.equal((await fetchSkillVersionEvidence(skill)).source,'unknown','optional missing version metadata must not block publication')
 globalThis.fetch=async()=>new Response('Permission denied',{status:403})
 await assert.rejects(()=>fetchSkillVersionEvidence(skill),error=>error.statusCode===403,'provider failures must still stop source preparation')
 requests=0;process.env.X_BEARER_TOKEN='fixture-only'
 globalThis.fetch=async()=>{requests++;return new Response('private provider detail',{status:402})}
 const radar=await searchXSkillRadarRepos({maxQueries:3})
 assert.equal(radar.status,'error');assert.equal(radar.failedQueries,1);assert.equal(requests,1)
 assert.equal(radar.reason,'X recent search failed: 402')
}finally{globalThis.fetch=originalFetch;if(priorToken===undefined)delete process.env.X_BEARER_TOKEN;else process.env.X_BEARER_TOKEN=priorToken}

const {sqlite,database}=sqliteD1()
for(const n of ['0001_commerce','0002_auth','0003_business','0004_catalog','0005_account_profile','0006_telemetry','0007_quality','0008_outcomes','0009_skill_writes'])sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${n}.sql`,import.meta.url),'utf8'))
const client=db=>createClient('https://d1.internal','fixture',{auth:{persistSession:false,autoRefreshToken:false},db:{retry:false},global:{fetch:createD1ServiceFetch(db)}})
try{
 for(let i=1;i<=3;i++)sqlite.prepare("INSERT INTO skill_candidates(id,source_key,github_full_name,github_owner,github_repo,canonical_source_url,github_stars,status,next_attempt_at) VALUES (?,?,?,'fixture',?,?,?,'discovered','2000-01-01T00:00:00.000000Z')").run('c'+i,'source'+i,'fixture/c'+i,'c'+i,'https://github.com/fixture/c'+i,i*100)
 let calls=0
 const lostAck={prepare:database.prepare.bind(database),async batch(statements){const result=await database.batch(statements);if(calls++===0)throw new Error('Network connection lost.');return result}}
 const args={p_statuses:['discovered'],p_limit:2,p_worker_id:'worker-lost-response',p_lease_seconds:120}
 const claim=await client(lostAck).rpc('claim_skill_candidates',args)
 assert.equal(claim.error,null);assert.deepEqual(claim.data.map(row=>row.id),['c3','c2']);assert.ok(claim.data.every(row=>row.attempt_count===1))
 assert.equal(sqlite.prepare('SELECT count(*) n FROM skill_candidates WHERE lease_owner IS NOT NULL').get().n,2,'lost acknowledgement must not claim two batches')
 const again=await client(database).rpc('claim_skill_candidates',args)
 assert.equal(again.data[0].id,'c3');assert.equal(again.data[0].attempt_count,1)
 let readCalls=0
 const flakyRead={batch:database.batch.bind(database),prepare(sql){return {bind(...values){return {async all(){if(readCalls++===0)throw new Error('D1 failed',{cause:new Error('storage caused object to be reset')});return database.prepare(sql).bind(...values).all()}}}}}}
 const read=await client(flakyRead).from('skill_candidates').select('id').eq('id','c3')
 assert.equal(read.error,null);assert.equal(read.data[0].id,'c3');assert.equal(readCalls,2)
 let writes=0
 const ambiguousWrite={prepare:database.prepare.bind(database),async batch(statements){writes++;await database.batch(statements);throw new Error('Network connection lost.')}}
 const unknown=await client(ambiguousWrite).from('newsletter_subscribers').insert({email:'fixture@example.invalid',cadence:'weekly'})
 assert.equal(unknown.error.code,'D1_TRANSIENT_CONNECTION');assert.equal(writes,1,'ordinary writes must not be replayed')
 let dedupWrites=0
 const enqueueAck={prepare:database.prepare.bind(database),async batch(statements){const r=await database.batch(statements);if(dedupWrites++===0)throw new Error('Network connection lost.');return r}}
 const enqueued=await client(enqueueAck).from('skill_candidates').upsert({source_key:'new-source',github_full_name:'fixture/new',github_owner:'fixture',github_repo:'new',canonical_source_url:'https://github.com/fixture/new'},{onConflict:'source_key',ignoreDuplicates:true}).select('id')
 assert.equal(enqueued.error,null);assert.equal(sqlite.prepare("SELECT count(*) n FROM skill_candidates WHERE source_key='new-source'").get().n,1)
 const logs=[],previous=console.error;console.error=(...args)=>logs.push(args)
 try{const broken={prepare(){throw new Error("D1_ERROR: no such table: private_email@example.invalid")},batch:database.batch.bind(database)};const r=await client(broken).from('skill_candidates').select('id');assert.equal(r.error.code,'D1_SCHEMA_ERROR');assert.ok(!JSON.stringify([r,logs]).includes('private_email'))}finally{console.error=previous}
 console.log('Ingestion recovery passed: parameter defaults, GitHub headers and error classification, X failure reporting, lost-ack lease recovery, safe read/enqueue retries, no mutation replay, private error redaction.')
}finally{sqlite.close()}
