import 'server-only'
import { readCloudflareUser } from './cloudflare-session'
import type { AuthEnvironment } from './cloudflare-handler'
import { createD1ReadFetch } from '@/lib/db/cloudflare-read'

const privateHeaders = { 'Cache-Control':'private, no-store', Vary:'Cookie' }
const reply = (body: unknown,status=200) => Response.json(body,{status,headers:privateHeaders})

/** Narrow first-party account endpoint for existing browser widgets. This is
 * not an arbitrary table proxy: the only reads are one's profile/bookmarks and
 * the only mutation here is setting/removing one's bookmark of a public Skill.
 */
export async function cloudflareAccountData(request: Request, table: string, env: AuthEnvironment) {
  try {
    if (!['profiles','bookmarks'].includes(table)) return reply({error:'not_found'},404)
    if (!env.AUTH_ORIGIN || new URL(request.url).origin !== env.AUTH_ORIGIN) return reply({error:'unavailable'},503)
    if (!['GET','HEAD','POST','DELETE'].includes(request.method)) return reply({error:'method_not_allowed'},405)
    if (!['GET','HEAD'].includes(request.method) && request.headers.get('origin') !== env.AUTH_ORIGIN) return reply({error:'invalid_origin'},403)
    const user = await readCloudflareUser(request.headers,env)
    if (!user) return reply({error:'sign_in_required'},401)
    const query = new URL(request.url).searchParams
    if (['GET','HEAD'].includes(request.method)) {
      const url = new URL(`https://d1.internal/rest/v1/${table}`)
      url.search = query.toString()
      // Profile fields exposed here are only those consumed by the browser's
      // account widget. Public creator pages use their separate public reader.
      if (table === 'profiles') {
        if (query.get('select') !== 'username') return reply({error:'invalid_selection'},400)
        url.searchParams.append('id',`eq.${user.id}`)
      }
      const response = await createD1ReadFetch(env.APP_DB!,{userId:user.id})(url,{method:request.method,headers:request.headers,signal:request.signal})
      response.headers.set('Vary','Cookie')
      return response
    }
    if (table !== 'bookmarks') return reply({error:'method_not_allowed'},405)
    let slug: string
    if (request.method === 'POST') {
      if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({error:'invalid_body'},415)
      const text = await request.text()
      if (text.length > 2048) return reply({error:'invalid_body'},413)
      const body = JSON.parse(text)
      if (!body || Array.isArray(body) || Object.keys(body).some(k=>!['user_id','skill_slug'].includes(k)) || body.user_id !== user.id) return reply({error:'forbidden'},403)
      slug = body.skill_slug
    } else {
      const raw = query.get('skill_slug')
      if (!raw?.startsWith('eq.') || (query.has('user_id') && query.get('user_id') !== `eq.${user.id}`)
        || [...query.keys()].some(k=>!['user_id','skill_slug'].includes(k))) return reply({error:'invalid_selection'},400)
      slug = raw.slice(3)
    }
    if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,199}$/.test(slug)) return reply({error:'invalid_skill'},400)
    if (request.method === 'DELETE') await env.APP_DB!.prepare('DELETE FROM bookmarks WHERE user_id=? AND skill_slug=?').bind(user.id,slug).all()
    else {
      const result = await env.APP_DB!.prepare(`INSERT INTO bookmarks(user_id,skill_slug)
        SELECT ?,slug FROM skills WHERE slug=? AND (ai_review_approved=1 OR listing_status IN ('owner_published','static_checked'))
        ON CONFLICT(user_id,skill_slug) DO NOTHING`).bind(user.id,slug).all()
      if (!result.meta.changes) {
        const existing = await env.APP_DB!.prepare('SELECT 1 AS present FROM bookmarks WHERE user_id=? AND skill_slug=?').bind(user.id,slug).all()
        if (!existing.results.length) return reply({error:'skill_unavailable'},404)
      }
    }
    return new Response(null,{status:204,headers:privateHeaders})
  } catch { return reply({error:'account_temporarily_unavailable'},503) }
}

export async function cloudflareAccountSession(request: Request,env: AuthEnvironment) {
  try {
    if (request.method !== 'GET') return reply({error:'method_not_allowed'},405)
    if (new URL(request.url).origin !== env.AUTH_ORIGIN) return reply({error:'unavailable'},503)
    const headers = new Headers(privateHeaders)
    const user = await readCloudflareUser(request.headers,env,headers)
    return Response.json({user},{headers})
  } catch { return reply({error:'account_temporarily_unavailable'},503) }
}
