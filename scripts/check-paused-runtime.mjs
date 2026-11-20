import assert from 'node:assert/strict'
import {mkdtemp, mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {unstable_dev} from 'wrangler'

process.env.WRANGLER_SEND_METRICS = 'false'
await mkdir('.codex-tmp',{recursive:true})
const persistTo = await mkdtemp(resolve('.codex-tmp/paused-runtime-'))
const worker = await unstable_dev('cloudflare/paused-worker.mjs',{
  config:'wrangler.paused.jsonc',local:true,persist:true,persistTo,
  ip:'127.0.0.1',port:0,inspectorPort:0,logLevel:'error',
  experimental:{disableExperimentalWarning:true},
})
try {
  for(const path of ['/','/zh/']) {
    const response = await worker.fetch('http://localhost'+path)
    assert.equal(response.status,200,path)
    assert.equal(response.headers.get('X-OAS-Mode'),'paused')
    assert.match(await response.text(),path==='/zh/'?/暂时停止服务/:/Temporarily paused/)
  }
  for(const path of ['/skills?q=video','/zh/skills/example','/api/cron/skill-radar','/api/payments/webhook']) {
    const response = await worker.fetch('http://localhost'+path)
    assert.equal(response.status,503,path)
    assert.equal(response.headers.get('Retry-After'),'3600')
    assert.equal(response.headers.get('X-Robots-Tag'),null)
    await response.text()
  }
  const write = await worker.fetch('http://localhost/api/payments/webhook',{method:'POST',body:'{}'})
  assert.equal(write.status,503)
  assert.equal((await write.json()).error,'site_temporarily_paused')
  console.log('Native Workers pause runtime passed: static notices and real fallback/API/write 503 responses.')
} finally {await worker.stop()}
