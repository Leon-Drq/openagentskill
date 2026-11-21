import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {loadSnapshot} from '../lib/readonly/snapshot.mjs'
import {unstable_dev} from 'wrangler'
process.env.WRANGLER_SEND_METRICS='false'
const report=JSON.parse(await fs.readFile('.readonly-build/report.json','utf8'))
const catalog=await loadSnapshot(),slug=catalog.skills[0].slug
const worker=await unstable_dev('cloudflare/readonly-worker.mjs',{config:'wrangler.readonly.jsonc',local:true,ip:'127.0.0.1',port:0,inspectorPort:0,logLevel:'error',experimental:{disableExperimentalWarning:true}})
const outcomes=[]
try {
  for(const route of ['/','/zh','/skills','/zh/skills?sort=quality&page=2&category=design-creative',`/skills/${slug}`,`/zh/skills/${slug}`,'/rankings','/best/presentation-generation','/showcase','/guides','/blog','/sitemap.xml','/robots.txt','/reader/status.json']) {
    const response=await worker.fetch('http://localhost'+route,{redirect:'manual'})
    if(response.status!==200)console.error('Unexpected asset response',route,response.status,response.headers.get('Location'))
    assert.equal(response.status,200,route);assert.equal(response.headers.get('X-OAS-Mode'),'readonly',route)
    assert.equal(response.headers.get('X-OAS-Dynamic-Fallback'),null,'Public assets bypass the Worker')
    assert.equal(response.headers.get('Set-Cookie'),null)
    const body=await response.text()
    if(!/\.xml$|\.txt$|\.json$/.test(route)){assert.match(body,/OpenAgentSkill/);assert.ok(!body.includes('Temporarily paused'))}
    outcomes.push({route,status:200})
  }
  for(const route of ['/api/cron/skill-radar','/api/payments/library','/auth/callback?code=test','/membership','/creator','/skills/not-an-exported-record']) {
    const response=await worker.fetch('http://localhost'+route)
    assert.equal(response.status,503,route);assert.equal(response.headers.get('Retry-After'),'3600');assert.equal(response.headers.get('X-Robots-Tag'),null)
    await response.text();outcomes.push({route,status:503})
  }
  const write=await worker.fetch('http://localhost/api/payments/webhook',{method:'POST',body:'{}'})
  assert.equal(write.status,503);assert.equal((await write.json()).error,'feature_temporarily_unavailable')
  const search=await worker.fetch('http://localhost'+report.searchManifest),manifest=await search.json()
  assert.equal(manifest.count,report.skills)
  let count=0,withImages
  for(const shard of manifest.shards){const response=await worker.fetch('http://localhost'+shard);assert.equal(response.status,200);assert.equal(response.headers.get('X-OAS-Dynamic-Fallback'),null);const rows=await response.json();count+=rows.length;withImages||=rows.find(row=>row.image)}
  assert.equal(count,report.skills)
  if(withImages){const image=await worker.fetch('http://localhost'+withImages.image,{method:'HEAD'});assert.equal(image.status,200);assert.match(image.headers.get('Cache-Control'),/max-age=604800/)}
  const gallery=await worker.fetch('http://localhost/showcase')
  assert.match(gallery.headers.get('Cache-Control'),/max-age=300/);await gallery.text()
  const status=await worker.fetch('http://localhost/reader/status.json')
  assert.match(status.headers.get('Cache-Control'),/no-store/);await status.text()
  const dir=await worker.fetch('http://localhost/skills/',{redirect:'manual'})
  assert.equal(dir.status,307);assert.match(dir.headers.get('Location'),/\/skills$/);await dir.text()
  await fs.writeFile('.readonly-build/runtime-acceptance.json',JSON.stringify({passed:true,at:new Date().toISOString(),checks:outcomes,searchRows:count,sample:report.sample},null,2))
  console.log(`Native read-only runtime passed: ${outcomes.length} public/inactive routes, ${count} search records, static cache headers and blocked writes.`)
} finally {await worker.stop()}
