// Read-only capture of one complete public sitemap generation. The output is
// replaced atomically only after every advertised skill shard is verified.
import assert from 'node:assert/strict'
import {writeFile,rename} from 'node:fs/promises'
import {packCacheJson} from '../lib/cache/packed-json.ts'
import {validateSkillSitemapSnapshot} from '../lib/seo/sitemap-snapshot.ts'
import {buildSearchIndexFilter} from '../lib/seo/search-indexability.ts'
const origin=new URL(process.argv[2]||'https://www.openagentskill.com').origin
const canonical='https://www.openagentskill.com'
const decode=s=>s.replace(/&(amp|lt|gt|quot|apos);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[key]))
async function get(path){
  const response=await fetch(origin+path,{signal:AbortSignal.timeout(120000),headers:{'User-Agent':'OpenAgentSkill-Sitemap-Backup/1.0'}})
  assert.equal(response.status,200,`${path}: HTTP ${response.status}`)
  assert.match(response.headers.get('content-type')||'',/xml/)
  const generation=response.headers.get('x-sitemap-snapshot')
  assert.ok(generation&&Number.isFinite(Date.parse(generation)),'A verified complete generation is required')
  return {body:await response.text(),generation}
}
const index=await get('/sitemap.xml')
const shards=[...index.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(decode(m[1]))).filter(u=>/^\/sitemaps\/skills-\d+\.xml$/.test(u.pathname))
assert.ok(shards.length>0);assert.equal(new Set(shards.map(u=>u.href)).size,shards.length)
const entries=[]
for(let i=0;i<shards.length;i++){
  assert.equal(shards[i].origin,canonical);assert.equal(shards[i].pathname,`/sitemaps/skills-${i}.xml`)
  const shard=await get(shards[i].pathname)
  assert.equal(shard.generation,index.generation,'Generation changed: discard capture and retry later')
  const rows=[...shard.body.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m=>{
    const field=name=>m[1].match(new RegExp(`<${name}>([^<]+)</${name}>`))?.[1]
    return {url:decode(field('loc')||''),lastModified:field('lastmod'),changeFrequency:field('changefreq'),priority:Number(field('priority'))}
  })
  assert.ok(rows.length>0&&rows.length<=1000)
  if(i<shards.length-1)assert.equal(rows.length,1000,'Incomplete intermediate shard')
  entries.push(...rows);console.log(`Verified shard ${i+1}/${shards.length}: ${rows.length} URLs`)
}
const snapshot=validateSkillSitemapSnapshot({version:1,policy:buildSearchIndexFilter(),generatedAt:index.generation,count:entries.length,entries},buildSearchIndexFilter())
const target=new URL('../lib/seo/sitemap-backup.json',import.meta.url),temporary=new URL('../.codex-tmp/sitemap-backup.pending.json',import.meta.url)
await writeFile(temporary,JSON.stringify({packed:await packCacheJson(snapshot)})+'\n');await rename(temporary,target)
console.log(`Saved complete snapshot: ${snapshot.count} URLs, ${snapshot.generatedAt}`)
