import 'server-only'
import {timingSafeEqual} from 'node:crypto'
import type {ReadDatabase} from './cloudflare-read'
import schema from './cloudflare-schema.json'
import {encodeD1Value,decodeD1Row} from './cloudflare-values'
import {retryIdempotentD1} from './cloudflare-reliability'

export const secretBackgroundRPCs=new Set(['record_indexer_run','list_indexer_runs','update_skill_github_metadata','upsert_indexed_skill','record_skill_source_version'])
export function validIndexerSecret(value:unknown) {
 const expected=process.env.INDEXER_SECRET
 if(!expected||typeof value!=='string'||value.length>1024)return false
 const supplied=Buffer.from(value),actual=Buffer.from(expected)
 return supplied.length===actual.length&&timingSafeEqual(supplied,actual)
}
const now="(strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z')"
const clamp=(value:unknown,fallback:number,min:number,max:number)=>{
 if(value==null)return fallback
 if(typeof value!=='number'||!Number.isInteger(value))throw new Error('invalid_integer')
 return Math.max(min,Math.min(max,value))
}
const publicSkill="(ai_review_approved=1 OR listing_status IN ('owner_published','static_checked'))"
const decode=(table:keyof typeof schema,row:Record<string,unknown>)=>decodeD1Row(row,schema[table])

