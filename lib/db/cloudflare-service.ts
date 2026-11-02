import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { compileRead, createD1ReadFetch, type ReadDatabase } from './cloudflare-read'
import { createD1OrderTransactions, type CommerceDatabase } from '@/lib/payments/cloudflare-orders'
import schema from './cloudflare-schema.json'

type Database = ReadDatabase & CommerceDatabase
const service = {userId:null,service:true} as const
const writable: Record<string,string[]> = {
  commerce_customers:['user_id','livemode'],commerce_orders:['id'],commerce_subscriptions:['stripe_subscription_id'],
  commerce_webhook_events:['id'],commerce_releases:['id'],showcase_entries:['slug'],
}
const fields=schema as Record<string,Record<string,string>>
const quoted=(name:string)=>{if(!/^[a-z_][a-z0-9_]*$/.test(name))throw new Error('invalid_identifier');return `"${name}"`}
const headers={'Cache-Control':'private, no-store'}
const failure=(status=503,code='D1_SERVICE_UNAVAILABLE')=>Response.json({code,message:'Database operation unavailable',details:null,hint:null},{status,headers})
function encode(value:unknown,type:string) {
  if(value===null)return null
  if(type==='bool'){if(typeof value!=='boolean')throw new Error('invalid_boolean');return Number(value)}
  if(['int2','int4','int8','numeric'].includes(type)){
    if(typeof value!=='number'||!Number.isFinite(value)||(type!=='numeric'&&!Number.isSafeInteger(value))
      ||(type==='int2'&&(value< -32768||value>32767))||(type==='int4'&&(value< -2147483648||value>2147483647)))throw new Error('invalid_number')
    return value
  }
  if(type==='jsonb'||type==='_text'){
    if(type==='_text'&&(!Array.isArray(value)||value.some(v=>typeof v!=='string')))throw new Error('invalid_array')
    return JSON.stringify(value)
  }
  if(typeof value!=='string'||value.includes('\0'))throw new Error('invalid_text')
  if(type==='uuid'&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))throw new Error('invalid_id')
  if(type==='timestamptz'){
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(value)||!Number.isFinite(new Date(value).getTime()))throw new Error('invalid_date')
    return value.replace(/(?:\.(\d+))?Z$/,(_,digits='')=>`.${digits.padEnd(6,'0')}Z`)
  }
  return value
}
function decode(row:Record<string,unknown>,types:Record<string,string>) {
  return Object.fromEntries(Object.entries(row).map(([k,v])=>[k,v===null?null:types[k]==='bool'?v===1:['jsonb','_text'].includes(types[k])?JSON.parse(String(v)):v]))
}

/** Only the server's authenticated business services receive this transport.
 * Its privilege is never selectable by a browser or generic HTTP endpoint. */
