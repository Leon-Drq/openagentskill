import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import {publicRow,PUBLIC_FIELDS,skillExportQuery,safeUrl} from '../lib/readonly/catalog.mjs'
import {loadSnapshot} from '../lib/readonly/snapshot.mjs'
import {filterCatalog,searchable,readState} from '../lib/readonly/search.mjs'
import {getSearchTerms} from '../lib/search-query.ts'
const catalog=await loadSnapshot(),example=catalog.skills[0]
assert.ok(catalog.skills.length>1000,'Use the full production public export, not the old small recovery sample')
assert.equal(publicRow({...example,ai_review_approved:false,listing_status:'rejected'}),null)
const owner=publicRow({...example,listing_status:'owner_published',ai_review_approved:false,author_email:'PRIVATE',author_user_id:'PRIVATE',access_token:'PRIVATE'})
assert.equal(owner.ai_review_approved,false)
assert.ok(!JSON.stringify(owner).includes('PRIVATE'))
for(const row of catalog.skills)assert.ok(Object.keys(row).every(key=>PUBLIC_FIELDS.includes(key)))
assert.match(skillExportQuery(),/JOIN directory_skill_ids/)
assert.ok(!/author_email|author_user_id|profiles|orders|SELECT\s+\*/i.test(skillExportQuery()))
for(const bad of ['javascript:alert(1)','data:text/html,x','//evil.example','https://name:secret@example.com'])assert.equal(safeUrl(bad),null)
assert.equal(safeUrl('#examples'),'#examples')
const fixture=[{slug:'deck-maker',name:'Deck Maker',description:'x'.repeat(300),author:'maker',repository:'example/ppt-decks',category:'presentation',tags:['slides'],quality:70,stars:400,downloads:12,created:'2026-11-01',updated:'2026-11-12',price:'free',exampleCount:2},
  {slug:'design-kit',name:'Design Kit',description:'frontend design',author:'designer',repository:'example/ui',category:'design-creative',tags:['frontend'],quality:90,stars:200,downloads:9,created:'2026-11-10',updated:'2026-11-13',price:'unknown',exampleCount:0}]
