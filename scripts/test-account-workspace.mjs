import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { z } from 'zod'
import { accountTab, accountHref, safeAccountNext, savedCursor, mergeSavedSlugs, accountXIntent, publicAccountUrl } from '../lib/account-workspace.ts'
import { locales, getLocaleFromSearchParam } from '../lib/i18n/config.ts'
import { publicWebsite } from '../lib/creator-profile.ts'
assert.equal(existsSync(new URL('../app/account-visual-check', import.meta.url)),false,'Never publish a development-only authenticated fixture')
const require = createRequire(import.meta.url)
const read = file => readFileSync(new URL('../'+file, import.meta.url),'utf8')
function load(file, deps = {}) {
  const out = {}
  const js = ts.transpileModule(read(file), { compilerOptions: { module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX } }).outputText
  new Function('exports','require',js)(out, name => name in deps ? deps[name] : require(name))
  return out
}
const { accountCopy } = load('lib/i18n/account-copy.ts', { './config': { locales } })
assert.equal(accountTab('invalid'), 'overview')
for (const bad of ['//evil.test','/\\evil.test','https://evil.test','/\nevil',' /profile']) assert.equal(safeAccountNext(bad),'/profile')
assert.equal(safeAccountNext('/profile?tab=bookmarks&lang=zh'), '/profile?tab=bookmarks&lang=zh')
assert.equal(savedCursor('a),user_id.eq.other'),null)
assert.equal(savedCursor('skillry-example'),'skillry-example')
assert.equal(publicAccountUrl('../profile'),null)
for (const locale of locales) {
  assert.match(accountHref('settings',locale),new RegExp('lang='+locale))
  for (const key of ['workspace','overview','bookmarks','points','settings','creator','shareX','privacy','shareText','save','unavailable','identity']) assert.ok(accountCopy(locale,key))
  const intent = new URL(accountXIntent('alice',accountCopy(locale,'shareText')))
  assert.equal(intent.origin,'https://x.com')
  assert.equal(intent.searchParams.get('url'),'https://www.openagentskill.com/creators/alice')
  assert.equal(intent.searchParams.get('text'),accountCopy(locale,'shareText'))
  assert.ok(!intent.searchParams.get('url').includes('/profile'))
}
assert.deepEqual(mergeSavedSlugs([[{skill_slug:'d'},{skill_slug:'a'}],[{skill_slug:'c'},{skill_slug:'a'}]],2),{slugs:['a','c'],next:'c'})

