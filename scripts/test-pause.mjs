import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'

const en = await fs.readFile(new URL('../cloudflare/paused-assets/index.html',import.meta.url),'utf8')
const zh = await fs.readFile(new URL('../cloudflare/paused-assets/zh/index.html',import.meta.url),'utf8')
const source = await fs.readFile(new URL('../cloudflare/paused-response.mjs',import.meta.url),'utf8')
const sandbox = {Request,Response,URL,english:en,chinese:zh}
vm.createContext(sandbox)
vm.runInContext(source.replace(/^import .+$/gm,'').replace('export function','function')+'\nglobalThis.respond = pausedResponse',sandbox)
for(const path of ['/skills?q=video','/zh/skills','/ja/best/ppt','/api/cron/skill-submissions','/zh/api/payments/webhook','/auth/callback','/unknown']) {
  const r = sandbox.respond(new Request('https://www.openagentskill.com'+path))
  assert.equal(r.status,503,path)
  assert.equal(r.headers.get('Retry-After'),'3600')
  assert.equal(r.headers.get('X-Robots-Tag'),null,'Temporary pause must not add noindex')
  const body = await r.text()
  if(path.includes('/api/')||path.includes('/auth/')) assert.equal(JSON.parse(body).error,'site_temporarily_paused')
  else assert.ok(body.includes(path.startsWith('/zh')?'暂时停止服务':'Temporarily paused'))
}
for(const method of ['HEAD','POST','PUT','PATCH','DELETE']) {
  const r = sandbox.respond(new Request('https://www.openagentskill.com/skills',{method}))
  assert.equal(r.status,503)
  if(method==='HEAD') assert.equal(await r.text(),'')
}
const worker = await fs.readFile(new URL('../cloudflare/paused-worker.mjs',import.meta.url),'utf8')
vm.runInContext(worker.replace(/^import .+$/gm,'').replace('export class','class').replace('export default worker','globalThis.worker = worker')+'\nglobalThis.Queue = DOQueueHandler',sandbox)
let alarmsCleared = 0
const queue = new sandbox.Queue({storage:{deleteAlarm:async()=>alarmsCleared++}})
await queue.alarm()
assert.equal(alarmsCleared,1)
assert.equal((await queue.fetch(new Request('https://www.openagentskill.com/revalidate'))).status,503)
await sandbox.worker.scheduled()
const config = JSON.parse(await fs.readFile(new URL('../wrangler.paused.jsonc',import.meta.url)))
const automatic = JSON.parse(await fs.readFile(new URL('../wrangler.production.jsonc',import.meta.url)))
assert.ok(['cloudflare/paused-worker.mjs','cloudflare/readonly-worker.mjs'].includes(automatic.main),'Automatic deployments must not restart the active application')
assert.equal(automatic.vars.CRON_ENABLED,'0')
assert.deepEqual(automatic.triggers.crons,[])
for(const binding of ['d1_databases','r2_buckets','ai','services','send_email','queues']){assert.equal(config[binding],undefined);assert.equal(automatic[binding],undefined)}
assert.deepEqual(config.triggers.crons,[])
assert.equal(config.assets.run_worker_first,false)
assert.equal(config.assets.not_found_handling,'none','Unknown pages must reach 503, never a SPA soft 404')
assert.equal(config.vars.CRON_ENABLED,'0')
assert.ok(!worker.includes('.open-next'))
for(const page of [en,zh]) {assert.ok(!page.includes('<script')); assert.ok(!page.includes('<form')); assert.ok(!page.includes('noindex'))}
console.log('Pause checks passed: 503/retry semantics, blocked APIs/writes, no Next/D1/R2/AI, stopped cron, queue alarm drain and script-free bilingual static pages.')
