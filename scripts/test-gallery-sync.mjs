import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { syncGallery } from './sync-gallery.mjs'
import { boundedFetch, candidates, digest, planItem, safePath, slugFor } from './gallery/core.mjs'

for (const bad of ['../secret','/etc/passwd','images/../../a.png','a\\b.png','a/%2e%2e/b','https://evil/a.png']) assert.equal(safePath(bad),false)
const rule = {source:'test',group:'cover',prefix:'screenshots/'}
const blob = (path) => ({path,type:'blob',mode:'100644'})
const tree = { tree:[blob('screenshots/a.png'),blob('screenshots/b.svg'),blob('screenshots/nested/c.png'),{...blob('screenshots/link.png'),mode:'120000'},blob('outside/a.png')] }
assert.deepEqual(candidates(tree,[rule]).map(x=>x.path),['screenshots/a.png'])
assert.throws(()=>candidates({...tree,truncated:true},[rule]),/Incomplete/)
assert.equal(candidates({tree:[blob('screenshots/a.png'),blob('screenshots/LICENSE')]},[rule])[0].nested,true)
assert.equal(slugFor('baoyu','screenshots/a.png'),slugFor('baoyu','screenshots/a.png'))
assert.notEqual(slugFor('baoyu','screenshots/a.png'),slugFor('baoyu','other/a.png'))
const hash = digest('bytes')
assert.equal(planItem({hash,knownHashes:new Set()}),'added')
assert.equal(planItem({hash,old:{sha256:hash},knownHashes:new Set([hash])}),'unchanged')
assert.equal(planItem({hash,old:{sha256:'old'},knownHashes:new Set()}),'updated')
assert.equal(planItem({hash,knownHashes:new Set([hash])}),'duplicate')
await assert.rejects(boundedFetch('https://example.org/image'),/Unapproved/)
await assert.rejects(boundedFetch('https://raw.githubusercontent.com/a/b/c',{maxBytes:3,fetcher:async()=>new Response('four')}),/byte limit/)
let attempts=0
assert.equal((await boundedFetch('https://api.github.com/repos/a/b',{sleep:async()=>{},fetcher:async()=> ++attempts<3 ? new Response('',{status:503}):new Response('ok')})).toString(),'ok')
assert.equal(attempts,3)
attempts=0
await assert.rejects(boundedFetch('https://api.github.com/repos/a/b',{sleep:async()=>{},fetcher:async()=>{attempts++;return new Response('',{status:404})}}),/404/)
assert.equal(attempts,1)
await boundedFetch('https://raw.githubusercontent.com/a/b/c',{token:'secret',fetcher:async(_url,options)=>{assert.equal(options.headers.Authorization,undefined);assert.equal(options.redirect,'error');return new Response('ok')}})
await boundedFetch('https://api.github.com/repos/a/b',{token:'secret',fetcher:async(_url,options)=>{assert.equal(options.headers.Authorization,'Bearer secret');return new Response('ok')}})
const entries = JSON.parse(await readFile(new URL('../lib/showcase-auto.json',import.meta.url),'utf8'))
const seen = new Set()
for (const item of entries) {
  assert.ok(!seen.has(item.sha256)); seen.add(item.sha256)
  assert.equal(item.slug,slugFor(item.source,item.asset))
  assert.match(item.revision,/^[a-f0-9]{40}$/)
  assert.equal(digest(await readFile(new URL(`../public${item.media.src}`,import.meta.url))),item.sha256)
}
const route = await readFile(new URL('../app/api/showcase/engagement/route.ts',import.meta.url),'utf8')
assert.ok(route.indexOf('!getShowcaseCase(body.slug)') < route.indexOf(".from('showcase_entries')"))
assert.ok(route.indexOf("return json({ error: 'sign_in_required' }") < route.indexOf(".from('showcase_entries')"))
assert.ok(route.includes("{ onConflict: 'slug', ignoreDuplicates: true }"))
console.log('Gallery sync: source boundaries, incomplete trees, deduplication, update identity, download limits, retries, credential isolation, image hashes and authenticated registration passed.')

