// Read-only HTTP smoke checks. Pass an origin; optional access file is an official, short-lived Vercel preview share URL.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {register} from 'node:module'
register('./test-owner-publication-loader.mjs',import.meta.url)
const {getRankingDefinitions}=await import('../lib/rankings.ts')
const origin=process.argv[2] || 'http://localhost:3116'
let cookie=''
if(process.argv[3]) {
  const access=JSON.parse(readFileSync(process.argv[3],'utf8'))
  assert.equal(new URL(access.url).origin,origin)
  const response=await fetch(access.url,{redirect:'manual',signal:AbortSignal.timeout(20000)})
  cookie=response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')
  assert.ok(cookie,'Official preview access cookie required')
}
const paths=getRankingDefinitions().filter(d=>d.slug!=='agent-proven').map(d=>`/rankings/${d.slug}`)
for(const lang of ['zh','ja','ko','es','de','fr','id']) paths.push(`/rankings/new-agent-skills-this-week?lang=${lang}`)
let shareImage=''
for(const path of paths) {
  const response=await fetch(origin+path,{headers:cookie?{cookie}:{},signal:AbortSignal.timeout(30000)})
  assert.equal(response.status,200,path)
  const html=await response.text()
  const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
  assert.equal(canonical,'https://www.openagentskill.com'+path.split('?')[0])
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1)
  const title=html.match(/<title>(.*?)<\/title>/)?.[1]
  assert.equal((title?.match(/OpenAgentSkill/g)||[]).length,1)
  const robots=html.match(/<meta name="robots" content="([^"]+)"/)?.[1]
  assert.ok(robots?.startsWith(path.includes('?')?'noindex':'index'),`${path}: ${robots}`)
  const source=html.match(/data-ranking-source="([^"]+)"/)?.[1]
  assert.equal(source,'directory',`${path} requires current directory data, not fallback or an outage`)
  const docs=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]))
  const graph=docs.find(d=>d['@graph']?.some(n=>n['@type']==='CollectionPage'))?.['@graph']
  const list=graph?.find(n=>n['@type']==='ItemList')
  assert.ok(list)
  const rows=(html.match(/<li value="\d+"/g)||[]).length
  assert.equal(list.numberOfItems,rows)
  assert.ok(rows<=30)
  if(path.includes('new-agent-skills-this-week')) assert.ok(rows>0,'This release expects known recent production additions')
  assert.ok(graph.find(n=>n['@type']==='BreadcrumbList'))
  if(!shareImage) shareImage=html.match(/<meta property="og:image" content="([^"]+)"/)?.[1]?.replaceAll('&amp;','&') || ''
  console.log(JSON.stringify({path,status:response.status,rows,source,robots}))
}
const notFound=await fetch(origin+'/rankings/not-a-real-ranking',{headers:cookie?{cookie}:{},signal:AbortSignal.timeout(30000)})
assert.equal(notFound.status,404); await notFound.body.cancel()
if(shareImage) {
  // Use this deployment's version of the observed metadata path, not a different production revision.
  const imageUrl=new URL(shareImage)
  const response=await fetch(origin+imageUrl.pathname+imageUrl.search,{headers:cookie?{cookie}:{},signal:AbortSignal.timeout(30000)})
  assert.equal(response.status,200)
  assert.match(response.headers.get('content-type'),/^image\//)
  await response.arrayBuffer()
}
console.log('All 36 shared ranking routes, 7 language variants, 404 and share-image response passed.')
