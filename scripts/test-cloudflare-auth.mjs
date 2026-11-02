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
assert.equal(sqlite.prepare('PRAGMA foreign_key_check').all().length,0)
sqlite.close()
console.log('Cloudflare auth: legacy/new password, identity mapping, cookies, origin protection, verified email, atomic revocation, concurrent rate limiting and logout passed')