// A session-scoped view returns the FULL ledger even when >50 recent rows exist.
const ledger = Array.from({length:80},(_,i)=>({amount:i+1}))
const balance = ledger.reduce((n,row)=>n+row.amount,0)
let failRead = false, user = { id:'own-user' }, write = null, profileFailure = false
const reads = [], invalidated = []
const regular = Array.from({length:1005},(_,i)=>({skill_slug:'github-'+String(i).padStart(4,'0')}))
const providerRows = Array.from({length:1005},(_,i)=>({skill_slug:'skillry-'+String(i).padStart(4,'0')}))
function query(table) {
  const spec={table, filters:[],limit:null,after:null,head:false}; reads.push(spec)
  const q={
    select(fields,options) { spec.fields=fields;spec.head=Boolean(options?.head);return q },
    eq(k,v) {spec.filters.push([k,v]);return q},
    gt(k,v) {assert.equal(k,'skill_slug');spec.after=v;return q},
    order(){return q}, limit(n){spec.limit=n;return q}, or(){return q},
    in(k,v){spec.in=[k,v];return q},abortSignal(){return q},
    upsert(value){write=value;return Promise.resolve({error:null})},
    maybeSingle:async()=>({ data:table==='user_points'?{total_points:balance}:{username:'alice'},error:failRead||profileFailure?new Error('offline'):null }),
    then(resolve,reject) {
      let rows=table==='bookmarks'?regular:table==='provider_skill_engagement'?providerRows:[]
      const count=rows.length
      if(spec.after)rows=rows.filter(r=>r.skill_slug>spec.after)
      if(spec.limit)rows=rows.slice(0,spec.limit)
      if(table==='skills')rows=spec.in[1].map(slug=>({slug,name:'Useful '+slug,description:'Skill details',category:'coding'}))
      return Promise.resolve({data:spec.head?null:rows,count,error:failRead?new Error('offline'):null}).then(resolve,reject)
    },
  }; return q
}
const client={auth:{getUser:async()=>({data:{user},error:null})},from:query}
const points=load('lib/account-points.ts')
assert.equal(await points.readAccountPoints(client,user.id),balance)
assert.equal(reads.at(-1).table,'user_points')
assert.ok(reads.at(-1).filters.some(([k,v])=>k==='user_id'&&v===user.id))
failRead=true;assert.equal(await points.readAccountPoints(client,user.id),null);failRead=false
const data=load('lib/account-data.ts',{
 './skills/external-catalog':{getExternalSkill:slug=>slug.startsWith('skillry-')?{provider:'skillry',skillName:'Original name',description:{en:'English detail',zh:'中文简介'},title:{en:'Original name',zh:'原名'}}:null},
 './skills/publication':{PUBLIC_SKILL_FILTER:'public'},'./account-workspace':{mergeSavedSlugs},
})
assert.equal(await data.readSavedCount(client,user.id),2010,'Exact counts across both disjoint bookmark stores exceed PostgREST page caps')
const first = await data.readSavedPage(client,user.id,'zh',null,24)
assert.equal(first.items.length,24);assert.equal(first.next,'github-0023');assert.equal(first.items[0].name,'Useful github-0000')
const second = await data.readSavedPage(client,user.id,'zh',first.next,24)
assert.equal(second.items[0].slug,'github-0024')
const providerPage = await data.readSavedPage(client,user.id,'zh','skillry-0990',24)
assert.equal(providerPage.items.length,14);assert.equal(providerPage.next,null);assert.equal(providerPage.items[0].description,'中文简介')
assert.ok(reads.filter(s=>s.limit).every(s=>s.limit<=25),'Collection reads are bounded, never load >1000 rows')
assert.ok(reads.every(s=>s.table==='skills'||s.filters.some(([k,v])=>k==='user_id'&&v==='own-user')))
failRead=true;assert.equal(await data.readSavedCount(client,user.id),null);assert.equal(await data.readSavedPage(client,user.id,'en',null),null);failRead=false

const actions=load('app/profile/actions.ts',{
 'next/cache':{revalidatePath:path=>invalidated.push(path)}, 'next/navigation':{redirect:url=>{throw new Error(url)}},
 '@/lib/supabase/server':{createClient:async()=>client},'@/lib/creator-profile':{publicWebsite},'@/lib/i18n/config':{getLocaleFromSearchParam},'@/lib/account-workspace':{accountHref},zod:{z},
})
async function edit(values={}) {
  write=null;const form=new FormData()
  for(const [k,v]of Object.entries({display_name:'Alice',bio:'Builds with agents',website:'https://example.com',lang:'zh',user_id:'victim',github_verified_at:'forged',username:'renamed',...values}))form.set(k,v)
  let destination='';try{await actions.updateAccountProfile(form)}catch(e){destination=e.message}
  return destination
}
assert.match(await edit(),/settings&lang=zh&saved=1/)
assert.equal(write.id,'own-user')
assert.deepEqual(Object.keys(write).sort(),['bio','display_name','id','updated_at','website'])
assert.ok(invalidated.includes('/profile')&&invalidated.includes('/creator')&&invalidated.includes('/creators/alice/opengraph-image'))
for(const values of [{website:'javascript:alert(1)'},{display_name:'x'.repeat(81)},{bio:'x'.repeat(501)}]){await edit(values);assert.equal(write,null)}
profileFailure=true;await edit();assert.equal(write,null);profileFailure=false
user=null;assert.match(await edit(),/auth\/login/);assert.equal(write,null)
user={id:'anonymous',is_anonymous:true};await edit();assert.equal(write,null)