// Run the real collector against controlled source responses, without network or repository writes.
const require = createRequire(import.meta.url)
const sharp = require(require.resolve('sharp', {paths:[require.resolve('next/package.json')]}))
const fixture = await mkdtemp(path.join(tmpdir(),'oas-gallery-test-'))
try {
  for (const dir of ['scripts/gallery','lib','public/showcase']) await mkdir(path.join(fixture,dir),{recursive:true})
  const put = async(file,value)=>writeFile(path.join(fixture,file),JSON.stringify(value))
  await put('scripts/gallery/sources.json',{maxNewPerRun:1,maxAssetsPerRun:10,rules:[{...rule,source:'fixture'}]})
  await put('lib/showcase-sources.json',{fixture:{repo:'test/fixture',licensePath:'LICENSE'}})
  await put('lib/showcase-groups.json',{cover:{source:'fixture',category:'image'}})
  await put('lib/showcase-curation.json',[])
  await put('lib/showcase-media.json',{})
  await put('lib/showcase-auto.json',[])
  await put('lib/showcase-sync.json',{updatedAt:'2026-09-01'})
  await writeFile(path.join(fixture,'public/showcase/curated-fixture-LICENSE.txt'),'MIT\r\n')
  let bytes = await sharp({create:{width:600,height:400,channels:3,background:'red'}}).png().toBuffer()
  let license='MIT\n', version='a', missing=false
  const fetcher = async(url)=> {
    if (url.endsWith('/commits/HEAD')) return Response.json({sha:'a'.repeat(40)})
    if (url.includes('/git/trees/')) return Response.json({tree:[...(missing?[]:[{...blob('screenshots/a.png'),sha:version,size:bytes.length}]),{...blob('screenshots/b.png'),sha:'b',size:bytes.length}]})
    if (url.endsWith('/LICENSE')) return new Response(license)
    return new Response(bytes)
  }
  const run = ()=>syncGallery({root:fixture,fetcher,summaryFile:null,now:'2026-09-19T00:00:00.000Z'})
  const first = await run(); assert.equal(first.added,1); assert.equal(first.deferred,1)
  const catalogPath=path.join(fixture,'lib/showcase-auto.json')
  const firstCatalog=await readFile(catalogPath,'utf8')
  const second = await run(); assert.equal(second.added,0); assert.equal(second.unchanged,1); assert.equal(second.skipped,1)
  assert.equal(await readFile(catalogPath,'utf8'),firstCatalog,'Rerun must preserve the exact catalog')
  bytes=await sharp({create:{width:600,height:400,channels:3,background:'blue'}}).png().toBuffer(); version='changed'
  const changed=await run(); assert.equal(changed.updated,1)
  const updated=JSON.parse(await readFile(catalogPath,'utf8'))
  assert.equal(updated[0].slug,JSON.parse(firstCatalog)[0].slug)
  assert.notEqual(updated[0].media.src,JSON.parse(firstCatalog)[0].media.src)
  missing=true
  assert.equal((await run()).sources[0].missing.length,1)
  assert.equal(JSON.parse(await readFile(catalogPath,'utf8')).length,1,'Missing source must not delete a published case')
  const beforeFailure=await readFile(catalogPath,'utf8')
  license='All rights reserved'
  await assert.rejects(run(),/source check failed/)
  assert.equal(await readFile(catalogPath,'utf8'),beforeFailure,'Failed source must leave published catalog untouched')
  console.log('Gallery integration: real image generation, incremental cap, rerun idempotence, changed image/unchanged URL, missing retention and atomic source failure passed.')
} finally {
  if (path.dirname(fixture) !== path.resolve(tmpdir()) || !path.basename(fixture).startsWith('oas-gallery-test-')) throw new Error('Unexpected fixture directory')
  await rm(fixture,{recursive:true,force:true})
}
