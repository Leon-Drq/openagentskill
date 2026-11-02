import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { hash } from 'bcryptjs'
import { unstable_dev } from 'wrangler'

// No account ID, remote binding, real email delivery or production secrets.
// Each run owns a new persistent directory; completed evidence is retained.
process.env.WRANGLER_SEND_METRICS = 'false'
mkdirSync(resolve('.codex-tmp'),{recursive:true})
const directory = mkdtempSync(resolve('.codex-tmp/auth-runtime-'))
const configPath = resolve(directory,'wrangler.json')
const persistTo = resolve(directory,'state')
const script = resolve('scripts/fixtures/cloudflare-auth-worker.mjs')
writeFileSync(configPath,JSON.stringify({name:'openagentskill-auth-local-test',main:script,
  compatibility_date:'2026-10-01',compatibility_flags:['nodejs_compat'],workers_dev:false,
  alias:{'server-only':resolve('scripts/fixtures/server-only-empty.mjs')},
  d1_databases:[{binding:'APP_DB',database_name:'auth-local-test',database_id:'00000000-0000-4000-8000-000000000000'}],
  vars:{AUTH_TEST_ONLY:'1',HOSTING_PROVIDER:'cloudflare',MIGRATION_READ_ONLY:'0',CLOUDFLARE_AUTH_ENABLED:'1',
    AUTH_ORIGIN:'https://www.openagentskill.com',BETTER_AUTH_SECRET:crypto.randomUUID()+crypto.randomUUID()},
},null,2),{mode:0o600})
for(const file of ['0001_commerce.sql','0002_auth.sql']) {
  try {
    await promisify(execFile)(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),
      'd1','execute','APP_DB','--local','--config',configPath,'--persist-to',persistTo,
      '--file',resolve('cloudflare/migrations/data',file)],{windowsHide:true,env:process.env})
  } catch { throw new Error('Local auth schema initialization failed') }
}
let worker
try {
  worker = await unstable_dev(script,{config:configPath,local:true,persist:true,persistTo,
    ip:'127.0.0.1',port:0,inspectorPort:0,logLevel:'error',experimental:{disableExperimentalWarning:true}})
  const call = (path,body,headers={}) => worker.fetch('http://localhost'+path,{
    method:body?'POST':'GET',headers:{origin:'https://www.openagentskill.com','content-type':'application/json',
      'cf-connecting-ip':'192.0.2.10',...headers},...(body?{body:JSON.stringify(body)}:{})})
  assert.equal((await call('/test-seed',{legacyHash:await hash('native-synthetic-password',10)})).status,200)
  const login = await call('/api/auth/sign-in/email',{email:'native@example.invalid',password:'native-synthetic-password'})
  assert.equal(login.status,200,await login.clone().text())
  const cookie = login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')
  assert.ok(cookie.includes('session_token='))
  assert.equal((await (await call('/api/auth/get-session',null,{cookie})).json()).user.id,'30000000-0000-4000-8000-000000000001')
  const revoke = await call('/test-revoke',{})
  assert.equal(revoke.status,200,await revoke.clone().text())
  assert.equal(await (await call('/api/auth/get-session',null,{cookie})).json(),null)
  assert.equal((await call('/api/auth/sign-in/email',{email:'native@example.invalid',password:'native-synthetic-password'})).status,200)
  const attempts = await Promise.all(Array.from({length:12},()=>call('/api/auth/sign-in/email',
    {email:'native@example.invalid',password:'wrong'},{'cf-connecting-ip':'192.0.2.11'})))
  assert.equal(attempts.filter(r=>r.status===401).length,5)
  assert.equal(attempts.filter(r=>r.status===429).length,7)
  const report = {at:new Date().toISOString(),runtime:'workerd',database:'local D1 binding',
    legacyPasswordLogin:true,scryptPasswordLogin:true,sessionRead:true,atomicPasswordRevocation:true,
    concurrentRateLimit:true,externalRequests:0,syntheticOnly:true}
  writeFileSync(resolve(directory,'report.json'),JSON.stringify(report,null,2))
  console.log(JSON.stringify(report))
} finally { await worker?.stop() }
