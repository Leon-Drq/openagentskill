import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { CURATED_SKILL_SNAPSHOT } from '../lib/seo/curated-skill-snapshot.ts'
import { getSkillQualityProfile, getPlatformHints } from '../lib/quality.ts'
import { getSkillTrustProfile } from '../lib/trust.ts'
import { packCacheJson, unpackCacheJson } from '../lib/cache/packed-json.ts'

const shared = new Map(), policies = []
let reads = 0, qualityCalls = 0, trustCalls = 0, degraded = false
let records = CURATED_SKILL_SNAPSHOT.map(row => ({...row, description: row.description + ' updated'}))
const deps = {
  'next/cache': { unstable_cache: (fn, keys, policy) => {
    policies.push(policy)
    return async () => { if (!shared.has(keys[0])) shared.set(keys[0], await fn()); return shared.get(keys[0]) }
  } },
  '@/lib/db/skills': {
    getSkillDirectory: async () => { reads++; return {records, degraded} },
    convertSkillRecordToManifest: row => ({technical: {installCommand: row.install_command}}),
  },
  '@/lib/quality': { getPlatformHints, getSkillQualityProfile: row => {qualityCalls++; return getSkillQualityProfile(row)} },
  '@/lib/trust': {getSkillTrustProfile: row => {trustCalls++; return getSkillTrustProfile(row)}},
  '@/lib/seo/curated-skill-snapshot': {CURATED_SKILL_SNAPSHOT},
  '@/lib/cache/packed-json': {packCacheJson, unpackCacheJson},
}
const mod = {}
new Function('exports','require',ts.transpileModule(readFileSync('lib/skills/alternatives.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText)(mod,name=>{assert.ok(name in deps,name);return deps[name]})

const originalRanking = target => records.filter(row=>row.slug!==target.slug).map(skill=>{
  const tags=new Set((target.tags||[]).map(tag=>tag.toLowerCase()))
  const frameworks=new Set((target.frameworks||[]).map(value=>value.toLowerCase()))
  let score=skill.category===target.category?28:0
  score+=(skill.tags||[]).filter(tag=>tags.has(tag.toLowerCase())).length*8
  score+=(skill.frameworks||[]).filter(value=>frameworks.has(value.toLowerCase())).length*6
  score+=Math.min(18,Math.log10(Math.max(1,skill.github_stars||1))*4)
  score+=getSkillQualityProfile(skill).score/5
  score+=getSkillTrustProfile(skill).score/6
  if(skill.install_command||skill.github_repo)score+=5
  if(skill.github_last_pushed_at)score+=3
  return {slug:skill.slug,score,stars:skill.github_stars}
}).filter(row=>row.score>=32).sort((a,b)=>b.score-a.score||b.stars-a.stars).slice(0,16).map(({slug,score})=>({slug,score}))
for(const target of records.slice(0,12)) {
  const candidates=await mod.getAlternativeCandidates()
  assert.deepEqual(mod.rankAlternatives(target,candidates).map(row=>({slug:row.skill.slug,score:row.score})),originalRanking(target),'Original scores and ranking must stay identical')
}
assert.equal(reads,1)
assert.equal(qualityCalls,records.length)
assert.equal(trustCalls,records.length)
const first=await mod.getAlternativeCandidates()
first[0].skill.description='caller mutation'
assert.notEqual((await mod.getAlternativeCandidates())[0].skill.description,'caller mutation')
shared.clear();degraded=true
await assert.rejects(()=>mod.getAlternativeCandidates(),/temporarily unavailable/)
assert.equal(shared.size,0)
degraded=false;records=records.map(row=>({...row,description:'Changed source'}))
assert.equal((await mod.getAlternativeCandidates())[0].skill.description,'Changed source')
assert.deepEqual(policies,[{revalidate:900,tags:['public-skill-directory']}])
console.log('Alternatives cache: identical ranking/scores, one candidate analysis across targets, invalidation and outage recovery passed.')
