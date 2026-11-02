import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {hashPassword} from 'better-auth/crypto'
import {sqliteD1} from './fixtures/sqlite-d1.mjs'
import {cloudflareAuthHandler} from '../lib/auth/cloudflare-handler.ts'
import {readCloudflareUser} from '../lib/auth/cloudflare-session.ts'
import {createD1ReadFetch} from '../lib/db/cloudflare-read.ts'
import {createClient} from '@supabase/supabase-js'
import {cloudflareAccountData,cloudflareAccountSession} from '../lib/auth/cloudflare-account-api.ts'
import {syncCloudflareGitHubProfile} from '../lib/auth/cloudflare-github-profile.ts'
const {sqlite,database}=sqliteD1()
for(const n of ['0001_commerce','0002_auth','0003_business','0005_account_profile'])sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${n}.sql`,import.meta.url),'utf8'))
const origin='https://www.openagentskill.com',userId='60000000-0000-4000-8000-000000000001'
const env={HOSTING_PROVIDER:'cloudflare',MIGRATION_READ_ONLY:'0',CLOUDFLARE_AUTH_ENABLED:'1',AUTH_ORIGIN:origin,BETTER_AUTH_SECRET:'fixture-secret-never-a-production-secret-value',APP_DB:database}
const now=new Date().toISOString()
sqlite.prepare('INSERT INTO auth_users(id,name,email,emailVerified,createdAt,updatedAt) VALUES (?,?,?,1,?,?)').run(userId,'Fixture','session@example.invalid',now,now)
assert.equal(sqlite.prepare('SELECT display_name FROM profiles WHERE id=?').get(userId).display_name,'Fixture')
sqlite.prepare('UPDATE profiles SET username=?,github_user_id=?,github_username=?,github_verified_at=? WHERE id=?').run('fixture',12345,'fixture-verified',now,userId)
sqlite.prepare("INSERT INTO auth_accounts(id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES (?,?,'credential',?,?,?,?)").run(crypto.randomUUID(),userId,userId,await hashPassword('session-fixture-password'),now,now)
const call=(path,body,cookie='')=>cloudflareAuthHandler(new Request(origin+path,{method:body?'POST':'GET',headers:{origin,'content-type':'application/json',cookie,'cf-connecting-ip':'192.0.2.21'},...(body?{body:JSON.stringify(body)}:{})}),env)
try{
 assert.equal(await readCloudflareUser(new Headers(),env),null)
 const response=await call('/api/auth/sign-in/email',{email:'session@example.invalid',password:'session-fixture-password'})
 assert.equal(response.status,200)
 const cookie=response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')
 const headers=new Headers({cookie,'cf-connecting-ip':'192.0.2.21'})
 let user=await readCloudflareUser(headers,env)
 assert.equal(user.id,userId);assert.equal(user.email,'session@example.invalid');assert.equal(user.is_anonymous,false)
 assert.deepEqual(user.identities,[],'A verified-looking profile alone cannot manufacture an OAuth identity')
 sqlite.prepare("INSERT INTO auth_accounts(id,accountId,providerId,userId,createdAt,updatedAt) VALUES (?,'12345','github',?,?,?)").run(crypto.randomUUID(),userId,now,now)
 user=await readCloudflareUser(headers,env)
 assert.equal(user.identities[0].identity_data.sub,'12345')
 assert.equal(user.identities[0].identity_data.user_name,'fixture-verified')
 const fetchProfile=async (url,options)=>{assert.equal(url,'https://api.github.com/user/12345');assert.equal(options.redirect,'manual');return Response.json({id:12345,login:'renamed-fixture',type:'User',avatar_url:'https://avatars.githubusercontent.com/u/12345'})}
 assert.equal(await syncCloudflareGitHubProfile(database,userId,undefined,fetchProfile),true)
 assert.equal((await readCloudflareUser(headers,env)).identities[0].identity_data.user_name,'renamed-fixture')
 await assert.rejects(()=>syncCloudflareGitHubProfile(database,userId,undefined,async()=>Response.json({id:99999,login:'forged',type:'User'})),/mismatch/)
 await assert.rejects(()=>syncCloudflareGitHubProfile(database,userId,undefined,async()=>new Response(null,{status:302,headers:{Location:'https://example.invalid'}})),/unavailable/)
 sqlite.prepare('UPDATE profiles SET github_user_id=99999 WHERE id=?').run(userId)
 assert.deepEqual((await readCloudflareUser(headers,env)).identities,[],'Provider subjects must match the trusted login method')
 assert.equal(await readCloudflareUser(new Headers({cookie:'oas.session_token=forged.'+'a'.repeat(64)}),env),null)
 const accountClient=createClient('https://d1.internal','fixture',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:createD1ReadFetch(database,{userId:user.id})}})
 const points=await accountClient.from('point_events').select('*')
 assert.equal(points.error,null);assert.deepEqual(points.data,[])
 const api=(table,method='GET',body,query='',originValue=origin)=>cloudflareAccountData(new Request(`${origin}/api/account/data/${table}${query}`,{method,headers:{cookie,origin:originValue,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),table,env)
 sqlite.prepare(`INSERT INTO skills(id,slug,name,description,author_name,repository,github_repo,category,license,ai_review_approved) VALUES ('public','public','Fixture','Fixture','Fixture','https://example.invalid','fixture/public','development','MIT',1),('private','private','Fixture','Fixture','Fixture','https://example.invalid','fixture/private','development','MIT',0)`).run()
 assert.equal((await api('bookmarks','POST',{user_id:userId,skill_slug:'public'})).status,204)
 assert.equal((await api('bookmarks','POST',{user_id:userId,skill_slug:'public'})).status,204)
 assert.equal((await api('bookmarks','POST',{user_id:userId,skill_slug:'private'})).status,404)
 assert.equal((await api('bookmarks','POST',{user_id:'someone-else',skill_slug:'public'})).status,403)
 assert.equal((await api('bookmarks','POST',{user_id:userId,skill_slug:'public'},'','https://evil.example')).status,403)
 const saved=await api('bookmarks','GET',undefined,'?select=skill_slug')
 assert.deepEqual(await saved.json(),[{skill_slug:'public'}]);assert.match(saved.headers.get('cache-control'),/no-store/)
 assert.equal((await api('profiles','POST',{id:userId,github_user_id:99})).status,405)
 assert.equal((await api('profiles','GET',undefined,'?select=*')).status,400)
 assert.equal((await api('auth_accounts')).status,404)
 assert.equal((await api('bookmarks','DELETE',undefined,'?skill_slug=eq.public&user_id=eq.someone-else')).status,400)
 assert.equal((await api('bookmarks','DELETE',undefined,`?skill_slug=eq.public&user_id=eq.${userId}`)).status,204)
 assert.deepEqual(await (await api('bookmarks','GET',undefined,'?select=skill_slug')).json(),[])
 sqlite.prepare('UPDATE auth_sessions SET updatedAt=?,expiresAt=? WHERE userId=?').run(new Date(Date.now()-2*86_400_000).toISOString(),new Date(Date.now()+5*86_400_000).toISOString(),userId)
 const exposed=await cloudflareAccountSession(new Request(origin+'/api/account/session',{headers:{cookie}}),env)
 assert.ok(exposed.headers.getSetCookie().some(c=>c.includes('oas.session_token=')),'Browser session renewals must propagate the secure cookie')
 const exposedText=await exposed.text();assert.equal(exposed.status,200);assert.ok(!/session_token|password|accessToken|refreshToken/.test(exposedText))
 assert.equal((await call('/api/auth/sign-out',{},cookie)).status,200)
 assert.equal(await readCloudflareUser(headers,env),null)
 await assert.rejects(()=>readCloudflareUser(headers,{...env,MIGRATION_READ_ONLY:'1'}),/unavailable/)
 console.log('Cloudflare session bridge passed: real signed cookies, D1 session validation, revoked sessions, forged cookies and provider-subject isolation.')
}finally{sqlite.close()}
