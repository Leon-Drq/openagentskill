import 'server-only'
import type {ReadDatabase} from './cloudflare-read'
import {isDownloadAgentUsage} from './cloudflare-feedback'

/** Private service RPC: the HTTP route checks the signed resolve receipt first. */
export async function recordD1Outcome(db:ReadDatabase,args:Record<string,unknown>) {
 const {p_skill_slug:slug,p_outcome:outcome='success',p_time_to_useful_ms:latency=null,p_notes:notes=null,p_metadata:metadata={}}=args
 if(!['success','failed','not_relevant','blocked_by_risk','setup_required'].includes(String(outcome)))return {error:'invalid_outcome'}
 if(typeof slug!=='string'||slug.length>200||!metadata||typeof metadata!=='object'||Array.isArray(metadata)||JSON.stringify(metadata).length>24000
  ||(latency!==null&&(typeof latency!=='number'||!Number.isInteger(latency)||latency<0||latency>2147483647))
  ||(notes!==null&&typeof notes!=='string'))throw new Error('invalid_outcome')
 for(const key of ['p_event_id','p_agent','p_task'])if(args[key]!=null&&typeof args[key]!=='string')throw new Error('invalid_outcome')
 for(const key of ['p_install_used','p_risk_blocked','p_setup_required'])if(args[key]!=null&&typeof args[key]!=='boolean')throw new Error('invalid_outcome')
 const event=(String(args.p_event_id??'').trim()||'manual').slice(0,200),agent=(String(args.p_agent??'').trim()||'auto').slice(0,120)
 const task=(String(args.p_task??'').trim()||'Unspecified task').slice(0,2000),install=args.p_install_used===true
 const risk=args.p_risk_blocked??outcome==='blocked_by_risk',setup=args.p_setup_required??outcome==='setup_required',success=outcome==='success'
 const meta={...metadata,source:'agent_outcome',resolve_event_id:event,outcome,install_used:install,risk_blocked:risk,setup_required:setup}
 const exists="EXISTS(SELECT 1 FROM skills s WHERE s.slug=? AND s.ai_review_approved=1)"
 const statements=[db.prepare(`INSERT INTO agent_outcomes(id,event_id,skill_slug,task,agent,outcome,install_used,risk_blocked,setup_required,time_to_useful_ms,notes,metadata)
  SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE ${exists} ON CONFLICT(event_id) DO UPDATE SET skill_slug=excluded.skill_slug,task=excluded.task,agent=excluded.agent,
  outcome=excluded.outcome,install_used=excluded.install_used,risk_blocked=excluded.risk_blocked,setup_required=excluded.setup_required,
  time_to_useful_ms=excluded.time_to_useful_ms,notes=excluded.notes,metadata=excluded.metadata RETURNING id`)
  .bind(crypto.randomUUID(),event,slug,task,agent,outcome,Number(install),Number(risk),Number(setup),latency,notes?.slice(0,3000)??null,JSON.stringify(meta),slug),
 db.prepare(`DELETE FROM skill_feedback WHERE json_extract(metadata,'$.source')='agent_outcome' AND json_extract(metadata,'$.resolve_event_id')=? AND ${exists}`).bind(event,slug),
 db.prepare(`INSERT INTO skill_feedback(skill_slug,agent_id,success,latency_ms,error_message,metadata)
  SELECT skill_slug,agent,?,?,?,json_set(?,'$.agent_outcome_id',id) FROM agent_outcomes WHERE event_id=? AND skill_slug=? AND ${exists}`)
  .bind(Number(success),latency,success?null:notes?.slice(0,2000)??null,JSON.stringify({...metadata,source:'agent_outcome',resolve_event_id:event,outcome}),event,slug,slug)]
 if(['success','failed'].includes(String(outcome))&&!risk&&!setup&&isDownloadAgentUsage(agent,event,metadata as Record<string,unknown>))statements.push(
  db.prepare(`INSERT INTO skill_download_receipts(skill_slug,artifact_kind,source_event_key,created_at)
   SELECT skill_slug,'agent-use','outcome:'||id,created_at FROM agent_outcomes WHERE event_id=? AND skill_slug=? AND ${exists} ON CONFLICT(source_event_key) DO NOTHING`).bind(event,slug,slug))
 const results=await db.batch(statements),id=results[0].results[0]?.id
 return id?{id,event_id:event,skill_slug:slug,agent,outcome,success,install_used:install,risk_blocked:risk,setup_required:setup}:{error:'skill_not_found'}
}
