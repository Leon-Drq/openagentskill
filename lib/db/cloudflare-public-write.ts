import 'server-only'
import {createD1ReadFetch,type ReadDatabase} from './cloudflare-read'
import {recordD1Feedback} from './cloudflare-feedback'
import {secretBackgroundRPCs,executeD1BackgroundRPC,validIndexerSecret} from './cloudflare-background'
import {executeD1IndexerRPC} from './cloudflare-indexer'
import {executeD1XRPC,xRPCs} from './cloudflare-x'

const headers={'Cache-Control':'private, no-store'}
const failure=(status=403,code='42501')=>Response.json({code,message:'Public operation unavailable',details:null,hint:null},{status,headers})
const eventTypes=['view','resolve_request','install_copy','install_start','save','compare','outbound_github','outbound_docs','claim_start','claim_submit','share_copy']

/** Implements only the existing anonymous telemetry policy, alongside public
 * reads. User IDs, server evidence, verification and publication are not writable. */
export function createD1PublicFetch(db:ReadDatabase):typeof fetch {
 const read=createD1ReadFetch(db)
 return async(input,init)=>{
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url)
  const method=init?.method||(input instanceof Request?input.method:'GET')
  const rpc=/^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(url.pathname)?.[1]
  if(method==='POST'&&rpc&&(secretBackgroundRPCs.has(rpc)||xRPCs.has(rpc))){
   try{
    if(typeof init?.body!=='string'||init.body.length>500000)return failure(400)
    const args=JSON.parse(init.body)
    if(!validIndexerSecret(args.p_server_secret))return failure()
    let result=await executeD1BackgroundRPC(db,rpc,args)
    if(!result.handled)result=await executeD1IndexerRPC(db,rpc,args)
    if(!result.handled)result=await executeD1XRPC(db,rpc,args)
    if(!result.handled)return failure(503,'D1_RPC_NOT_MIGRATED')
    return Response.json(result.data,{headers})
   }catch{return failure(503,'D1_BACKGROUND_FAILED')}
  }
  if(method==='POST'&&url.pathname==='/rest/v1/rpc/record_agent_feedback'){
   try{
    if(typeof init?.body!=='string'||init.body.length>20_000)return failure(400)
    return Response.json(await recordD1Feedback(db,JSON.parse(init.body)),{headers})
   }catch{return failure(503,'D1_FEEDBACK_FAILED')}
  }
  if(method!=='POST'||url.pathname!=='/rest/v1/skill_events')return read(input,init)
  try{
   init?.signal?.throwIfAborted()
   if(typeof init?.body!=='string'||init.body.length>20_000)return failure(400)
   const row=JSON.parse(init.body)
   if(!row||Array.isArray(row)||Object.keys(row).some(k=>!['skill_slug','event_type','session_id','path','referrer','metadata','source','is_verified'].includes(k))
     ||typeof row.skill_slug!=='string'||!/^[a-z0-9][a-z0-9-]{0,199}$/.test(row.skill_slug)||!eventTypes.includes(row.event_type)
     ||row.source!=='web'||row.is_verified!==false)return failure()
   for(const [key,max] of [['session_id',200],['path',500],['referrer',500]] as const)if(row[key]!==undefined&&row[key]!==null&&(typeof row[key]!=='string'||row[key].length>max))return failure(400)
   if(!row.metadata||typeof row.metadata!=='object'||Array.isArray(row.metadata))return failure(400)
   const result=await db.prepare(`INSERT INTO skill_events(skill_slug,event_type,session_id,path,referrer,metadata,source,is_verified)
     SELECT slug,?,?,?,?,?,'web',0 FROM skills WHERE slug=? AND (ai_review_approved=1 OR listing_status IN ('owner_published','static_checked')) RETURNING id`)
     .bind(row.event_type,row.session_id??null,row.path??null,row.referrer??null,JSON.stringify(row.metadata),row.skill_slug).all()
   return result.results.length?new Response(null,{status:201,headers}):failure()
  }catch{return failure(503,'D1_PUBLIC_WRITE_FAILED')}
 }
}
