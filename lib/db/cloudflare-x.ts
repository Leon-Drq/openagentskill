import 'server-only'
import {createHash,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto'
import type {ReadDatabase} from './cloudflare-read'
import {validIndexerSecret} from './cloudflare-background'
import schema from './cloudflare-schema.json'
import {encodeD1Value,decodeD1Row} from './cloudflare-values'

export const xRPCs=new Set(['upsert_x_oauth_connection','get_x_oauth_connection','update_x_oauth_tokens','pick_x_post_skill','record_x_post','enqueue_x_content_queue_item','claim_x_content_queue_item','complete_x_content_queue_item','get_x_post_metric_targets','record_x_post_metric','record_x_reply_draft','claim_auto_creator_x_reply_draft','complete_auto_creator_x_reply_draft','get_creator_outreach_status'])
const now="(strftime('%Y-%m-%dT%H:%M:%f','now')||'000Z')"
const ago=(period:string)=>`(strftime('%Y-%m-%dT%H:%M:%f','now','-${period}')||'000Z')`
const record=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('invalid_object');return v as Record<string,unknown>}
const text=(v:unknown)=>v==null||v===''?null:encodeD1Value(v,'text')
const pick=(row:Record<string,unknown>,keys:string[])=>Object.fromEntries(keys.map(k=>[k,row[k]]))
const skillKeys=['id','slug','name','description','category','tags','github_repo','github_stars','quality_score','install_command']
const decoded=(table:keyof typeof schema,row:Record<string,unknown>)=>decodeD1Row(row,schema[table])
const clamp=(v:unknown,fallback:number,max:number)=>v==null?fallback:Math.max(1,Math.min(max,Number(encodeD1Value(v,'int4'))))
// PostgreSQL's jsonb || retains explicit nulls and replaces nested values.
const merge=`(SELECT json_group_object(key,json(CASE type WHEN 'object' THEN value WHEN 'array' THEN value WHEN 'null' THEN 'null' WHEN 'true' THEN 'true' WHEN 'false' THEN 'false' ELSE json_quote(value) END)) FROM
 (SELECT e.* FROM json_each(metadata) e WHERE e.key NOT IN(SELECT key FROM json_each(?)) UNION ALL SELECT e.* FROM json_each(?) e))`
const cryptoKey=()=>{if(!process.env.INDEXER_SECRET)throw new Error('missing_encryption_key');return createHash('sha256').update('openagentskill-x-oauth-v1\0'+process.env.INDEXER_SECRET).digest()}
export function sealXToken(value:unknown,field:'access'|'refresh') {
 if(typeof value!=='string'||!value.length||value.length>20000)throw new Error('invalid_oauth_token')
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',cryptoKey(),iv)
 cipher.setAAD(Buffer.from('x:'+field))
 const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()])
 return 'oas1.'+Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64')
}
export function openXToken(value:unknown,field:'access'|'refresh') {
 const serialized=typeof value==='string'?value:Buffer.from(value as Uint8Array).toString('utf8')
 if(!serialized.startsWith('oas1.'))throw new Error('legacy_oauth_cipher_requires_migration')
 const data=Buffer.from(serialized.slice(5),'base64'),cipher=createDecipheriv('aes-256-gcm',cryptoKey(),data.subarray(0,12))
 cipher.setAAD(Buffer.from('x:'+field));cipher.setAuthTag(data.subarray(12,28))
 return Buffer.concat([cipher.update(data.subarray(28)),cipher.final()]).toString('utf8')
}
async function insert(db:ReadDatabase,table:keyof typeof schema,row:Record<string,unknown>,condition='1',parameters:unknown[]=[]) {
 const columns=Object.keys(row),types=schema[table] as Record<string,string>
 if(columns.some(k=>!Object.hasOwn(types,k)))throw new Error('invalid_columns')
 const result=await db.prepare(`INSERT INTO ${table}(${columns.join(',')}) SELECT ${columns.map(()=>'?').join(',')} WHERE ${condition} RETURNING *`)
  .bind(...columns.map(k=>encodeD1Value(row[k],types[k])),...parameters).all()
 return result.results[0]?decoded(table,result.results[0]):null
}

