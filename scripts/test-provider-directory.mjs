import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
import ts from 'typescript'
import { z } from 'zod'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { EXTERNAL_SKILLS } = await import('../lib/skills/external-catalog.ts')
const { selectProviderSkills, providerCatalogWindow, mergeProviderCatalogPage, toProviderDirectorySkill } = await import('../lib/skills/provider-directory.ts')
const defaults = {category:'all',topic:'all',output:'all',pricing:'all',examplesOnly:true,platform:'all',quality:'all',trust:'all',safety:'all',supplyTrack:'all',minStars:0,useCase:'all'}
assert.equal(selectProviderSkills(defaults).length,9)
assert.equal(selectProviderSkills({...defaults,query:'Skillry'}).length,8)
assert.equal(selectProviderSkills({...defaults,pricing:'free'}).length,8)
assert.equal(selectProviderSkills({...defaults,category:'presentation'}).length,4)
assert.equal(selectProviderSkills({...defaults,output:'image'}).length,2)
assert.equal(selectProviderSkills({...defaults,topic:'ui-design'}).length,3)
for (const filter of ['platform','quality','trust','safety','supplyTrack','useCase']) assert.equal(selectProviderSkills({...defaults,[filter]:'verified'}).length,0)
assert.equal(selectProviderSkills({...defaults,minStars:1}).length,0)
for (const entry of EXTERNAL_SKILLS) {
  const card = toProviderDirectorySkill(entry,'zh')
  assert.ok(card.exampleCount>0 && card.provider.image)
  assert.equal(card.verified,false)
  assert.equal(card.technical.installCommand,undefined)
  assert.deepEqual(card.compatibility,[])
  assert.ok(card.provider.exampleLabel.includes(entry.provider==='skillry'?'原站案例':'本站实录'))
  if (entry.provider==='skillry') assert.equal(new URL(card.provider.sourceHref).searchParams.get('via'),'openagentskill')
}
// Walk actual windows with a simulated SQL slice. Every row appears once, even
// when the provider segment straddles a page, registry is empty or a page is past end.
for (const count of [0,1,7,16,17,35,100]) for (const providerCount of [0,1,9,16,17,35]) for (const sort of ['quality','stars','downloads','trending']) {
  const registry = Array.from({length:count},(_,i)=>'registry-'+i)
  const providers = Array.from({length:providerCount},(_,i)=>'provider-'+i)
  const expected = sort==='quality'?[...providers,...registry]:[...registry,...providers]
  const all=[]
  for (let offset=0;offset<=expected.length+16;offset+=16) {
    const window=providerCatalogWindow(offset,providerCount,sort)
    const result=mergeProviderCatalogPage(registry.slice(window.offset,window.offset+window.limit),providers,count,offset,sort)
    assert.deepEqual(result.items,expected.slice(offset,offset+16),`${count}/${providerCount}/${sort}/${offset}`)
    assert.equal(result.total,expected.length)
    assert.equal(result.hasMore,offset+16<expected.length)
    all.push(...result.items)
  }
  assert.deepEqual(all,expected)
}
// Execute the real route with mocked identity/database clients to verify that
// provider writes never require a GitHub record or bypass the original review lane.
const route = readFileSync('app/api/skills/engagement/route.ts','utf8')
const compiled=ts.transpileModule(route,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const calls=[]
let user={id:'test-user',is_anonymous:false}
const fakeDb={auth:{getUser:async()=>({data:{user},error:null})},rpc:async(name,args)=>{calls.push([name,args]);return{data:null,error:null}},from:name=>{throw Error('Unexpected table lookup: '+name)}}
const totals=[{skill_slug:'skillry-grokbot-avatar',likes:2,dislikes:1}]
const out={}
new Function('exports','require',compiled)(out,name=>{
  if (name==='next/server') return{NextResponse:{json:(body,options)=>Response.json(body,options)}}
  if (name==='next/cache') return{unstable_cache:fn=>fn,revalidateTag:()=>{}}
  if (name==='zod') return { z }
  if (name==='@/lib/supabase/server') return{createClient:async()=>fakeDb}
  if (name==='@/lib/supabase/admin') return{createAdminClient:()=>({rpc:async(name,args)=>{calls.push([name,args]);return{data:totals,error:null}}})}
  if (name==='@/lib/async') return{withTimeout:promise=>promise}
  if (name==='@/lib/skill-engagement') return{normalizeEngagementSlugs:values=>values.length<=64?values:null}
  if (name==='@/lib/skills/external-catalog') return{getExternalSkill:slug=>EXTERNAL_SKILLS.find(e=>e.slug===slug)}
  throw Error(name)
})
function request(body,origin='https://www.openagentskill.com') {
  const req=new Request('https://www.openagentskill.com/api/skills/engagement',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
  req.nextUrl=new URL(req.url);return req
}
let response=await out.PUT(request({slug:'skillry-grokbot-avatar',vote:1}))
assert.equal(response.status,200)
assert.equal((await response.json()).likes,2)
assert.equal(calls[0][0],'set_provider_skill_engagement')
assert.equal(calls[0][1].intent,'vote')
assert.equal(calls[1][0],'provider_skill_vote_counts')
calls.length=0
response=await out.PUT(request({slug:'skillry-grokbot-avatar',saved:true}))
assert.equal(response.status,200)
assert.deepEqual(calls[0][1],{target_slug:'skillry-grokbot-avatar',intent:'save',direction:null,target_saved:true})
user=null
assert.equal((await out.PUT(request({slug:'skillry-grokbot-avatar',saved:true}))).status,401)
user={id:'anonymous',is_anonymous:true}
assert.equal((await out.PUT(request({slug:'skillry-grokbot-avatar',vote:1}))).status,401)
assert.equal((await out.PUT(request({slug:'skillry-grokbot-avatar',vote:1},'https://evil.example'))).status,403)
assert.equal((await out.PUT(request({slug:'skillry-grokbot-avatar',vote:2}))).status,400)
console.log('Unified provider directory: cases, filters, complete pagination and authenticated vote/save API passed.')
