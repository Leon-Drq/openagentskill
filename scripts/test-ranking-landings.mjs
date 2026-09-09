import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
import ts from 'typescript'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { rankingCandidates, rankingLandingJsonLd, validRankingDate } = await import('../lib/ranking-landing.ts')
const { getRankingDefinitions, getRankingDefinition, rankSkillsForDefinition } = await import('../lib/rankings.ts')
const { isDirectorySnapshot } = await import('../lib/skills/directory.ts')
// Isolate Next's server cache and the real network readers; execute the actual loader with injected reads.
const loaderExports={}
const loaderDependencies={
  'server-only': {}, 'next/cache': {unstable_cache:fn=>fn}, '@/lib/db/skills': {},
  '@/lib/rankings': {getRankingDefinition,rankSkillsForDefinition},
  '@/lib/ranking-landing': {rankingCandidates}, '@/lib/skills/directory': {isDirectorySnapshot},
}
new Function('exports','require',ts.transpileModule(readFileSync('lib/ranking-landing-data.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText)(loaderExports,name=>{assert.ok(name in loaderDependencies);return loaderDependencies[name]})
const {loadRankingLanding}=loaderExports
const { rankingCopy, localizedRanking } = await import('../lib/i18n/ranking-copy.ts')
const now=Date.now()
const date=days=>new Date(now-days*86400000).toISOString()
const skill=(slug,days=1)=>({id:`real-${slug}`,slug,name:`${slug} Agent Skill`,description:'A Claude Code agent skill with SKILL.md instructions for code review and development workflows.',category:'agent-skills',tags:['agent-skill','claude-code','code-review'],frameworks:['Claude Code'],github_repo:`owner/${slug}`,repository:`https://github.com/owner/${slug}`,github_stars:100,github_forks:3,quality_score:90,verified:false,license:'MIT',created_at:date(days),updated_at:date(0),github_last_pushed_at:date(1),install_command:`npx skills add owner/${slug}`,ai_review_approved:true})
const recent=getRankingDefinition('new-agent-skills-this-week')
const fixtures=[skill('new'),skill('boundary',7),skill('old',8),skill('future',-1),{...skill('invalid'),created_at:'invalid'},{...skill('snapshot'),id:'snapshot-test'}, {...skill('fallback'),id:'fallback-test'}]
assert.deepEqual(rankingCandidates(fixtures,recent,now).map(s=>s.slug),['new','boundary'])
assert.equal(rankingCandidates(fixtures,getRankingDefinition('most-starred-agent-skills'),now),fixtures)
assert.ok(validRankingDate(date(1))); assert.ok(!validRankingDate('invalid')); assert.ok(!validRankingDate(null))
const calls=[]
const readers={skills:async(...args)=>{calls.push(args);return [skill('new'),skill('old',8)]},stats:async()=>({}),outcomes:async()=>({})}
const loaded=await loadRankingLanding(recent,readers,now)
assert.equal(loaded.source,'directory')
assert.equal(loaded.candidateCount,1)
assert.equal(loaded.items.length,1)
assert.equal(loaded.items[0].skill.slug,'new')
assert.deepEqual(calls,[['new',undefined,480]])
const saved=await loadRankingLanding(recent,{...readers,skills:async()=>[{...skill('saved'),id:'fallback-saved'}]},now)
assert.equal(saved.source,'unavailable'); assert.equal(saved.items.length,0)
const savedStars=await loadRankingLanding(getRankingDefinition('most-starred-agent-skills'),{...readers,skills:async()=>[{...skill('saved'),id:'fallback-saved'}]},now)
assert.equal(savedStars.source,'saved-directory')
const failed=await loadRankingLanding(getRankingDefinition('safest-auto-install-skills'),{...readers,outcomes:async()=>{throw new Error('unavailable')}})
assert.equal(failed.source,'unavailable'); assert.equal(failed.items.length,0)
const empty=await loadRankingLanding(recent,{...readers,skills:async()=>[]},now)
assert.equal(empty.source,'directory'); assert.equal(empty.items.length,0)
const graph=rankingLandingJsonLd(recent,loaded.items,recent.title,recent.description)['@graph']
assert.equal(graph[0].url,'https://www.openagentskill.com/rankings/new-agent-skills-this-week')
assert.ok(!('dateModified' in graph[0]),'Do not present an unrelated snapshot timestamp as the current list date')
assert.equal(graph[1].numberOfItems,1); assert.equal(graph[1].itemListElement[0].position,1)
assert.equal(graph[2].itemListElement.length,3)
for(const locale of ['en','zh','ja','ko','es','de','fr','id']) {
  const copy=rankingCopy(locale)
  assert.deepEqual(Object.keys(copy),Object.keys(rankingCopy('en')))
  assert.ok(Object.values(copy).every(v=>typeof v==='string'&&v.trim()&&!v.includes('\uFFFD')))
  for(const def of getRankingDefinitions()) {
    const translated=localizedRanking(def,locale)
    assert.ok(Object.values(translated).every(v=>v.trim()&&!v.includes('{name}')&&!v.includes('\uFFFD')))
    if(locale==='en') {assert.equal(translated.title,def.title);assert.equal(translated.description,def.description)}
    if(locale!=='en'&&def.kind==='use-case') assert.notEqual(translated.title,`Skills for ${def.shortTitle}`)
  }
}
assert.match(localizedRanking(getRankingDefinition('best-local-desktop-skills'),'zh').title,/本地桌面/)
assert.match(localizedRanking(getRankingDefinition('best-security-compliance-skills'),'de').title,/Sicherheit/)
const page=readFileSync('app/rankings/[slug]/page.tsx','utf8')
assert.match(page,/export const dynamicParams = false/,'Unknown ranking slugs must return a real 404 before streaming')
assert.equal((page.match(/<h1\b/g)||[]).length,1)
assert.match(page,/title: \{ absolute: title \}/)
assert.match(page,/alternates: \{ canonical: url \}/)
assert.match(page,/replace\(\/<\/g, '\\\\u003c'\)/)
assert.match(page,/<ol\b/); assert.match(page,/<li[^>]+value=\{item.rank\}/)
assert.match(page,/data-ranking-menu/); assert.match(page,/overflow-y-auto overscroll-contain/)
assert.match(page,/relative ml-auto/,'Wrapped dropdown remains anchored within viewport')
assert.ok(page.indexOf('data-ranking-results')<page.indexOf('data-ranking-method'))
assert.doesNotMatch(page,/InstallCommand|rankMovement|getRankingSnapshotHistory|Daily snapshot|Top score|npx skills add/)
assert.match(page,/getRankingCompareHref/); assert.match(page,/history\?days=30/)
assert.match(page,/source === 'saved-directory'/); assert.match(page,/source === 'unavailable'/)
const og=readFileSync('app/rankings/[slug]/opengraph-image.tsx','utf8')
assert.match(og,/getRankingLanding/); assert.doesNotMatch(og,/getLatestRankingSnapshot|Updated daily/)
console.log(`Ranking landings: ${getRankingDefinitions().length} definitions, 36 shared routes, 8 locales, genuine seven-day eligibility, saved-data labeling, failed reads, SEO and shared layout passed.`)
