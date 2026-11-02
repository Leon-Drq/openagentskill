import 'server-only'
import { createD1ReadFetch, type ReadDatabase } from './cloudflare-read'
import { publicWebsite } from '@/lib/creator-profile'

const published = "(ai_review_approved=1 OR listing_status IN ('owner_published','static_checked'))"
const now = "(strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z')"
const slugOk = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,199}$/.test(v)
const error = (status=403,code='42501') => Response.json({code,message:'Account operation unavailable',details:null,hint:null},{status,headers:{'Cache-Control':'private, no-store'}})
const success = () => new Response(null,{status:204,headers:{'Cache-Control':'private, no-store'}})

/** Private session transport. The principal comes from a verified cookie, and
 * every write is independently restricted to that user. No service privilege. */
export function createD1UserFetch(db: ReadDatabase,userId: string|null): typeof fetch {
  const read = createD1ReadFetch(db,{userId})
  return async (input,init) => {
    const url=new URL(typeof input==='string'||input instanceof URL?input:input.url)
    const method=init?.method||(input instanceof Request?input.method:'GET')
    if (['GET','HEAD'].includes(method)) return read(input,init)
    if (method==='POST' && /^\/rest\/v1\/rpc\/(search_public_skills|lookup_public_skill_name|skill_directory_by_slugs)$/.test(url.pathname)) return read(input,init)
    if (!userId) return error(401)
    try {
      init?.signal?.throwIfAborted()
      const body=typeof init?.body==='string'?JSON.parse(init.body):undefined
      const table=url.pathname.replace('/rest/v1/',''),query=url.searchParams
      if (method==='POST' && table.startsWith('rpc/')) {
        const name=table.slice(4),args=body||{},slug=args.target_slug
        if (!slugOk(slug)) return error(400)
        if (['set_skill_vote','set_showcase_vote'].includes(name)) {
          if (Object.keys(args).some(k=>!['target_slug','direction'].includes(k)) || ![null,1,-1].includes(args.direction)) return error(400)
          const voting=name==='set_skill_vote'?'skill_votes':'showcase_votes',column=name==='set_skill_vote'?'skill_slug':'case_slug'
          if (args.direction===null) await db.prepare(`DELETE FROM ${voting} WHERE user_id=? AND ${column}=?`).bind(userId,slug).all()
          else {
            const catalog=name==='set_skill_vote'?'skills':'showcase_entries',condition=name==='set_skill_vote'?` AND ${published}`:''
            const result=await db.prepare(`INSERT INTO ${voting}(user_id,${column},vote) SELECT ?,slug,? FROM ${catalog} WHERE slug=?${condition}
              ON CONFLICT(user_id,${column}) DO UPDATE SET vote=excluded.vote RETURNING user_id`).bind(userId,args.direction,slug).all()
            if (!result.results.length) return error(404)
          }
          return success()
        }
        if (name==='set_provider_skill_engagement') {
          if (Object.keys(args).some(k=>!['target_slug','intent','direction','target_saved'].includes(k)) || !['vote','save'].includes(args.intent)
            || (args.intent==='vote'?![null,1,-1].includes(args.direction):typeof args.target_saved!=='boolean')) return error(400)
          const vote=args.intent==='vote'?args.direction:null,saved=args.intent==='save'?Number(args.target_saved):0
          const result=await db.prepare(`INSERT INTO provider_skill_engagement(user_id,skill_slug,vote,saved)
            SELECT ?,slug,?,? FROM provider_skill_catalog WHERE slug=?
            ON CONFLICT(user_id,skill_slug) DO UPDATE SET ${args.intent==='vote'?'vote=excluded.vote':'saved=excluded.saved'} RETURNING user_id`)
            .bind(userId,vote,saved,slug).all()
          return result.results.length?success():error(404)
        }
        // Public read RPCs remain usable by signed-in users.
        return read(input,init)
      }
      if (table==='profiles' && method==='POST') {
        const allowed=['id','username','display_name','bio','website','github_username','x_username','twitter','updated_at']
        if (!body || Array.isArray(body) || body.id!==userId || Object.keys(body).some(k=>!allowed.includes(k))) return error()
        const limits: Record<string,number>={display_name:80,bio:500,website:300,github_username:39,x_username:15,twitter:300}
        for (const [key,max] of Object.entries(limits)) if (body[key]!==undefined && body[key]!==null && (typeof body[key]!=='string'||body[key].length>max)) return error(400)
        if (body.website && !publicWebsite(body.website)) return error(400)
        if (body.username!==undefined && (typeof body.username!=='string'||!/^[a-z0-9][a-z0-9-]{2,39}$/.test(body.username)||['github','new','settings','edit'].includes(body.username))) return error(400)
        if (body.github_username && !/^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$/.test(body.github_username)) return error(400)
        if (body.x_username && !/^[a-z0-9_]{1,15}$/.test(body.x_username)) return error(400)
        if (body.twitter!==undefined && body.twitter!==(body.x_username?`https://x.com/${body.x_username}`:null)) return error(400)
        const keys=Object.keys(body).filter(k=>k!=='updated_at'),values=keys.map(k=>body[k])
        const updates=keys.filter(k=>k!=='id').map(k=>{
          if(k==='github_username')return 'github_username=CASE WHEN profiles.github_verified_at IS NULL THEN excluded.github_username ELSE profiles.github_username END'
          if(k==='x_username'||k==='twitter')return `${k}=CASE WHEN profiles.x_verified_at IS NULL THEN excluded.${k} ELSE profiles.${k} END`
          return `${k}=excluded.${k}`
        })
        const result=await db.prepare(`INSERT INTO profiles(${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})
          ON CONFLICT(id) DO UPDATE SET ${[...updates,`updated_at=${now}`].join(',')}
          ${keys.includes('username')?'WHERE profiles.username IS NULL OR profiles.username=excluded.username':''} RETURNING id`).bind(...values).all()
        return result.results.length?success():error(409,'HANDLE_LOCKED')
      }
      if (table==='bookmarks' && method==='POST') {
        if (!body || Array.isArray(body) || Object.keys(body).some(k=>!['user_id','skill_slug'].includes(k)) || body.user_id!==userId || !slugOk(body.skill_slug)) return error()
        const results=await db.batch([
          db.prepare(`INSERT INTO bookmarks(user_id,skill_slug) SELECT ?,slug FROM skills WHERE slug=? AND ${published} ON CONFLICT(user_id,skill_slug) DO NOTHING`).bind(userId,body.skill_slug),
          db.prepare('SELECT user_id FROM bookmarks WHERE user_id=? AND skill_slug=?').bind(userId,body.skill_slug),
        ])
        return results[1].results.length?success():error(404)
      }
      if ((table==='bookmarks'&&method==='DELETE') || (table==='provider_skill_engagement'&&method==='PATCH')) {
        const slug=query.get('skill_slug')?.slice(3)
        if (query.get('user_id')!==`eq.${userId}` || !query.get('skill_slug')?.startsWith('eq.') || !slugOk(slug)
          || [...query.keys()].some(k=>!['user_id','skill_slug'].includes(k))) return error()
        if (table==='bookmarks') await db.prepare('DELETE FROM bookmarks WHERE user_id=? AND skill_slug=?').bind(userId,slug).all()
        else {
          if (!body||Object.keys(body).join(',')!=='saved'||body.saved!==false) return error()
          await db.prepare('UPDATE provider_skill_engagement SET saved=0 WHERE user_id=? AND skill_slug=?').bind(userId,slug).all()
        }
        return success()
      }
      return error()
    } catch (e) {
      if (e instanceof Error && /UNIQUE constraint failed: profiles.username/.test(e.message)) return error(409,'23505')
      return error(503,'D1_ACCOUNT_FAILED')
    }
  }
}
