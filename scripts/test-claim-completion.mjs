import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { z } from 'zod'
import { NextResponse } from 'next/server.js'
import { createClient } from '@supabase/supabase-js'
import { sqliteD1 } from './fixtures/sqlite-d1.mjs'
import { createD1ServiceFetch } from '../lib/db/cloudflare-service.ts'
import * as ownership from '../lib/creator-ownership.ts'
import { readCreatorClaimBatches } from '../lib/creator-profile.ts'

// Real routes, query builder and D1 SQL against an isolated database. GitHub and
// cache calls are stubbed; no credentials, production writes or Skill execution.
const { sqlite, database } = sqliteD1()
for (const name of ['0001_commerce','0002_auth','0003_business','0004_catalog','0005_account_profile','0006_telemetry','0007_quality','0008_outcomes','0009_skill_writes','0011_search_cost']) {
  sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${name}.sql`, import.meta.url), 'utf8'))
}
const userId = '90000000-0000-4000-8000-000000000001'
sqlite.prepare('INSERT INTO account_identities(id) VALUES (?)').run(userId)
let user = { id: userId, email: 'fixture@example.invalid', identities: [{ provider:'github', id:'123', identity_data:{provider_id:'123',user_name:'fixture'} }] }
const admin = createClient('https://d1.internal', 'fixture', { auth:{persistSession:false,autoRefreshToken:false},db:{retry:false},global:{fetch:createD1ServiceFetch(database)} })
const cacheTags = [], challengeRefs = []
function load(path, dependencies) {
  const source = readFileSync(new URL('../'+path, import.meta.url), 'utf8')
  const js = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  const exports = {}
  new Function('require','exports',js)(name => {
    assert.ok(Object.hasOwn(dependencies,name), `Unexpected dependency ${name}`)
    return dependencies[name]
  }, exports)
  return exports
}
const helper = load('lib/creator-claims.ts', {'server-only':{},'next/cache':{revalidatePath(){},revalidateTag(tag){cacheTags.push(tag)}}})
const deps = {
  'next/server':{NextResponse}, zod:{z},
  '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user}})},from:admin.from.bind(admin)})},
  '@/lib/supabase/admin':{createAdminClient:()=>admin},
  '@/lib/creator-claims':helper,
  '@/lib/creator-ownership':{...ownership,fetchRepositoryChallenge:async value=>{challengeRefs.push(value.ref);return 'oas_claim_fixture'}},
  '@/lib/github/api':{validateGitHubRepo:async()=>({defaultBranch:'main'})},
}
const submit = load('app/api/claims/route.ts', deps).POST
const verify = load('app/api/claims/verify/route.ts', deps).POST
const batch = load('app/api/claims/batch/route.ts', deps).POST
const request = slug => new Request('https://www.openagentskill.com/api/claims',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({skill_slug:slug,github_username:'spoofed'})})
const insert = sqlite.prepare(`INSERT INTO skills(id,slug,name,description,author_name,repository,github_repo,category,license,ai_review_approved,listing_status,source_path)
  VALUES (?,?,?,'Fixture','Fixture',?,?,'development','MIT',0,'static_checked',?)`)
for (let i=0;i<120;i++) insert.run(`id-${i}`,`fixture-${i}`,`Fixture ${i}`,`https://github.com/fixture/source/blob/${'a'.repeat(40)}/skills/${i}/SKILL.md`,'fixture/source',`skills/${i}/SKILL.md`)
try {
  // The old implementation returned success after a failed listing update and
  // could never repair it because it short-circuited on an approved claim.
  sqlite.exec("CREATE TRIGGER fail_claim_sync BEFORE UPDATE ON skills BEGIN SELECT raise(ABORT,'fixture listing failure'); END")
  assert.equal((await submit(request('fixture-0'))).status,503)
  assert.equal(sqlite.prepare("SELECT status FROM skill_claims WHERE skill_slug='fixture-0'").get().status,'approved')
  assert.equal(sqlite.prepare("SELECT publisher_verified FROM skills WHERE slug='fixture-0'").get().publisher_verified,0)
  sqlite.exec('DROP TRIGGER fail_claim_sync')
  assert.equal((await submit(request('fixture-0'))).status,200)
  const listed = sqlite.prepare("SELECT author_user_id,publisher_github,publisher_verified FROM skills WHERE slug='fixture-0'").get()
  assert.deepEqual({...listed},{author_user_id:userId,publisher_github:'fixture',publisher_verified:1})
  assert.ok(cacheTags.includes('public-skill:fixture-0'))

  // A challenge added today cannot exist in the old pinned source revision.
  sqlite.prepare(`INSERT INTO skill_claims(skill_slug,user_id,github_username,status,verification_method,challenge_token_hash,challenge_expires_at)
    VALUES (?,?,?,'pending','repository_file',?,?)`).run('fixture-1',userId,'fixture',ownership.hashClaimChallenge('oas_claim_fixture'),new Date(Date.now()+60_000).toISOString())
  sqlite.exec("CREATE TRIGGER fail_claim_sync BEFORE UPDATE ON skills BEGIN SELECT raise(ABORT,'fixture listing failure'); END")
  assert.equal((await verify(request('fixture-1'))).status,503)
  assert.equal(challengeRefs.at(-1),'main')
  sqlite.exec('DROP TRIGGER fail_claim_sync')
  assert.equal((await verify(request('fixture-1'))).status,200)
  assert.equal(sqlite.prepare("SELECT publisher_verified FROM skills WHERE slug='fixture-1'").get().publisher_verified,1)

  // This exceeds D1's 95-bind budget. The update and Creator Center reads must
  // use bounded batches and include the final batch rather than display zeros.
  const bulk = await batch()
  assert.equal(bulk.status,200,await bulk.clone().text())
  assert.equal((await bulk.json()).claimed,118)
  assert.equal(sqlite.prepare('SELECT count(*) n FROM skills WHERE publisher_verified=1 AND author_user_id=?').get(userId).n,120)
  assert.equal((await (await batch()).json()).claimed,0,'A retry must advance beyond the already synced batch')
  const slugs = Array.from({length:120},(_,i)=>`fixture-${i}`)
  const read = await readCreatorClaimBatches(slugs,part=>admin.from('skills').select('slug').in('slug',part))
  assert.equal(read.data.length,120)
  assert.equal(new Set(read.data.map(row=>row.slug)).size,120)
  await assert.rejects(()=>helper.syncVerifiedClaimListings(admin,['missing-skill'],{userId,githubUsername:'fixture'}),/incomplete/)
  const before = sqlite.prepare('SELECT count(*) n FROM skill_claims').get().n
  user = null
  assert.equal((await batch()).status,401)
  assert.equal((await submit(request('fixture-2'))).status,401)
  assert.equal((await verify(request('fixture-2'))).status,401)
  assert.equal(sqlite.prepare('SELECT count(*) n FROM skill_claims').get().n,before)
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(),[])
  console.log('Claim completion passed: actual single/batch/file routes, D1 120-listing batches, failed sync and retry repair, current-branch challenges, cache invalidation and anonymous denial.')
} finally { sqlite.close() }
