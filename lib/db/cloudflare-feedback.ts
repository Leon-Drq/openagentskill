import 'server-only'
import type {ReadDatabase} from './cloudflare-read'

export function isDownloadAgentUsage(agent:unknown,event:unknown,metadata:Record<string,unknown>) {
 const test=/(^|[-_ :])(test|smoke|fixture|eval)([-_ :]|$)/i
 return ![agent,event,metadata.source].some(v=>test.test(String(v??'')))&&String(metadata.dry_run??'false')!=='true'&&String(metadata.test??'false')!=='true'
}

export async function recordD1Feedback(db:ReadDatabase,args:Record<string,unknown>) {
 const {p_skill_slug:slug,p_agent_id:agent,p_success:success,p_latency_ms:latency=null,p_error_message:message=null,p_metadata:metadata={}}=args
 if(typeof slug!=='string'||!/^[a-z0-9][a-z0-9-]{0,199}$/.test(slug)||typeof agent!=='string'||!agent.length||agent.length>200||typeof success!=='boolean'
  ||(latency!==null&&(typeof latency!=='number'||!Number.isInteger(latency)||latency<0||latency>2147483647))
  ||(message!==null&&(typeof message!=='string'||message.length>2000))||!metadata||Array.isArray(metadata)||typeof metadata!=='object'||JSON.stringify(metadata).length>16000)throw new Error('invalid_feedback')
 const id=crypto.randomUUID(),publicCondition="(ai_review_approved=1 OR listing_status IN ('owner_published','static_checked'))"
 const statements=[db.prepare(`INSERT INTO skill_feedback(id,skill_slug,agent_id,success,latency_ms,error_message,metadata)
  SELECT ?,slug,?,?,?,?,? FROM skills WHERE slug=? AND ${publicCondition} RETURNING id`).bind(id,agent,Number(success),latency,message,JSON.stringify(metadata),slug)]
 if(success){
  statements.push(db.prepare(`INSERT INTO point_events(user_id,amount,event_type,description,ref_id)
   SELECT s.author_user_id,1,'skill_called',?,s.slug FROM skills s JOIN skill_feedback f ON f.skill_slug=s.slug WHERE f.id=? AND s.author_user_id IS NOT NULL`).bind(`Skill "${slug}" called by ${agent}`,id))
  statements.push(db.prepare(`INSERT INTO activity_feed(event_type,skill_id,actor_name,actor_type,description,metadata)
   SELECT 'skill_called',s.id,?,'agent',?,json_object('latency_ms',?,'success',json('true'),'points_awarded',CASE WHEN s.author_user_id IS NULL THEN 0 ELSE 1 END)
   FROM skills s JOIN skill_feedback f ON f.skill_slug=s.slug WHERE f.id=?`).bind(agent,`Called ${slug}`,latency,id))
 }
 const meta=metadata as Record<string,unknown>
 if(!['agent_outcome','skill_detail_page','web-widget'].includes(String(meta.source??''))&&!agent.startsWith('web-user-')&&isDownloadAgentUsage(agent,null,meta)){
  statements.push(db.prepare(`INSERT INTO skill_download_receipts(skill_slug,artifact_kind,source_event_key,created_at)
   SELECT skill_slug,'agent-use',?,created_at FROM skill_feedback WHERE id=? ON CONFLICT(source_event_key) DO NOTHING`).bind(`feedback:${id}`,id))
 }
 statements.push(db.prepare('SELECT s.author_user_id FROM skills s JOIN skill_feedback f ON f.skill_slug=s.slug WHERE f.id=?').bind(id))
 const result=await db.batch(statements)
 if(!result[0].results.length)return {error:'skill_not_found'}
 return {skill_slug:slug,agent_id:agent,success,points_awarded:success&&result.at(-1)?.results[0]?.author_user_id?1:0}
}