for(const row of fixture)row.search=searchable(row)
assert.equal(filterCatalog(fixture,{q:'example/ppt-decks'},getSearchTerms('example/ppt-decks'))[0].slug,'deck-maker','Search includes repository text after long descriptions')
assert.equal(filterCatalog(fixture,{q:'制作演示文稿'},getSearchTerms('制作演示文稿'))[0].slug,'deck-maker')
assert.deepEqual(filterCatalog(fixture,{category:'presentation',examples:true,access:'free'}).map(row=>row.slug),['deck-maker'])
assert.equal(filterCatalog(fixture,{sort:'new'})[0].slug,'design-kit')
assert.equal(filterCatalog(fixture,{sort:'stars'})[0].slug,'deck-maker')
assert.equal(filterCatalog(fixture,{q:'does-not-exist'},['does-not-exist']).length,0)
assert.equal(readState(new URL('https://www.openagentskill.com/skills?page=NaN&q='+'a'.repeat(1000))).q.length,160)
assert.equal(readState(new URL('https://www.openagentskill.com/zh/skills/page/2')).page,2)
const config=JSON.parse(await fs.readFile('wrangler.readonly.jsonc','utf8'))
assert.deepEqual(JSON.parse(await fs.readFile('wrangler.production.jsonc','utf8')),config)
for(const key of ['d1_databases','r2_buckets','ai','send_email','services','queues'])assert.equal(config[key],undefined)
assert.deepEqual(config.triggers.crons,[]);assert.equal(config.assets.run_worker_first,false);assert.equal(config.assets.not_found_handling,'none')
assert.equal(config.limits.cpu_ms,10)
const source=await fs.readFile('cloudflare/readonly-worker.mjs','utf8'),context={Request,Response,URL}
vm.createContext(context)
vm.runInContext(source.replace(/^export \{DOQueueHandler\}.*$/m,'').replace('export function','function').replace('export default','globalThis.worker ='),context)
for(const method of ['GET','POST','PUT','PATCH','DELETE','HEAD']) {
  const response=await context.worker.fetch(new Request('https://www.openagentskill.com/api/payments/webhook',{method}))
  assert.equal(response.status,503);assert.equal(response.headers.get('Retry-After'),'3600');assert.equal(response.headers.get('Set-Cookie'),null)
  if(method==='HEAD')assert.equal(await response.text(),'')
}
const unknown=context.worker.fetch(new Request('https://www.openagentskill.com/skills/not-exported'))
assert.equal(unknown.status,503);assert.equal(unknown.headers.get('X-Robots-Tag'),null)
const redirect=context.worker.fetch(new Request('https://www.openagentskill.com/ja//evil.example'))
assert.equal(new URL(redirect.headers.get('Location')).origin,'https://www.openagentskill.com')
const build=await fs.readFile('scripts/build-cloudflare.mjs','utf8'),deploy=await fs.readFile('scripts/deploy-readonly.mjs','utf8')
assert.match(build,/build-readonly\.mjs/);assert.doesNotMatch(deploy,/opennext.*deploy/)
assert.match(deploy,/report\.sample,false/,'Never publish a sample build')
const require=createRequire(import.meta.url),esbuild=createRequire(require.resolve('wrangler'))('esbuild')
await fs.mkdir('.readonly-build',{recursive:true})
await esbuild.build({entryPoints:['scripts/readonly/render.tsx'],outfile:'.readonly-build/test-render.cjs',bundle:true,platform:'node',format:'cjs',target:'node22',loader:{'.css':'local-css'},logLevel:'silent',plugins:[{name:'server-only',setup(api){api.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'empty'}));api.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:''}))}}]})
const render=require('../.readonly-build/test-render.cjs')
render.setPublicSkills(catalog.skills)
const hostile={...example,name:'<script>alert(1)</script>',description:'<img src=x onerror=alert(1)>',long_description:'<script>alert(1)</script>\n\n[unsafe](javascript:alert(1))',install_command:'echo "<script>not executed</script>"'}
const body=render.detailBody('zh',hostile,render.browseRow(hostile))
assert.ok(!body.includes('<script>'));assert.ok(!body.includes('href="javascript:'))
assert.ok(body.includes('&lt;script&gt;not executed&lt;/script&gt;'))
const page=render.documentPage({locale:'zh',path:'/skills/'+example.slug,title:'Public skill',description:'Description',body,capturedAt:catalog.capturedAt,assets:{css:'/reader/site.css',js:'/reader/reader.js'},jsonld:{description:'</script><script>alert(1)</script>'}})
assert.match(page,new RegExp(`rel="canonical" href="https://www.openagentskill.com/zh/skills/${example.slug}"`))
assert.ok(!page.includes('</script><script>alert'))
assert.ok(!page.includes('noindex'))
assert.ok(!page.includes('next/image'))
for(const language of render.translatedPostLanguages) {
  const post=render.publicPosts(catalog).find(item=>item.slug===render.translatedPostSlugs[0])
  const meta=render.postMetadata(post,language)
  const translated=render.documentPage({locale:language==='zh'?'zh':'en',path:`/${language}/blog/${post.slug}`,title:meta.title,description:meta.description,body:'',capturedAt:catalog.capturedAt,assets:{css:'/reader/site.css',js:'/reader/reader.js'},contentLanguage:language,languageAlternates:meta.languageAlternates})
  assert.ok(translated.includes(`value="${language}" selected=""`),'Header selection must match actual article language')
  assert.ok(translated.includes(`hreflang="${language==='zh'?'zh-CN':language}"`))
}
console.log(`Read-only checks passed: ${catalog.skills.length} public records, exclusion of private/rejected data, search/filters, XSS handling, inactive APIs and deployment cost guards.`)