export function createD1ServiceFetch(db: Database): typeof fetch {
  const read=createD1ReadFetch(db,service),orders=createD1OrderTransactions(db)
  return async(input,init)=>{
    try{
      init?.signal?.throwIfAborted()
      const url=new URL(typeof input==='string'||input instanceof URL?input:input.url)
      const method=init?.method||(input instanceof Request?input.method:'GET')
      const requestHeaders=new Headers(init?.headers||(input instanceof Request?input.headers:undefined))
      const body=typeof init?.body==='string'?JSON.parse(init.body):undefined
      const path=/^\/rest\/v1\/(rpc\/)?([a-z_]+)$/.exec(url.pathname)
      if(!path)return failure(404)
      const name=path[2]
      if(path[1]){
        if(name.startsWith('commerce_')){
          if(method!=='POST')return failure(405)
          const result=await orders.rpc(name,body||{})
          return result.error?failure():Response.json(result.data,{headers})
        }
        if(['skill_vote_counts','showcase_vote_counts','provider_skill_vote_counts'].includes(name)){
          const showcase=name==='showcase_vote_counts',provider=name==='provider_skill_vote_counts'
          const slugs=body?.[showcase?'case_slugs':'skill_slugs']
          if(method!=='POST'||!Array.isArray(slugs)||slugs.length>64||slugs.some(s=>typeof s!=='string'||s.length>200))return failure(400)
          const catalog=showcase?'showcase_entries':provider?'provider_skill_catalog':'skills'
          const votes=showcase?'showcase_votes':provider?'provider_skill_engagement':'skill_votes',key=showcase?'case_slug':'skill_slug'
          const result=await db.prepare(`SELECT s.slug AS ${key},coalesce(sum(v.vote=1),0) AS likes,coalesce(sum(v.vote=-1),0) AS dislikes
            FROM ${catalog} s LEFT JOIN ${votes} v ON v.${key}=s.slug WHERE s.slug IN (SELECT value FROM json_each(?))
            ${catalog==='skills'?"AND (s.ai_review_approved=1 OR s.listing_status IN ('owner_published','static_checked'))":''} GROUP BY s.slug`).bind(JSON.stringify(slugs)).all()
          return Response.json(result.results,{headers})
        }
        return read(input,init)
      }
      if(['GET','HEAD'].includes(method))return read(input,init)
      if(!Object.hasOwn(writable,name)||!['POST','PATCH','DELETE'].includes(method))return failure(403,'42501')
      const types=fields[name],query=new URL(url),primary=writable[name]
      for(const key of ['on_conflict','columns'])query.searchParams.delete(key)
      const plan=compileRead({url:query,method:'GET',headers:requestHeaders},service)
      const representation=(requestHeaders.get('prefer')||'').includes('return=representation')
      const projection=query.searchParams.get('select')||'*'
      if(projection!=='*'&&projection.split(',').some(k=>!Object.hasOwn(types,k)))return failure(400)
      const returning=representation?` RETURNING ${projection==='*'?'*':projection.split(',').map(quoted).join(',')}`:''
      const statements=[]
      if(method==='POST'){
        const rows=Array.isArray(body)?body:[body]
        if(!rows.length||rows.length>100)return failure(400)
        const prefer=requestHeaders.get('prefer')||'',upsert=/resolution=(merge|ignore)-duplicates/.test(prefer)
        const conflict=(url.searchParams.get('on_conflict')||primary.join(',')).split(',')
        if(conflict.some(k=>!Object.hasOwn(types,k)))return failure(400)
        for(const row of rows){
          if(!row||typeof row!=='object'||Array.isArray(row))return failure(400)
          const keys=Object.keys(row)
          if(!keys.length||keys.length>95||keys.some(k=>!Object.hasOwn(types,k)))return failure(400)
          const values=keys.map(k=>encode(row[k],types[k]))
          const update=keys.filter(k=>!conflict.includes(k)).map(k=>`${quoted(k)}=excluded.${quoted(k)}`)
          const resolution=prefer.includes('resolution=ignore-duplicates')||!update.length?'DO NOTHING':`DO UPDATE SET ${update.join(',')}`
          statements.push(db.prepare(`INSERT INTO ${quoted(name)}(${keys.map(quoted).join(',')}) VALUES (${keys.map(()=>'?').join(',')})${upsert?` ON CONFLICT(${conflict.map(quoted).join(',')}) ${resolution}`:''}${returning}`).bind(...values))
        }
      }else{
        if(['order','limit','offset'].some(k=>query.searchParams.has(k)))return failure(400)
        if(![...query.searchParams.keys()].some(k=>!['select','order','limit','offset'].includes(k)))return failure(400)
        if(method==='DELETE')statements.push(db.prepare(`DELETE FROM ${quoted(name)} AS t WHERE ${plan.where}${returning}`).bind(...plan.params))
        else{
          if(!body||Array.isArray(body)||typeof body!=='object')return failure(400)
          const keys=Object.keys(body)
          if(!keys.length||keys.some(k=>!Object.hasOwn(types,k)||primary.includes(k))||keys.length+plan.params.length>95)return failure(400)
          statements.push(db.prepare(`UPDATE ${quoted(name)} AS t SET ${keys.map(k=>`${quoted(k)}=?`).join(',')} WHERE ${plan.where}${returning}`).bind(...keys.map(k=>encode(body[k],types[k])),...plan.params))
        }
      }
      const results=await db.batch(statements)
      const rows=results.flatMap(r=>r.results||[]).map(row=>decode(row,types))
      if(plan.singular&&rows.length!==1)return failure(406,'PGRST116')
      return representation?Response.json(plan.singular?rows[0]:rows,{status:method==='POST'?201:200,headers}):new Response(null,{status:method==='POST'?201:204,headers})
    }catch{return failure()}
  }
}

export function createCloudflareServiceClient() {
  const env=getCloudflareContext().env as {APP_DB?:Database}
  if(!env.APP_DB)throw new Error('D1 application binding unavailable')
  return createClient('https://d1.internal','server-query-builder',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    db:{retry:false},global:{fetch:createD1ServiceFetch(env.APP_DB)}})
}
