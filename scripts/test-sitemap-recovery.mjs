import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import * as packed from '../lib/cache/packed-json.ts'
import * as coalesced from '../lib/cache/coalesced.ts'
import * as policy from '../lib/seo/search-indexability.ts'
import * as validation from '../lib/seo/sitemap-snapshot.ts'
import * as pagination from '../lib/skills/pagination.ts'
const compile = (path,deps) => {
  const output=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const exports={};new Function('exports','require',output)(exports,name=>{assert.ok(name in deps,name);return deps[name]});return exports
}
const snapshot={version:1,policy:policy.buildSearchIndexFilter(),generatedAt:'2026-10-02T00:00:00.000Z',count:2001,entries:Array.from({length:2001},(_,i)=>({url:`https://www.openagentskill.com/skills/test-${i}`,lastModified:'2026-01-01T00:00:00.000Z',changeFrequency:'weekly',priority:0.76}))}
const validate=value=>validation.validateSkillSitemapSnapshot(value,snapshot.policy)
assert.equal(validate(snapshot),snapshot)
for(const value of [{...snapshot,count:2002},{...snapshot,policy:'old policy'},{...snapshot,entries:[snapshot.entries[0],...snapshot.entries.slice(0,2000)]},{...snapshot,entries:[{...snapshot.entries[0],url:'https://evil.test/'},...snapshot.entries.slice(1)]}]) assert.throws(()=>validate(value))
const backup=await packed.packCacheJson(snapshot)
function manager(mode,saved={packed:backup}) {
  let writes=0,reads=0
  const result=compile('lib/seo/skill-sitemap-data.ts',{
    'next/cache':{unstable_cache:fn=>async()=>{const value=await fn();writes++;return value}},
    '@/lib/db/skills':{
      getApprovedSkillSitemapCount:async()=>mode==='changed'?2002:2001,
      getApprovedSkillSitemapSource:async()=>{if(mode==='outage')throw new Error('database timeout');return {count:2001,read:async(offset,limit)=>{reads++;if(mode==='partial'&&offset===1000)throw new Error('database timeout');return snapshot.entries.slice(offset,offset+limit-(mode==='truncated'?1:0)).map(entry=>({slug:entry.url.split('/').at(-1),created_at:entry.lastModified,github_stars:10}))}}},
    },
    '@/lib/seo/search-indexability':policy,'@/lib/seo/sitemap-snapshot':validation,
    '@/lib/cache/packed-json':packed,'@/lib/cache/coalesced':coalesced,'./sitemap-backup.json':{default:saved},
  })
  return {read:result.getSkillSitemapSnapshot,stats:()=>({writes,reads})}
}
for(const mode of ['outage','partial','changed','truncated']) {
  const m=manager(mode)
  assert.deepEqual(await m.read(),snapshot,`${mode}: serve the complete historical backup`)
  assert.equal(m.stats().writes,0,'Failure or incomplete capture cannot become a persisted cache value')
}
await assert.rejects(manager('outage',{packed:null}).read(),/database timeout/)
await assert.rejects(manager('outage',{packed:'bad'}).read())
const healthy=manager('healthy');const [a,b]=await Promise.all([healthy.read(),healthy.read()])
assert.equal(a.count,2001);assert.deepEqual(a,b);assert.equal(healthy.stats().reads,3,'Concurrent snapshots share one complete source capture');assert.equal(healthy.stats().writes,2)
assert.deepEqual(a.entries,snapshot.entries)

