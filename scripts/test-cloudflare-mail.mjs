import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createCloudflareAuthMailer} from '../lib/auth/cloudflare-mail.ts'
import {cloudflareAuthHandler} from '../lib/auth/cloudflare-handler.ts'
import {sqliteD1} from './fixtures/sqlite-d1.mjs'
const origin='https://www.openagentskill.com',sent=[]
const binding={async send(mail){sent.push(mail);return {messageId:'fixture-only'}}}
const send=createCloudflareAuthMailer(binding,origin)
await send({to:'fixture@example.invalid',url:origin+'/api/auth/verify-email?token=synthetic&callbackURL=%2Fauth%2Flogin',purpose:'verify-email'})
assert.equal(sent[0].from,'noreply@openagentskill.com');assert.match(sent[0].html,/&amp;callbackURL=/)
for(const mail of [{to:'fixture@example.invalid\nBcc:bad@example.invalid',url:origin+'/api/auth/verify-email'},
 {to:'fixture@example.invalid',url:'https://evil.invalid/api/auth/verify-email'},
 {to:'fixture@example.invalid',url:origin+'/api/payments/checkout'}])await assert.rejects(send({...mail,purpose:'verify-email'}),/Invalid/)
await assert.rejects(createCloudflareAuthMailer({async send(){throw new Error('private token leak')}},origin)({to:'fixture@example.invalid',url:origin+'/api/auth/reset-password/fixture-only',purpose:'reset-password'}),/^Error: Authentication email delivery failed$/)
const {sqlite,database}=sqliteD1()
for(const n of ['0001_commerce','0002_auth','0003_business','0004_catalog','0005_account_profile','0011_search_cost'])sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${n}.sql`,import.meta.url),'utf8'))
const env={HOSTING_PROVIDER:'cloudflare',MIGRATION_READ_ONLY:'0',CLOUDFLARE_AUTH_ENABLED:'1',AUTH_ORIGIN:origin,
 BETTER_AUTH_SECRET:crypto.randomUUID()+crypto.randomUUID(),APP_DB:database,AUTH_EMAIL_ENABLED:'1',AUTH_REGISTRATION_ENABLED:'1',AUTH_EMAIL:binding}
const request=(path,body)=>new Request(origin+'/api/auth'+path,{method:'POST',headers:{origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.99'},body:JSON.stringify(body)})
try{
 const body={email:'new-fixture@example.invalid',password:'synthetic-fixture-password',name:'Fixture member',callbackURL:origin+'/auth/login'}
 assert.equal((await cloudflareAuthHandler(request('/sign-up/email',body),{...env,AUTH_EMAIL:undefined})).status,503)
 assert.equal(sqlite.prepare('SELECT count(*) n FROM auth_users').get().n,0)
 const signup=await cloudflareAuthHandler(request('/sign-up/email',body),env)
 assert.equal(signup.status,200);assert.equal(sqlite.prepare('SELECT count(*) n FROM profiles').get().n,1)
 assert.equal(sent.length,2);assert.equal(sent[1].to,body.email)
 assert.equal((await cloudflareAuthHandler(request('/sign-in/email',body),env)).status,403,'Unverified accounts cannot sign in')
 const url=sent[1].text.match(/Verify email: (\S+)/)[1]
 const verification=await cloudflareAuthHandler(new Request(url,{headers:{origin}}),env)
 assert.equal(verification.status,302)
 assert.equal((await cloudflareAuthHandler(request('/sign-in/email',body),env)).status,200)
 assert.equal(sqlite.prepare('SELECT emailVerified FROM auth_users').get().emailVerified,1)
 console.log('Cloudflare auth mail integration passed: bound sender, origin checks, escaped links, gated signup, profile creation, verification and login. No real emails sent.')
}finally{sqlite.close()}