export async function executeD1XRPC(db:ReadDatabase,name:string,a:Record<string,unknown>):Promise<{handled:boolean;data?:unknown}> {
 if(!xRPCs.has(name))return {handled:false}
 if(!validIndexerSecret(a.p_server_secret))throw new Error('invalid_indexer_secret')
 const done=(data:unknown)=>({handled:true,data})
 if(name==='upsert_x_oauth_connection'){
  const p=record(a.p_connection),expires=encodeD1Value(p.expires_at||null,'timestamptz')
  const result=await db.prepare(`INSERT INTO x_oauth_connections(provider,x_user_id,username,scope,access_token_cipher,refresh_token_cipher,expires_at)
   VALUES ('x',?,?,?,CAST(? AS BLOB),CAST(? AS BLOB),?) ON CONFLICT(provider) DO UPDATE SET x_user_id=excluded.x_user_id,username=excluded.username,scope=excluded.scope,
   access_token_cipher=excluded.access_token_cipher,refresh_token_cipher=excluded.refresh_token_cipher,expires_at=excluded.expires_at,updated_at=${now} RETURNING id,username,expires_at`)
   .bind(text(p.x_user_id),text(p.username),text(p.scope),sealXToken(p.access_token,'access'),sealXToken(p.refresh_token,'refresh'),expires).all()
  return done(result.results[0])
 }
 if(name==='get_x_oauth_connection'){
  const row=(await db.prepare("SELECT * FROM x_oauth_connections WHERE provider='x'").bind().all()).results[0]
  return done(row?{...pick(row,['x_user_id','username','scope','expires_at']),access_token:openXToken(row.access_token_cipher,'access'),refresh_token:openXToken(row.refresh_token_cipher,'refresh')}:null)
 }
 if(name==='update_x_oauth_tokens'){
  const refresh=a.p_refresh_token?sealXToken(a.p_refresh_token,'refresh'):null
  const result=await db.prepare(`UPDATE x_oauth_connections SET access_token_cipher=CAST(? AS BLOB),refresh_token_cipher=coalesce(CAST(? AS BLOB),refresh_token_cipher),
   expires_at=coalesce(?,expires_at),scope=coalesce(?,scope),updated_at=${now} WHERE provider='x' RETURNING username,expires_at`)
   .bind(sealXToken(a.p_access_token,'access'),refresh,encodeD1Value(a.p_expires_at??null,'timestamptz'),text(a.p_scope)).all()
  return done(result.results[0]??{error:'x_connection_not_found'})
 }
 if(name==='pick_x_post_skill'){
  for(let offset=0;;offset+=100){
   const rows=(await db.prepare(`SELECT s.* FROM skills s WHERE ai_review_approved=1 AND github_stars>=500 AND coalesce(quality_score,0)>0
    AND NOT EXISTS(SELECT 1 FROM x_post_history h WHERE h.skill_slug=s.slug AND h.status='posted') ORDER BY quality_score DESC,github_stars DESC,created_at DESC LIMIT 100 OFFSET ?`).bind(offset).all()).results
   for(const raw of rows){const s=decoded('skills',raw),body=['name','description','long_description','tagline','category','github_repo','tags','frameworks'].map(k=>Array.isArray(s[k])?(s[k] as unknown[]).join(' '):s[k]??'').join(' ');if(!/(^|[^a-z0-9])mcp([^a-z0-9]|$)|model context protocol/i.test(body))return done(pick(s,skillKeys))}
   if(rows.length<100)return done(null)
  }
 }
 if(name==='record_x_post'){
  const p=record(a.p_post),row=await insert(db,'x_post_history',{queue_item_id:p.queue_item_id||null,skill_id:p.skill_id||null,skill_slug:p.skill_slug??null,x_post_id:text(p.x_post_id),post_text:p.post_text??null,status:p.status||'posted',error:text(p.error),posted_at:p.posted_at||null,metadata:p.metadata??{}})
  return done(pick(row!,['id','queue_item_id','skill_slug','x_post_id','status']))
 }
 if(name==='enqueue_x_content_queue_item'){
  const p=record(a.p_item),slug=text(p.skill_slug),content=p.content_type||'skill_pick'
  if(!slug||!text(p.post_text))throw new Error('invalid_queue_item')
  let row:Record<string,unknown>|null=null
  try{row=await insert(db,'x_content_queue',{skill_id:p.skill_id||null,skill_slug:slug,content_type:content,campaign:p.campaign||'daily_skill',status:p.status||'queued',priority:p.priority??0,scheduled_for:p.scheduled_for||new Date().toISOString(),post_text:p.post_text,reply_text:text(p.reply_text),source:p.source||'auto',metadata:p.metadata??{}},
   "NOT EXISTS(SELECT 1 FROM x_post_history WHERE skill_slug=? AND status='posted') AND NOT EXISTS(SELECT 1 FROM x_content_queue WHERE skill_slug=? AND content_type=? AND status IN ('queued','posting'))",[slug,slug,content])}
  catch(e){if(!(e instanceof Error&&/UNIQUE constraint failed/.test(e.message)))throw e}
  if(row)return done({status:'queued',...pick(row,['id','skill_slug','scheduled_for'])})
  const posted=(await db.prepare("SELECT 1 FROM x_post_history WHERE skill_slug=? AND status='posted' LIMIT 1").bind(slug).all()).results.length>0
  return done({status:'skipped',reason:posted?'duplicate_posted':'duplicate_active',skill_slug:slug})
 }
 if(name==='claim_x_content_queue_item'){
  const results=await db.batch([
   db.prepare(`UPDATE x_content_queue SET status='skipped',error=coalesce(error,'Skipped: skill already posted to X'),locked_at=NULL,
    metadata=json_set(metadata,'$.skipped_by','claim_x_content_queue_item','$.skip_reason','already_posted'),updated_at=${now}
    WHERE status IN ('queued','posting') AND EXISTS(SELECT 1 FROM x_post_history h WHERE h.skill_slug=x_content_queue.skill_slug AND h.status='posted')`).bind(),
   db.prepare(`UPDATE x_content_queue SET status='posting',locked_at=${now},attempts=attempts+1,updated_at=${now} WHERE id=(SELECT q.id FROM x_content_queue q
    WHERE status='queued' AND scheduled_for<=${now} AND attempts<3 AND NOT EXISTS(SELECT 1 FROM x_post_history h WHERE h.skill_slug=q.skill_slug AND h.status='posted')
    ORDER BY priority DESC,scheduled_for,created_at LIMIT 1) RETURNING *`).bind()])
  const raw=results[1].results[0];if(!raw)return done(null)
  const row=decoded('x_content_queue',raw),skill=(await db.prepare('SELECT * FROM skills WHERE id=? OR slug=? ORDER BY CASE WHEN id=? THEN 0 ELSE 1 END LIMIT 1').bind(row.skill_id,row.skill_slug,row.skill_id).all()).results[0]
  return done({...pick(row,['id','skill_id','skill_slug','content_type','campaign','status','priority','post_text','reply_text','attempts','metadata']),skill:skill?pick(decoded('skills',skill),skillKeys):null})
 }
 if(name==='complete_x_content_queue_item'||name==='complete_auto_creator_x_reply_draft'){
  const reply=name==='complete_auto_creator_x_reply_draft',table=reply?'x_reply_drafts':'x_content_queue',id=encodeD1Value(a[reply?'p_draft_id':'p_item_id'],'uuid'),metadata=JSON.stringify(record(a.p_metadata??{})),status=text(a.p_status)
  if(reply&&!['posted','error','skipped'].includes(String(status)))throw new Error('invalid_completion')
  const result=await db.prepare(`UPDATE ${table} SET status=?,x_post_id=coalesce(?,x_post_id),posted_at=CASE WHEN ?='posted' THEN ${reply?now:`coalesce(posted_at,${now})`} ELSE posted_at END,
   error=?,${reply?'':'locked_at=NULL,'}metadata=${merge},updated_at=${now} WHERE id=? ${reply?"AND json_extract(metadata,'$.outreach_kind')='creator_x_reply'":''} RETURNING id,status,skill_slug,x_post_id`)
   .bind(status,text(a.p_x_post_id),status,text(a.p_error),metadata,metadata,id).all()
  return done(result.results[0]??{status:'missing',id})
 }
 if(name==='get_x_post_metric_targets'){
  const result=await db.prepare(`SELECT x_post_id,queue_item_id,skill_slug,posted_at FROM (SELECT h.* FROM x_post_history h WHERE status='posted' AND x_post_id IS NOT NULL
   AND coalesce(posted_at,created_at)>=${ago('45 days')} AND NOT EXISTS(SELECT 1 FROM x_post_metrics m WHERE m.x_post_id=h.x_post_id AND captured_at>=${ago('12 hours')})
   ORDER BY coalesce(posted_at,created_at) DESC LIMIT ?) ORDER BY posted_at DESC NULLS LAST,created_at DESC`).bind(clamp(a.p_limit,50,100)).all()
  return done(result.results)
 }
 if(name==='record_x_post_metric'){
  const p=record(a.p_metric),row=await insert(db,'x_post_metrics',{x_post_id:p.x_post_id,queue_item_id:p.queue_item_id||null,skill_slug:text(p.skill_slug),captured_at:p.captured_at||new Date().toISOString(),reply_count:p.reply_count??0,repost_count:p.repost_count??0,like_count:p.like_count??0,quote_count:p.quote_count??0,bookmark_count:p.bookmark_count??null,impression_count:p.impression_count??null,raw_metrics:p.raw_metrics??{}})
  return done(pick(row!,['id','x_post_id','captured_at']))
 }
 if(name==='record_x_reply_draft'){
  const p=record(a.p_draft),source=text(p.source_tweet_id),slug=text(p.skill_slug)
  let row:Record<string,unknown>|null=null
  try{row=await insert(db,'x_reply_drafts',{source_tweet_id:source,source_url:text(p.source_url),source_author_username:text(p.source_author_username),source_author_name:text(p.source_author_name),source_text:text(p.source_text),skill_id:p.skill_id||null,skill_slug:slug,draft_text:p.draft_text,status:p.status||'draft',score:p.score??0,reason:text(p.reason),metadata:p.metadata??{}},
   'NOT EXISTS(SELECT 1 FROM x_reply_drafts WHERE source_tweet_id=? AND skill_slug=?)',[source,slug])}
  catch(e){if(!(e instanceof Error&&/UNIQUE constraint failed/.test(e.message)))throw e}
  return done(row?{status:'drafted',...pick(row,['id','source_tweet_id','skill_slug'])}:{status:'skipped',reason:'duplicate_draft',source_tweet_id:source,skill_slug:slug})
 }
 const postedCount=`(SELECT count(*) FROM x_post_history WHERE status='posted' AND coalesce(posted_at,created_at)>=${ago('24 hours')} AND json_extract(metadata,'$.type')='creator_indexed_reply')`
 const activeCount="(SELECT count(*) FROM x_reply_drafts WHERE status='posting' AND json_extract(metadata,'$.outreach_kind')='creator_x_reply')"
 if(name==='claim_auto_creator_x_reply_draft'){
  const limit=clamp(a.p_daily_limit,2,2),results=await db.batch([
   db.prepare(`UPDATE x_reply_drafts SET status='error',error=coalesce(error,'Posting lock expired; check X before retrying'),metadata=json_set(metadata,'$.stale_lock_at',${now},'$.stale_lock_policy','manual_review_required'),updated_at=${now}
    WHERE status='posting' AND coalesce(updated_at,created_at)<${ago('30 minutes')} AND json_extract(metadata,'$.outreach_kind')='creator_x_reply'`).bind(),
   // Count in-flight replies too, so parallel workers cannot exceed the cap.
   db.prepare(`UPDATE x_reply_drafts SET status='posting',error=NULL,metadata=json_set(metadata,'$.locked_at',${now}),updated_at=${now} WHERE id=(SELECT d.id FROM x_reply_drafts d
    WHERE ${postedCount}+${activeCount}<? AND status='draft' AND source_tweet_id IS NOT NULL AND nullif(source_author_username,'') IS NOT NULL
    AND json_extract(metadata,'$.outreach_kind')='creator_x_reply' AND json_extract(metadata,'$.auto_publish') IN (1,'true') AND created_at>=${ago('10 days')}
    AND NOT EXISTS(SELECT 1 FROM x_post_history h WHERE h.status='posted' AND json_extract(h.metadata,'$.type')='creator_indexed_reply' AND json_extract(h.metadata,'$.in_reply_to')=d.source_tweet_id)
    AND NOT EXISTS(SELECT 1 FROM x_reply_drafts other WHERE other.id<>d.id AND other.source_tweet_id=d.source_tweet_id AND other.status IN ('posting','posted') AND json_extract(other.metadata,'$.outreach_kind')='creator_x_reply')
    ORDER BY score DESC,created_at LIMIT 1) RETURNING *`).bind(limit),
   db.prepare(`SELECT ${postedCount}+${activeCount} used`).bind()])
  if(results[1].results[0])return done(pick(decoded('x_reply_drafts',results[1].results[0]),['id','source_tweet_id','source_url','source_author_username','source_author_name','source_text','skill_id','skill_slug','draft_text','score','metadata']))
  return done(Number(results[2].results[0].used)>=limit?{status:'skipped',reason:'creator_reply_daily_cap_reached'}:null)
 }
 if(name==='get_creator_outreach_status'){
  const row=(await db.prepare(`SELECT (SELECT count(*) FROM x_reply_drafts WHERE status='draft' AND json_extract(metadata,'$.outreach_kind')='creator_x_reply') queued,
   ${activeCount} posting,${postedCount} postedLast24Hours,(SELECT count(*) FROM x_reply_drafts WHERE status='error' AND coalesce(updated_at,created_at)>=${ago('24 hours')} AND json_extract(metadata,'$.outreach_kind')='creator_x_reply') errorsLast24Hours,2 dailyLimit`).bind().all()).results[0]
  return done(row)
 }
 return {handled:false}
}
