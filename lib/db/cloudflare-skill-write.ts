import 'server-only'
import type {ReadDatabase} from './cloudflare-read'
import schema from './cloudflare-schema.json'
import {encodeD1Value,decodeD1Row} from './cloudflare-values'
import {classifySkill,type TaxonomyInput} from '@/lib/skills/taxonomy'
import {isMcpOnlySkillRecord,type RegistryScopeRecord} from '@/lib/skills/registry-scope'

const fields:Record<string,string>=schema.skills
export const skillDerivedInputs=new Set(['name','description','long_description','tagline','source_path','category','tags','frameworks','github_repo'])
type Statement=ReturnType<ReturnType<ReadDatabase['prepare']>['bind']>
export type SkillChange={existing:Record<string,unknown>|null;id:string;slug:string;statements:Statement[]}
type Condition={where:string;params:unknown[]}

/** Computation uses the same classifier as PostgreSQL's generated taxonomy.
 * A snapshot predicate plus a CHECK assertion keeps it atomic with the write,
 * directory membership, source guard and any accompanying audit/activity rows. */
export async function prepareD1SkillChange(db:ReadDatabase,input:Record<string,unknown>,mode:'insert'|'upsert'|'update',key:'id'|'slug'='slug',value?:unknown,condition?:Condition,derive?:(existing:Record<string,unknown>|null)=>Record<string,unknown>):Promise<SkillChange> {
 if(!input||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(fields,k)))throw new Error('invalid_skill_fields')
 if(mode!=='update'&&key==='id'&&input.id==null)input={...input,id:crypto.randomUUID()}
 for(const [k,v]of Object.entries(input))encodeD1Value(v,fields[k])
 const match=value??input[key]
 if(typeof match!=='string'||!match.length)throw new Error('missing_skill_identity')
 const raw=(await db.prepare(`SELECT * FROM skills WHERE "${key}"=?`).bind(match).all()).results[0]??null
 if(mode==='update'&&!raw)throw new Error('skill_write_conflict')
 const existing=raw?decodeD1Row(raw,fields):null
 if(derive){
  input={...input,...derive(existing)}
  if(Object.keys(input).some(k=>!Object.hasOwn(fields,k)))throw new Error('invalid_skill_fields')
  for(const [k,v]of Object.entries(input))encodeD1Value(v,fields[k])
 }
 if(raw&&input.id!=null&&input.id!==raw.id)throw new Error('immutable_skill_id')
 const full={...(existing||{}),...input}
 const score=full.ai_review_score as Record<string,unknown>|undefined
 const patch={...input}
 if(score?.method==='static'&&score.policy_version==='risk-first-v1'&&score.decision==='approved'){
  full.ai_review_approved=false;full.listing_status='static_checked';patch.ai_review_approved=false;patch.listing_status='static_checked'
 }
 Object.assign(patch,classifySkill(full as TaxonomyInput))
 if(!raw){patch.id??=crypto.randomUUID();full.id=patch.id}
 const id=String(full.id),slug=String(full.slug)
 patch.updated_at=new Date().toISOString()
 const columns=Object.keys(patch),values=columns.map(k=>encodeD1Value(patch[k],fields[k]))
 // Comparing all columns prevents lost updates and delete/reinsert races. JSON
 // values here are raw storage scalars, so integer/real equivalence is retained.
 const predicate=raw?`NOT EXISTS(SELECT 1 FROM json_each(?) snapshot WHERE snapshot.value IS NOT CASE snapshot.key ${Object.keys(fields).map(k=>`WHEN '${k}' THEN skills."${k}"`).join(' ')} END)`:'0'
 const expected=raw?[JSON.stringify(raw)]:[]
 const statements:Statement[]=[]
 if(mode==='update'){
  if('id'in patch&&patch.id!==raw?.id)throw new Error('immutable_skill_id')
  const keys=columns.filter(k=>k!=='id')
  statements.push(db.prepare(`UPDATE skills SET ${keys.map(k=>`"${k}"=?`).join(',')} WHERE "${key}"=? AND ${predicate}${condition?` AND id IN (SELECT t.id FROM skills t WHERE ${condition.where})`:''}`)
   .bind(...keys.map(k=>encodeD1Value(patch[k],fields[k])),match,...expected,...(condition?.params||[])))
 }else{
  const updates=columns.filter(k=>k!=='id'&&k!==key)
  statements.push(db.prepare(`INSERT INTO skills(${columns.map(k=>`"${k}"`).join(',')}) VALUES (${columns.map(()=>'?').join(',')})
   ${mode==='upsert'?`ON CONFLICT("${key}") DO UPDATE SET ${updates.map(k=>`"${k}"=excluded."${k}"`).join(',')} WHERE ${predicate}`:''}`)
   .bind(...values,...(mode==='upsert'?expected:[])))
 }
 const assertion=crypto.randomUUID()
 statements.push(db.prepare('INSERT INTO d1_write_guards(id,valid) VALUES (?,CASE WHEN changes()=1 THEN 1 ELSE 0 END)').bind(assertion))
 statements.push(db.prepare('DELETE FROM directory_skill_ids WHERE id=?').bind(id))
 if(!isMcpOnlySkillRecord(full as RegistryScopeRecord))statements.push(db.prepare('INSERT INTO directory_skill_ids(id) SELECT id FROM skills WHERE id=?').bind(id))
 statements.push(db.prepare('DELETE FROM d1_write_guards WHERE id=?').bind(assertion))
 return {existing,id,slug,statements}
}

export const isD1WriteConflict=(error:unknown)=>error instanceof Error&&/CHECK constraint failed: valid=1|skill_write_conflict/.test(error.message)

export async function executeD1SkillChanges(db:ReadDatabase,inputs:Record<string,unknown>[],mode:'insert'|'upsert'|'update',key:'id'|'slug'='slug',ignoreDuplicates=false,condition?:Condition) {
 if(!inputs.length||inputs.length>50)throw new Error('skill_batch_limit')
 for(let attempt=0;attempt<3;attempt++){
  try{
   const changes=[]
   for(const input of inputs){
    const change=await prepareD1SkillChange(db,input,mode,key,undefined,condition)
    if(ignoreDuplicates&&change.existing)change.statements=[]
    changes.push(change)
   }
   const ids=changes.map(c=>c.id)
   const result=await db.batch([...changes.flatMap(c=>c.statements),db.prepare('SELECT * FROM skills WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids))])
   return result.at(-1)!.results.map(r=>decodeD1Row(r,fields))
  }catch(e){if(attempt===2||!isD1WriteConflict(e))throw e}
 }
 throw new Error('skill_write_conflict')
}
