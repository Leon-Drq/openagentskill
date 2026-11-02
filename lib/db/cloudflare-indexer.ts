import 'server-only'
import type {ReadDatabase} from './cloudflare-read'
import {prepareD1SkillChange,isD1WriteConflict} from './cloudflare-skill-write'
import {validIndexerSecret} from './cloudflare-background'
import {decodeD1Row,encodeD1Value} from './cloudflare-values'
import schema from './cloudflare-schema.json'

const sourceFields=['slug','name','description','long_description','tagline','author_name','author_url','repository','github_repo','github_stars','github_forks',
 'github_language','github_last_pushed_at','category','tags','frameworks','version','license','install_command','verified','submission_source','submitted_by_agent',
 'ai_review_score','ai_review_approved','ai_review_issues','ai_review_suggestions']
const defaults:Record<string,unknown>={github_stars:0,github_forks:0,tags:[],frameworks:[],version:'1.0.0',license:'Unknown',verified:false,
 submission_source:'auto-indexer',submitted_by_agent:'open-agent-skill-indexer',ai_review_score:{},ai_review_approved:true,ai_review_issues:[],ai_review_suggestions:[]}
const jsonMerge=`(SELECT json_group_object(key,json(CASE type WHEN 'object' THEN value WHEN 'array' THEN value WHEN 'null' THEN 'null' WHEN 'true' THEN 'true' WHEN 'false' THEN 'false' ELSE json_quote(value) END))
 FROM (SELECT e.* FROM json_each(skill_versions.metadata) e WHERE e.key NOT IN(SELECT key FROM json_each(excluded.metadata)) UNION ALL SELECT e.* FROM json_each(excluded.metadata) e))`

export async function executeD1IndexerRPC(db:ReadDatabase,name:string,args:Record<string,unknown>):Promise<{handled:boolean;data?:unknown}> {
 if(!['upsert_indexed_skill','record_skill_source_version'].includes(name))return {handled:false}
 if(!validIndexerSecret(args.p_server_secret))throw new Error('invalid_indexer_secret')
 for(let attempt=0;attempt<3;attempt++){
  try{
   if(name==='upsert_indexed_skill'){
    const source=args.p_skill as Record<string,unknown>,activity=args.p_activity as Record<string,unknown>|undefined
    if(!source||typeof source!=='object'||Array.isArray(source)||source.slug==null)throw new Error('invalid_skill')
    const input=Object.fromEntries(sourceFields.map(k=>[k,source[k]??(Object.hasOwn(defaults,k)?defaults[k]:null)]))
    for(const key of ['github_language','github_last_pushed_at'])if(input[key]==='')input[key]=null
    input.last_synced_at=new Date().toISOString()
    const change=await prepareD1SkillChange(db,input,'upsert','slug'),statements=[...change.statements]
    if(activity!=null&&!change.existing){
     if(typeof activity!=='object'||Array.isArray(activity))throw new Error('invalid_activity')
     const keys=['event_type','skill_id','actor_name','actor_type','description','metadata'] as const
     const row={event_type:activity.event_type??'skill_published',skill_id:change.id,actor_name:activity.actor_name??'Open Agent Skill Indexer',
      actor_type:activity.actor_type??'agent',description:activity.description??null,metadata:activity.metadata??{}}
     statements.push(db.prepare(`INSERT INTO activity_feed(${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...keys.map(k=>encodeD1Value(row[k],schema.activity_feed[k]))))
    }
    statements.push(db.prepare('SELECT * FROM skills WHERE id=?').bind(change.id))
    const result=await db.batch(statements)
    return {handled:true,data:{skill:decodeD1Row(result.at(-1)!.results[0],schema.skills),created:!change.existing}}
   }
   const hash=args.p_source_content_hash,slug=args.p_skill_slug,metadata=args.p_metadata??{}
   if(typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash)||typeof slug!=='string'||!metadata||typeof metadata!=='object'||Array.isArray(metadata))throw new Error('invalid_source_version')
   const text=(key:string)=>args[key]==null?'':String(encodeD1Value(args[key],'text'))
   const license=text('p_license'),licenseStatus=!license.trim()||['unknown','noassertion','other'].includes(license.trim().toLowerCase())?'missing':/non[- ]?commercial|cc-by-nc/i.test(license)?'restricted':'detected'
   const licenseSource=['skill_frontmatter','github_repository','manual'].includes(text('p_license_source'))?text('p_license_source'):'unknown'
   const change=await prepareD1SkillChange(db,{slug},'update','slug',undefined,undefined,existing=>{
    if(!existing)throw new Error('skill_not_found')
    return {source_commit_sha:text('p_source_commit_sha')||null,source_content_hash:hash,
     source_sync_status:existing.source_content_hash!=null&&existing.source_content_hash!==hash?'changed':'current',
     source_ref:text('p_source_ref')||existing.source_ref,source_path:text('p_source_path')||existing.source_path,
     license_source:licenseSource,license_status:licenseStatus,last_synced_at:new Date().toISOString()}
   })
   await db.batch([...change.statements,db.prepare(`INSERT INTO skill_versions(skill_slug,version,source_commit_sha,source_content_hash,source_ref,source_path,license,license_source,metadata)
    VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(skill_slug,source_content_hash) DO UPDATE SET source_commit_sha=excluded.source_commit_sha,
    version=excluded.version,license=excluded.license,license_source=excluded.license_source,metadata=${jsonMerge}`)
    .bind(slug,text('p_version')||'Unknown',text('p_source_commit_sha')||null,hash,text('p_source_ref')||null,text('p_source_path')||null,license||'Unknown',licenseSource,JSON.stringify(metadata))])
   return {handled:true,data:{changed:change.existing!.source_content_hash!=null&&change.existing!.source_content_hash!==hash,previous_hash:change.existing!.source_content_hash,
    current_hash:hash,license_status:licenseStatus}}
  }catch(e){if(attempt===2||!isD1WriteConflict(e))throw e}
 }
 throw new Error('skill_write_conflict')
}
