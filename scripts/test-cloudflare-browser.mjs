import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {hashPassword} from 'better-auth/crypto'
import {sqliteD1} from './fixtures/sqlite-d1.mjs'
import {cloudflareAuthHandler} from '../lib/auth/cloudflare-handler.ts'
import {cloudflareAccountData,cloudflareAccountSession} from '../lib/auth/cloudflare-account-api.ts'
import {createCloudflareBrowserClient} from '../lib/auth/cloudflare-browser.ts'
const {sqlite,database}=sqliteD1()
for(const name of ['0001_commerce','0002_auth','0003_business','0005_account_profile'])sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${name}.sql`,import.meta.url),'utf8'))
const origin='https://www.openagentskill.com',id='70000000-0000-4000-8000-000000000001',now=new Date().toISOString()
const env={HOSTING_PROVIDER:'cloudflare',MIGRATION_READ_ONLY:'0',CLOUDFLARE_AUTH_ENABLED:'1',AUTH_ORIGIN:origin,BETTER_AUTH_SECRET:'fixture-browser-authentication-secret-only',APP_DB:database}
sqlite.prepare('INSERT INTO auth_users(id,name,email,emailVerified,createdAt,updatedAt) VALUES (?,?,?,1,?,?)').run(id,'Browser fixture','browser@example.invalid',now,now)
sqlite.prepare("INSERT INTO auth_accounts(id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES (?,?,'credential',?,?,?,?)").run(crypto.randomUUID(),id,id,await hashPassword('browser-fixture-password'),now,now)
sqlite.prepare('UPDATE profiles SET username=? WHERE id=?').run('browser-fixture',id)
sqlite.prepare("INSERT INTO skills(slug,name,description,author_name,repository,github_repo,category,license,ai_review_approved) VALUES ('browser-skill','Fixture','Fixture','Fixture','https://example.invalid','example/fixture','development','MIT',1)").run()
const originalFetch=globalThis.fetch,originalWindow=globalThis.window
let cookie='',redirected=null,invalidRedirect=false
globalThis.window={location:{origin,assign(url){redirected=url}}}
globalThis.fetch=async (input,init={})=>{
 assert.equal(typeof input,'string');assert.ok(input.startsWith('/api/'),'No outbound Supabase or provider request')
 assert.equal(init.credentials,'same-origin');assert.equal(init.cache,'no-store')
 const headers=new Headers(init.headers);headers.set('origin',origin);headers.set('cookie',cookie);headers.set('cf-connecting-ip','192.0.2.22')
 const url=new URL(input,origin),request=new Request(url,{...init,headers})
 let response
 if(url.pathname==='/api/account/session')response=await cloudflareAccountSession(request,env)
 else if(url.pathname.startsWith('/api/account/data/')){
  assert.equal(headers.get('authorization'),null);assert.equal(headers.get('apikey'),null)
  response=await cloudflareAccountData(request,url.pathname.split('/').at(-1),env)
 }else if(['/api/auth/sign-in/social','/api/auth/link-social'].includes(url.pathname)){
  const body=await request.json();const callback=new URL(body.callbackURL);assert.equal(callback.origin,origin);assert.equal(callback.pathname,'/auth/complete');assert.equal(callback.searchParams.get('next'),'/creator')
  response=Response.json({url:invalidRedirect?'https://evil.example/steal':'https://github.com/login/oauth/authorize?client_id=fixture'})
 }else response=await cloudflareAuthHandler(request,env)
 for(const value of response.headers.getSetCookie()){
  const pair=value.split(';')[0]
  if(pair.includes('oas.session_token='))cookie=pair
 }
 return response
}
try{
 const client=createCloudflareBrowserClient(),events=[]
 const subscription=client.auth.onAuthStateChange((event,session)=>events.push({event,id:session?.user.id||null})).data.subscription
 assert.equal((await client.auth.getUser()).data.user,null)
 const signIn=await client.auth.signInWithPassword({email:'browser@example.invalid',password:'browser-fixture-password'})
 assert.equal(signIn.error,null);assert.equal(signIn.data.user.id,id);assert.ok(cookie.includes('oas.session_token='))
 assert.ok(events.some(e=>e.event==='SIGNED_IN'&&e.id===id))
 const profile=await client.from('profiles').select('username').eq('id',id).maybeSingle()
 assert.equal(profile.error,null);assert.equal(profile.data.username,'browser-fixture')
 assert.equal((await client.from('bookmarks').upsert({user_id:id,skill_slug:'browser-skill'},{onConflict:'user_id,skill_slug',ignoreDuplicates:true})).error,null)
 const saved=await client.from('bookmarks').select('skill_slug').eq('user_id',id).eq('skill_slug','browser-skill').maybeSingle()
 assert.equal(saved.error,null);assert.equal(saved.data.skill_slug,'browser-skill')
 assert.equal((await client.from('bookmarks').delete().eq('user_id',id).eq('skill_slug','browser-skill')).error,null)
 assert.equal((await client.from('auth_accounts').select('*')).status,403)
 assert.equal((await client.auth.signInWithOAuth({provider:'github',options:{redirectTo:origin+'/auth/callback?next=%2Fcreator'}})).error,null)
 assert.match(redirected,/^https:\/\/github.com\/login\/oauth\/authorize/)
 redirected=null;invalidRedirect=true
 assert.ok((await client.auth.linkIdentity({provider:'github'})).error);assert.equal(redirected,null)
 assert.ok((await client.auth.signUp({email:'new@example.invalid',password:'browser-fixture-password',options:{data:{display_name:'New'}}})).error,'Signup remains gated until email is configured')
 assert.equal((await client.auth.signOut()).error,null)
 assert.equal((await client.auth.getUser()).data.user,null)
 assert.ok(events.some(e=>e.event==='SIGNED_OUT'&&e.id===null))
 subscription.unsubscribe()
 console.log('Cloudflare browser adapter passed actual auth/session/account handlers: email login, profile read, bookmark add/read/remove, logout, first-party transport and OAuth redirect validation. No external requests.')
}finally{globalThis.fetch=originalFetch;globalThis.window=originalWindow;sqlite.close()}
