import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { hash } from 'bcryptjs'
import { hashPassword } from 'better-auth/crypto'
import { createCloudflareAuth, verifyMigratedPassword } from '../lib/auth/cloudflare.ts'
import { cloudflareAuthHandler } from '../lib/auth/cloudflare-handler.ts'
import { convertAuthRows } from './rehearse-cloudflare-auth.mjs'
import { sqliteD1 } from './fixtures/sqlite-d1.mjs'

const origin = 'https://www.openagentskill.com'
const secret = crypto.randomUUID()+crypto.randomUUID()
const { sqlite, database } = sqliteD1()
for (const file of ['0001_commerce.sql','0002_auth.sql']) {
  sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${file}`,import.meta.url),'utf8'))
}
const password = 'synthetic-test-password-only'
const bcrypt = await hash(password, 10)
const userId = '10000000-0000-4000-8000-000000000001'
const accountId = '20000000-0000-4000-8000-000000000001'
const sourceUser = {id:userId,email:'Synthetic@EXAMPLE.invalid',encrypted_password:bcrypt,
  email_confirmed_at:'2026-10-30 13:49:09.123456+00',created_at:'2026-10-30 13:49:09.123456+00',updated_at:'2026-10-30 13:49:09.123456+00'}
const sourceIdentity = {id:accountId,user_id:userId,provider:'email',provider_id:userId,
  created_at:sourceUser.created_at,updated_at:sourceUser.updated_at}
const sourceProfile = {id:userId,display_name:'Synthetic'}
const material = convertAuthRows([sourceUser],[sourceIdentity],[sourceProfile])
assert.equal(material.users[0].id,userId)
assert.equal(material.users[0].email,'synthetic@example.invalid')
assert.equal(material.accounts[0].password,bcrypt)
assert.equal(material.accounts[0].accountId,userId)
assert.equal(material.accounts[0].accessToken,null)
assert.equal(material.users[0].createdAt,'2026-10-30T13:49:09.123Z')
for (const [table,rows] of [['auth_users',material.users],['auth_accounts',material.accounts]]) {
  for (const row of rows) {
    const names = Object.keys(row)
    sqlite.prepare(`INSERT INTO ${table} (${names.map(n=>`"${n}"`).join(',')}) VALUES (${names.map(()=>'?').join(',')})`).run(...Object.values(row))
  }
}
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM account_identities WHERE id=?').get(userId).n,1)
assert.throws(()=>convertAuthRows([{...sourceUser,banned_until:'2027-01-01'}],[sourceIdentity],[sourceProfile]),/status migration/)
assert.throws(()=>convertAuthRows([sourceUser],[{...sourceIdentity,provider:'unknown'}],[sourceProfile]),/provider/)
assert.throws(()=>convertAuthRows([sourceUser],[{...sourceIdentity,provider:'github',provider_id:'username'}],[sourceProfile]),/stable numeric/)
assert.throws(()=>convertAuthRows([sourceUser,{...sourceUser,id:'10000000-0000-4000-8000-000000000002'}],[sourceIdentity],[sourceProfile]),/duplicate email/)
assert.equal(await verifyMigratedPassword({hash:bcrypt,password}),true)
assert.equal(await verifyMigratedPassword({hash:bcrypt,password:'wrong'}),false)
assert.equal(await verifyMigratedPassword({hash:'bad-format',password}),false)
const freshHash = await hashPassword(password)
assert.equal(await verifyMigratedPassword({hash:freshHash,password}),true)
assert.equal(await verifyMigratedPassword({hash:freshHash,password:'wrong'}),false)
assert.throws(()=>createCloudflareAuth({database,origin:'https://evil.example',secret}),/origin/)
assert.throws(()=>createCloudflareAuth({database,origin,secret:'short'}),/secret/)
assert.throws(()=>createCloudflareAuth({database,origin,secret,registrationEnabled:true}),/email delivery/)

const env = {HOSTING_PROVIDER:'cloudflare',MIGRATION_READ_ONLY:'0',CLOUDFLARE_AUTH_ENABLED:'1',
  AUTH_ORIGIN:origin,BETTER_AUTH_SECRET:secret,APP_DB:database}
function req(path, body, headers={}) {
  return new Request(origin+'/api/auth'+path,{method:body?'POST':'GET',headers:{
    origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.1',...headers},
    ...(body?{body:JSON.stringify(body)}:{})})
}
const signIn = {email:'synthetic@example.invalid',password}
assert.equal((await cloudflareAuthHandler(req('/sign-in/email',signIn),{...env,MIGRATION_READ_ONLY:'1'})).status,503)
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM auth_sessions').get().n,0)
assert.equal((await cloudflareAuthHandler(req('/sign-in/email',signIn,{origin:'https://evil.example'}),env)).status,403)
assert.equal((await cloudflareAuthHandler(req('/sign-in/email',{...signIn,password:'wrong'}),env)).status,401)
const login = await cloudflareAuthHandler(req('/sign-in/email',signIn),env)
assert.equal(login.status,200,await login.clone().text())
assert.equal(login.headers.get('cache-control'),'private, no-store')
const cookies = login.headers.getSetCookie()
const sessionCookie = cookies.find(c=>c.includes('session_token='))
assert.ok(sessionCookie)
assert.match(sessionCookie,/HttpOnly/i)
assert.match(sessionCookie,/Secure/i)
assert.match(sessionCookie,/SameSite=Lax/i)
const cookie = cookies.map(c=>c.split(';')[0]).join('; ')
const session = await cloudflareAuthHandler(req('/get-session',null,{cookie}),env)
assert.equal(session.status,200)
assert.equal((await session.json()).user.id,userId)
assert.equal(await (await cloudflareAuthHandler(req('/get-session'),env)).json(),null)

const registration = await cloudflareAuthHandler(req('/sign-up/email',{name:'Other',email:'other@example.invalid',password}),env)
assert.equal(registration.status,400)
assert.equal((await registration.json()).code,'EMAIL_PASSWORD_SIGN_UP_DISABLED')
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM auth_users').get().n,1)
// The database trigger invalidates sessions in the password-update statement,
// even if the library's subsequent revocation call never executes.
sqlite.prepare('UPDATE auth_accounts SET password=? WHERE id=?').run(freshHash,accountId)
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM auth_sessions WHERE userId=?').get(userId).n,0)
assert.equal(await (await cloudflareAuthHandler(req('/get-session',null,{cookie}),env)).json(),null)

sqlite.prepare('UPDATE auth_users SET emailVerified=0 WHERE id=?').run(userId)
assert.equal((await cloudflareAuthHandler(req('/sign-in/email',signIn,{'cf-connecting-ip':'192.0.2.2'}),env)).status,403)
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM auth_sessions').get().n,0)
sqlite.prepare('UPDATE auth_users SET emailVerified=1 WHERE id=?').run(userId)
// Distributed rate limiter must admit only five attempts from a fresh address
// under concurrency; each non-admitted attempt returns an actual HTTP 429.
const attempts = await Promise.all(Array.from({length:12},()=>cloudflareAuthHandler(
  req('/sign-in/email',{...signIn,password:'incorrect'},{'cf-connecting-ip':'192.0.2.3'}),env)))
assert.equal(attempts.filter(r=>r.status===401).length,5)
assert.equal(attempts.filter(r=>r.status===429).length,7)

const second = await cloudflareAuthHandler(req('/sign-in/email',signIn,{'cf-connecting-ip':'192.0.2.4'}),env)
assert.equal(second.status,200)
const secondCookie = second.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')
assert.equal((await cloudflareAuthHandler(req('/sign-out',{}, {cookie:secondCookie}),env)).status,200)
assert.equal(await (await cloudflareAuthHandler(req('/get-session',null,{cookie:secondCookie}),env)).json(),null)

// Transactional emails are captured in memory. No message is sent to a person.
const mail = []
const emailAuth = createCloudflareAuth({database,origin,secret,registrationEnabled:true,
  sendMail: async message => { mail.push(message) }})
const signup = await emailAuth.handler(req('/sign-up/email',{
  email:'signup@example.invalid',name:'Synthetic signup',password,callbackURL:'/profile',
},{'cf-connecting-ip':'192.0.2.20'}))
assert.equal(signup.status,200,await signup.clone().text())
const signupId = (await signup.json()).user.id
assert.match(signupId,/^[a-f0-9-]{36}$/)
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM account_identities WHERE id=?').get(signupId).n,1)
assert.equal(sqlite.prepare('SELECT count(*) AS n FROM auth_sessions WHERE userId=?').get(signupId).n,0)
assert.equal(mail.length,1)
assert.equal(mail[0].purpose,'verify-email')
assert.equal(new URL(mail[0].url).origin,origin)
const confirmation = await emailAuth.handler(new Request(mail[0].url))
assert.equal(confirmation.status,302)
assert.equal(sqlite.prepare('SELECT emailVerified FROM auth_users WHERE id=?').get(signupId).emailVerified,1)
const signupLogin = await emailAuth.handler(req('/sign-in/email',{email:'signup@example.invalid',password},{'cf-connecting-ip':'192.0.2.21'}))
assert.equal(signupLogin.status,200)
const signupCookie = signupLogin.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')
assert.equal((await emailAuth.handler(req('/request-password-reset',{email:'signup@example.invalid',redirectTo:'/auth/reset-password'},
  {'cf-connecting-ip':'192.0.2.22'}))).status,200)
const resetMail = mail.find(m=>m.purpose==='reset-password')
assert.ok(resetMail)
const redirect = await emailAuth.handler(new Request(resetMail.url))
assert.equal(redirect.status,302)
const resetToken = new URL(redirect.headers.get('location')).searchParams.get('token')
assert.ok(resetToken)
assert.equal((await emailAuth.handler(req('/reset-password',{token:resetToken,newPassword:password+'-new'},
  {'cf-connecting-ip':'192.0.2.23'}))).status,200)
assert.equal(await (await emailAuth.handler(req('/get-session',null,{cookie:signupCookie}))).json(),null)
assert.equal((await emailAuth.handler(req('/reset-password',{token:resetToken,newPassword:password+'-replay'},
  {'cf-connecting-ip':'192.0.2.24'}))).status,400)

// GitHub's public username can change; its numeric subject must continue to
// select the archived internal UUID. Provider HTTP responses are synthetic.
const githubId = '50000000-0000-4000-8000-000000000001'
const githubAccount = '60000000-0000-4000-8000-000000000001'
const githubRows = convertAuthRows([{...sourceUser,id:githubId,email:'github@example.invalid',encrypted_password:null}],
  [{...sourceIdentity,id:githubAccount,user_id:githubId,provider:'github',provider_id:'123456789'}],
  [{...sourceProfile,id:githubId}])
for (const [table,rows] of [['auth_users',githubRows.users],['auth_accounts',githubRows.accounts]]) {
  for(const row of rows) {
    const names=Object.keys(row)
    sqlite.prepare(`INSERT INTO ${table} (${names.map(n=>`"${n}"`).join(',')}) VALUES (${names.map(()=>'?').join(',')})`).run(...Object.values(row))
  }
}
const oauthAuth = createCloudflareAuth({database,origin,secret,github:{clientId:'synthetic-client',clientSecret:'synthetic-secret'}})
const originalFetch=globalThis.fetch
let subject=123456789, callbackCalls=0
try {
  globalThis.fetch=async input=>{
    const url=typeof input==='string'?input:input instanceof URL?input.href:input.url
    callbackCalls++
    if(url==='https://github.com/login/oauth/access_token') return Response.json({access_token:'synthetic-oauth-token',token_type:'bearer',scope:'read:user,user:email'})
    if(url==='https://api.github.com/user') return Response.json({id:subject,login:'renamed-synthetic-user',name:'Synthetic GitHub',email:'github@example.invalid',avatar_url:null})
    if(url==='https://api.github.com/user/emails') return Response.json([{email:'github@example.invalid',primary:true,verified:true}])
    throw new Error('Unexpected outbound request in isolated OAuth test')
  }
  const githubLogin=async ip=>{
    const start=await oauthAuth.handler(req('/sign-in/social',{provider:'github',callbackURL:'/profile',disableRedirect:true},{'cf-connecting-ip':ip}))
    assert.equal(start.status,200,await start.clone().text())
    const authorization=new URL((await start.json()).url)
    assert.equal(authorization.origin,'https://github.com')
    assert.equal(authorization.searchParams.get('redirect_uri'),origin+'/api/auth/callback/github')
    const cookie=start.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')
    return oauthAuth.handler(req('/callback/github?code=synthetic-code&state='+authorization.searchParams.get('state'),null,{cookie,'cf-connecting-ip':ip}))
  }
  const githubLoginResponse=await githubLogin('192.0.2.30')
  assert.equal(githubLoginResponse.status,302)
  assert.equal(new URL(githubLoginResponse.headers.get('location'),origin).href,origin+'/profile')
  const githubCookie=githubLoginResponse.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')
  const githubSession=await oauthAuth.handler(req('/get-session',null,{cookie:githubCookie}))
  assert.equal((await githubSession.json()).user.id,githubId)
  const storedToken=sqlite.prepare('SELECT accessToken FROM auth_accounts WHERE id=?').get(githubAccount).accessToken
  assert.ok(storedToken && storedToken!=='synthetic-oauth-token')
  // Same verified email with a different provider subject cannot take over.
  subject=987654321
  const impersonation=await githubLogin('192.0.2.31')
  assert.equal(impersonation.status,302)
  assert.notEqual(new URL(impersonation.headers.get('location'),origin).href,origin+'/profile')
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM auth_accounts WHERE providerId='github' AND accountId='987654321'").get().n,0)
  assert.ok(!impersonation.headers.getSetCookie().some(c=>c.includes('session_token=')))
  assert.equal(callbackCalls,6)
} finally { globalThis.fetch=originalFetch }
assert.equal(sqlite.prepare('PRAGMA foreign_key_check').all().length,0)
sqlite.close()
console.log('Cloudflare auth: legacy/new password, identity mapping, cookies, origin protection, email verification, one-time reset, atomic revocation, concurrent rate limiting, logout and simulated GitHub callback/subject isolation passed')