export async function executeD1BackgroundRPC(db:ReadDatabase,name:string,args:Record<string,unknown>):Promise<{handled:boolean;data?:unknown}> {
 if(secretBackgroundRPCs.has(name)&&!validIndexerSecret(args.p_server_secret))throw new Error('invalid_indexer_secret')
 if(name==='list_indexer_runs'){
  const rows=await db.prepare('SELECT * FROM indexer_runs ORDER BY started_at DESC LIMIT ?').bind(clamp(args.p_limit,20,1,100)).all()
  return {handled:true,data:rows.results.map(r=>decode('indexer_runs',r))}
 }
 if(name==='record_indexer_run'){
  const run=args.p_run as Record<string,unknown>
  if(!run||typeof run!=='object'||Array.isArray(run))throw new Error('invalid_run')
  const keys=['mode','status','filter_mode','started_at','completed_at','target_new','min_stars','max_search_requests','search_requests','candidates_found','skipped_existing','skipped_mcp','skipped_low_relevance','imported','updated','errors','metadata'] as const
  const defaults:Record<string,unknown>={mode:'bulk',status:'completed',filter_mode:'skills-only',started_at:new Date().toISOString(),completed_at:null,metadata:{}}
  const values=keys.map(k=>encodeD1Value(run[k]==null||run[k]===''?(Object.hasOwn(defaults,k)?defaults[k]:0):run[k],schema.indexer_runs[k]))
  const rows=await db.prepare(`INSERT INTO indexer_runs(${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')}) RETURNING *`).bind(...values).all()
  return {handled:true,data:decode('indexer_runs',rows.results[0])}
 }
 if(name==='claim_skill_candidates'){
  const statuses=args.p_statuses,worker=args.p_worker_id
  if(!Array.isArray(statuses)||statuses.length>30||statuses.some(s=>typeof s!=='string'||s.length>80)||typeof worker!=='string'||worker.trim().length<8||worker.length>200)throw new Error('invalid_lease')
  // A worker ID is unique to one claim request. On an ambiguous network
  // failure, recover that request's lease instead of claiming another batch.
  const statements=[db.prepare(`UPDATE skill_candidates SET lease_owner=?,lease_expires_at=(strftime('%Y-%m-%dT%H:%M:%f','now',?)||'000Z'),
   attempt_count=attempt_count+1,updated_at=${now} WHERE id IN (SELECT id FROM skill_candidates WHERE status IN (SELECT value FROM json_each(?))
   AND next_attempt_at<=${now} AND (lease_expires_at IS NULL OR lease_expires_at<=${now}) ORDER BY github_stars DESC,discovered_at ASC LIMIT ?)
   AND NOT EXISTS(SELECT 1 FROM skill_candidates WHERE lease_owner=? AND lease_expires_at>${now})`)
   .bind(worker.trim(),`+${clamp(args.p_lease_seconds,240,60,900)} seconds`,JSON.stringify(statuses),clamp(args.p_limit,1,1,250),worker.trim()),
   db.prepare(`SELECT * FROM skill_candidates WHERE lease_owner=? AND lease_expires_at>${now} ORDER BY github_stars DESC,discovered_at ASC LIMIT ?`)
    .bind(worker.trim(),clamp(args.p_limit,1,1,250))]
  const results=await retryIdempotentD1(()=>db.batch(statements),'candidate-claim')
  return {handled:true,data:results[1].results.map(r=>decode('skill_candidates',r))}
 }
 if(name==='update_skill_github_metadata'){
  const slug=encodeD1Value(args.p_slug,'text'),stars=args.p_github_stars==null?null:encodeD1Value(args.p_github_stars,'int4')
  const forks=args.p_github_forks==null?null:encodeD1Value(args.p_github_forks,'int4'),language=args.p_github_language==null?null:encodeD1Value(args.p_github_language,'text')
  const pushed=args.p_github_last_pushed_at==null?null:encodeD1Value(args.p_github_last_pushed_at,'timestamptz')
  const result=await db.batch([db.prepare(`UPDATE skills SET github_stars=max(coalesce(?,github_stars),0),github_forks=coalesce(?,github_forks),github_language=coalesce(nullif(?,''),github_language),
   github_last_pushed_at=coalesce(?,github_last_pushed_at),last_synced_at=${now},updated_at=${now} WHERE slug=?`).bind(stars,forks,language,pushed,slug),
   db.prepare('SELECT * FROM skills WHERE slug=?').bind(slug)])
  return {handled:true,data:result[1].results[0]?{skill:decode('skills',result[1].results[0])}:{error:'skill_not_found'}}
 }
 if(name==='refresh_skill_quality_scores'){
  if(args.p_slug!=null&&typeof args.p_slug!=='string')throw new Error('invalid_slug')
  const slug=args.p_slug??null,result=await db.batch([
   db.prepare('SELECT count(*) n FROM skills WHERE ? IS NULL OR slug=?').bind(slug,slug),
   db.prepare(`UPDATE skills SET (quality_score,quality_signals)=(SELECT quality_score,quality_signals FROM d1_skill_quality WHERE id=skills.id),updated_at=${now} WHERE ? IS NULL OR slug=?`).bind(slug,slug)])
  return {handled:true,data:result[0].results[0].n}
 }
 if(name==='refresh_registry_coverage_stats'){
  const result=await db.prepare(`INSERT INTO registry_coverage_stats(id,discovered_projects,validated_skills,installable_skills,agent_proven_skills,updated_at)
   SELECT 1,(SELECT count(*) FROM (SELECT coalesce(cast(github_repository_id AS TEXT),lower(github_full_name)) identity FROM skill_candidates
    UNION SELECT lower(github_repo) identity FROM skills WHERE ${publicSkill} AND github_repo IS NOT NULL AND length(trim(github_repo))>0) WHERE identity IS NOT NULL),
   (SELECT count(*) FROM skills WHERE ${publicSkill})+(SELECT count(*) FROM skill_candidates WHERE source_content_hash IS NOT NULL AND skill_name IS NOT NULL
    AND published_skill_slug IS NULL AND status IN ('fast_track','review_required','publishing','publication_error')),
   (SELECT count(*) FROM skills WHERE ${publicSkill}),(SELECT count(*) FROM agent_outcome_stats WHERE total_outcomes>0),${now}
   WHERE 1 ON CONFLICT(id) DO UPDATE SET discovered_projects=excluded.discovered_projects,validated_skills=excluded.validated_skills,
   installable_skills=excluded.installable_skills,agent_proven_skills=excluded.agent_proven_skills,updated_at=excluded.updated_at RETURNING *`).bind().all()
  return {handled:true,data:decode('registry_coverage_stats',result.results[0])}
 }
 if(name==='get_trending_activity_candidates'){
  if(typeof args.window_end!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(args.window_end))throw new Error('invalid_window')
  const result=await db.prepare(`WITH recent AS (
   SELECT skill_slug,sum(max(0,views)) views,sum(max(0,install_copies)) install_copies,sum(max(0,compares)) compares,sum(max(0,saves)) saves,
   sum(max(0,outbound_clicks)) outbound_clicks,sum(views+install_copies+compares+saves+outbound_clicks>0) active_days,
   sum((min(30,max(0,views))+min(12,max(0,install_copies))*8+min(12,max(0,compares))*5+min(10,max(0,saves))*4+min(15,max(0,outbound_clicks))*4)
    *(0.65+(julianday(event_date)-julianday(?,'-7 days')+1)/7*0.7)) weighted_activity
   FROM skill_events_daily WHERE event_date>=date(?,'-7 days') AND event_date<? AND ?<=date('now') AND ?>=date('now','-90 days') GROUP BY skill_slug
  ), eligible AS (SELECT s.*,r.views,r.install_copies,r.compares,r.saves,r.outbound_clicks,r.active_days,
   ln(1+r.weighted_activity)*16+r.active_days*4 score FROM recent r JOIN skills s ON s.slug=r.skill_slug
   WHERE r.weighted_activity>0 AND ${publicSkill}) SELECT *,count(*) OVER() candidate_count FROM eligible ORDER BY score DESC,slug COLLATE BINARY ASC LIMIT ? OFFSET ?`)
   .bind(args.window_end,args.window_end,args.window_end,args.window_end,args.window_end,clamp(args.page_size,100,1,200),clamp(args.page_offset,0,0,20000)).all()
  return {handled:true,data:result.results.map(r=>{
   const keys=['slug','name','description','category','tags','frameworks','github_repo','github_stars','github_forks','repository','author_name','quality_score','install_command','updated_at']
   const activity=Object.fromEntries(['views','install_copies','compares','saves','outbound_clicks','active_days'].map(k=>[k,r[k]]))
   return {skill:decode('skills',Object.fromEntries(keys.map(k=>[k,r[k]]))),activity:{...activity,total_events:['views','install_copies','compares','saves','outbound_clicks'].reduce((sum,k)=>sum+Number(r[k]),0)},score:r.score,candidate_count:r.candidate_count}
  })}
 }
 return {handled:false}
}
