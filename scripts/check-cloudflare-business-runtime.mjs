import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { unstable_dev } from 'wrangler'

process.env.WRANGLER_SEND_METRICS = 'false'
mkdirSync(resolve('.codex-tmp'),{recursive:true})
const directory = mkdtempSync(resolve('.codex-tmp/business-runtime-'))
const configPath = resolve(directory,'wrangler.json'), persistTo = resolve(directory,'state')
const script = resolve('scripts/fixtures/cloudflare-business-worker.mjs')
writeFileSync(configPath,JSON.stringify({name:'openagentskill-business-local-test',main:script,
  compatibility_date:'2026-10-01',compatibility_flags:['nodejs_compat'],workers_dev:false,
  alias:{'server-only':resolve('scripts/fixtures/server-only-empty.mjs')},
  d1_databases:[{binding:'APP_DB',database_name:'business-local-test',database_id:'00000000-0000-4000-8000-000000000000'}],
  vars:{BUSINESS_TEST_ONLY:'1'},
},null,2),{mode:0o600})
const sqlPath = resolve(directory,'schema.sql')
writeFileSync(sqlPath,['0001_commerce','0002_auth','0003_business','0004_catalog'].map(n=>readFileSync(resolve('cloudflare/migrations/data',`${n}.sql`),'utf8')).join('\n'))
try {
  await promisify(execFile)(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','APP_DB','--local','--config',configPath,'--persist-to',persistTo,'--file',sqlPath],{windowsHide:true,env:process.env})
} catch { throw new Error('Local business schema initialization failed') }
let worker
try {
  worker = await unstable_dev(script,{config:configPath,local:true,persist:true,persistTo,
    ip:'127.0.0.1',port:0,inspectorPort:0,logLevel:'error',experimental:{disableExperimentalWarning:true}})
  const response = await worker.fetch('http://localhost/check',{method:'POST'})
  const report = await response.json()
  assert.equal(response.status,200,JSON.stringify(report))
  assert.equal(report.passed,true)
  writeFileSync(resolve(directory,'report.json'),JSON.stringify({at:new Date().toISOString(),runtime:'workerd',database:'local native D1 binding',...report},null,2))
  console.log(JSON.stringify(report))
} finally { await worker?.stop() }