// Points API never shares private data in CDN caches and never sums its recent-page slice.
user={id:'own-user'}
const api=load('app/api/points/route.ts',{
 'next/server':{NextResponse:{json:(body,init)=>({body,...init})}}, '@/lib/supabase/server':{createClient:async()=>client},'@/lib/account-points':points,
})
assert.equal((await api.GET()).body.total,balance)
assert.equal((await api.GET()).headers['Cache-Control'],'private, no-store')
failRead=true;assert.equal((await api.GET()).status,503);failRead=false
user=null;assert.equal((await api.GET()).status,401)
// Email confirmation works for PKCE and customized token-hash templates.
let verifiedOtp=null, failOtp=false, codeExchanged=false
const confirm=load('app/auth/confirm/route.ts',{
 'next/server':{NextResponse:{redirect:url=>({url:String(url)})}},
 '@/lib/account-workspace':{safeAccountNext},
 '@/lib/supabase/server':{createClient:async()=>({auth:{verifyOtp:async value=>{verifiedOtp=value;return {error:failOtp?Error('expired'):null}}}})},
 '../callback/route':{GET:async()=>{codeExchanged=true;return {url:'/profile'}}},
})
const confirmation=(query)=>confirm.GET({nextUrl:new URL('https://www.openagentskill.com/auth/confirm?'+query)})
let result=await confirmation('token_hash=example&type=signup&next='+encodeURIComponent('/profile?tab=bookmarks&lang=zh'))
assert.equal(result.url,'https://www.openagentskill.com/profile?tab=bookmarks&lang=zh')
assert.deepEqual(verifiedOtp,{token_hash:'example',type:'signup'})
failOtp=true;result=await confirmation('token_hash=example&type=signup&next=//evil.test');assert.equal(new URL(result.url).pathname,'/auth/login');assert.equal(new URL(result.url).searchParams.get('next'),'/profile')
verifiedOtp=null;await confirmation('token_hash=example&type=unsupported');assert.equal(verifiedOtp,null)
await confirmation('code=pkce');assert.equal(codeExchanged,true)
let githubIdentity=null, identityWriteError=null
const callback=load('app/auth/callback/route.ts',{
 'next/server':{NextResponse:{redirect:url=>({url:String(url)})}},'@/lib/account-workspace':{safeAccountNext},
 '@/lib/supabase/server':{createClient:async()=>({auth:{exchangeCodeForSession:async()=>({error:null}),getUser:async()=>({data:{user:{id:'own-user'}}})},from:()=>({upsert:async()=>({error:identityWriteError})})})},
 '@/lib/creator-ownership':{getGitHubIdentity:()=>githubIdentity},
})
result=await callback.GET({nextUrl:new URL('https://www.openagentskill.com/auth/callback?code=example&next='+encodeURIComponent('/profile?tab=settings&lang=fr'))})
assert.equal(result.url,'https://www.openagentskill.com/profile?tab=settings&lang=fr')
result=await callback.GET({nextUrl:new URL('https://www.openagentskill.com/auth/callback?code=example&next='+encodeURIComponent('/\\evil.test'))})
assert.equal(new URL(result.url).origin,'https://www.openagentskill.com')
githubIdentity={id:'123',username:'ActualGitHub'}
result=await callback.GET({nextUrl:new URL('https://www.openagentskill.com/auth/callback?code=example&next=/profile')})
assert.equal(new URL(result.url).searchParams.get('connected'),'github')
identityWriteError=Error('offline')
result=await callback.GET({nextUrl:new URL('https://www.openagentskill.com/auth/callback?code=example&next=/profile')})
assert.equal(new URL(result.url).searchParams.get('connected'),null)
assert.equal(new URL(result.url).searchParams.get('error'),'identity-update-failed')
const page=read('app/profile/page.tsx'), studio=read('app/creator/page.tsx')
assert.match(page,/index: false, follow: false/)
assert.match(page,/encodeURIComponent\(next\)/)
assert.match(page,/tab === 'points' \? supabase.from\('point_events'\)/)
assert.match(studio,/AccountWorkspaceShell/)
assert.match(studio,/needsAnalytics/)
assert.match(read('app/creator/actions.ts'),/revalidatePath\('\/profile'\)/)
const card=read('components/account-public-card.tsx')
assert.doesNotMatch(card,/user\.email|bookmarkSlugs|totalPoints/)
assert.match(card,/accountXIntent\(username, text\)/)
assert.match(read('components/nav-user-menu.tsx'),/\/profile\?tab=bookmarks/)
assert.match(read('app/auth/sign-up/page.tsx'),/\/auth\/confirm\?next=/)
console.log('Account workspace: full-ledger points, 2010 saved entries with bounded keyset pages, own-user isolation, allowlisted editing, outage states, 8 locales, safe auth returns and public-only X sharing passed.')