// Exercise the real partition queries, including overlap and a shard boundary.
const editorial=JSON.parse(readFileSync(new URL('../lib/seo/editorial-index.json',import.meta.url),'utf8'))
const item=(slug,extra={})=>({slug,quality_score:80,github_stars:20,ai_review_approved:true,...extra})
const pinned=e=>item(e.slug,{ai_review_approved:false,quality_score:0,github_stars:0,github_repo:e.repository,source_path:e.path,source_commit_sha:e.commit,source_content_hash:e.hash,license:e.license,source_sync_status:'current',listing_status:'owner_published'})
const overlap={...pinned(editorial[0]),ai_review_approved:true,quality_score:80,github_stars:20}
const extra=pinned(editorial[0]);let legacy=[item('legacy-a'),item('legacy-b'),overlap], editorialRows=[overlap]
const operations=[]
const client={from(){let filter,head=false,range;const q={select(_s,opts){head=opts?.head;return q},or(f){filter=f;operations.push(f);return q},order(){return q},range(a,b){range=[a,b];return q},then(resolve){const rows=filter===policy.buildEditorialSearchIndexFilter()?editorialRows:legacy;return Promise.resolve({data:head?null:range?rows.slice(range[0],range[1]+1):rows,count:rows.length,error:null}).then(resolve)}};return q}}
const dbDependencies=Object.fromEntries([
  ['next/cache',{unstable_cache:fn=>fn}],['@/lib/supabase/public',{createPublicClient:()=>client}],['@/lib/supabase/admin',{createAdminClient:()=>client}],['@/lib/seo/search-indexability',policy],['@/lib/cache/coalesced',coalesced],['@/lib/skills/pagination',pagination],
  ...['@/lib/skills/taxonomy','@/lib/skills/publication','@/lib/async','@/lib/search-results','@/lib/skills/directory','@/lib/skills/presentation-category','@/lib/skills/catalog-query','@/lib/skills/commerce','@/lib/skills/registry-scope','@/lib/seo/curated-skill-snapshot','@/lib/search-query','@/lib/cache/packed-json'].map(name=>[name,{}]),
])
const db=compile('lib/db/skills.ts',dbDependencies)
assert.equal(await db.getApprovedSkillSitemapCount(3,50),3,'An eligible canonical listing is counted once')
assert.deepEqual((await db.getApprovedSkillSitemapRecords({offset:2,limit:2,minStars:3,minQualityScore:50})).map(x=>x.slug),[overlap.slug])
legacy=legacy.slice(0,2);editorialRows=[extra]
assert.equal(await db.getApprovedSkillSitemapCount(3,50),3,'The source-pinned lane remains eligible without legacy approval')
assert.deepEqual((await db.getApprovedSkillSitemapRecords({offset:1,limit:2,minStars:3,minQualityScore:50})).map(x=>x.slug),['legacy-b',extra.slug])
assert.deepEqual((await db.getApprovedSkillSitemapRecords({offset:2,limit:2,minStars:3,minQualityScore:50})).map(x=>x.slug),[extra.slug])
assert.ok(operations.every(f=>[policy.buildLegacySearchIndexFilter(),policy.buildEditorialSearchIndexFilter()].includes(f)),'No broad cross-lane OR read')
console.log('Sitemap recovery passed: complete generations, cold-cache backup, outage/partial/change rejection, coalescing, unchanged policy, partition overlap and boundaries.')

const cachedDb=compile('lib/db/skills.ts',{...dbDependencies,'next/cache':{unstable_cache:fn=>{const cache=new Map();return async(...args)=>{const key=JSON.stringify(args);if(cache.has(key))return cache.get(key);const value=await fn(...args);cache.set(key,value);return value}}}})
legacy=[item('legacy-a'),item('legacy-b'),overlap];editorialRows=[overlap]
await cachedDb.getApprovedSkillSitemapCount(3,50)
await cachedDb.getApprovedSkillSitemapRecords({offset:2,limit:2,minStars:3,minQualityScore:50})
legacy=legacy.slice(0,2);editorialRows=[extra]
const freshSource=await cachedDb.getApprovedSkillSitemapSource(3,50)
assert.equal(freshSource.count,3)
assert.deepEqual((await freshSource.read(1,2)).map(x=>x.slug),['legacy-b',extra.slug],'A new capture must use fresh partition boundaries even when prior counts and shards remain cached')
assert.equal(await cachedDb.getApprovedSkillSitemapCount(3,50,true),3)
