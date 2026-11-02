'use client'

import { createClient, AuthError, type User } from '@supabase/supabase-js'
import { safeAccountNext } from '@/lib/account-workspace'

type DisplaySession = { user: User }
type AuthEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT'
type Listener = (event: AuthEvent,session: DisplaySession | null) => void
const listeners = new Set<Listener>()
const notify = (event: AuthEvent,user: User | null) => { for (const listener of listeners) listener(event,user ? {user} : null) }
const authError = (status=503) => new AuthError(status===401?'Email or password is incorrect.':'Account service is temporarily unavailable.',status)

async function authRequest(path: string,body?: Record<string,unknown>) {
  const response = await fetch(`/api/auth/${path}`,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})
  if (!response.ok) throw authError(response.status)
  return response.json()
}
async function getUser() {
  try {
    const response = await fetch('/api/account/session',{credentials:'same-origin',cache:'no-store'})
    if (!response.ok) return {data:{user:null},error:authError(response.status)}
    const data = await response.json() as {user:User|null}
    return {data:{user:data.user},error:null}
  } catch { return {data:{user:null},error:authError()} }
}
async function social(provider: string,redirectTo: string | undefined,link: boolean) {
  try {
    if (provider !== 'github') throw authError(400)
    const legacy = new URL(redirectTo || '/auth/callback',window.location.origin)
    if (legacy.origin !== window.location.origin) throw authError(400)
    const complete = new URL('/auth/complete',window.location.origin)
    complete.searchParams.set('next',safeAccountNext(legacy.searchParams.get('next'),'/creator'))
    const result = await authRequest(link?'link-social':'sign-in/social',{provider:'github',callbackURL:complete.toString()})
    const target = new URL(result.url)
    if (target.protocol !== 'https:' || target.hostname !== 'github.com' || target.pathname !== '/login/oauth/authorize') throw authError()
    window.location.assign(target.toString())
    return {data:{provider:'github',url:target.toString()},error:null}
  } catch (error) { return {data:{provider:'github',url:null},error:error instanceof AuthError?error:authError()} }
}

export function createCloudflareBrowserClient() {
  // Only the existing query builder is reused. No Supabase auth token or
  // service key is put in the browser; the session stays in an HttpOnly cookie.
  const queries = createClient('https://d1.internal','local-query-builder',{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},db:{retry:false},
    global:{fetch:async (input,init) => {
      const source = new URL(typeof input==='string'||input instanceof URL?input:input.url)
      const match = /^\/rest\/v1\/(profiles|bookmarks)$/.exec(source.pathname)
      if (!match) return Response.json({message:'Account operation unavailable',code:'42501'},{status:403})
      const headers = new Headers(init?.headers)
      headers.delete('authorization');headers.delete('apikey')
      return fetch(`/api/account/data/${match[1]}${source.search}`,{...init,headers,credentials:'same-origin',cache:'no-store'})
    }},
  })
  return {
    from: queries.from.bind(queries),
    auth: {
      getUser,
      async signInWithPassword(input: {email:string;password:string}) {
        try {
          await authRequest('sign-in/email',input)
          const result = await getUser()
          if (result.error || !result.data.user) throw result.error || authError()
          notify('SIGNED_IN',result.data.user)
          return {data:{user:result.data.user,session:{user:result.data.user}},error:null}
        } catch (error) { return {data:{user:null,session:null},error:error instanceof AuthError?error:authError()} }
      },
      async signUp(input: {email:string;password:string;options?:{emailRedirectTo?:string;data?:Record<string,unknown>}}) {
        try {
          const target = new URL(input.options?.emailRedirectTo || '/auth/login',window.location.origin)
          if (target.origin !== window.location.origin) throw authError(400)
          const login = new URL('/auth/login',window.location.origin)
          login.searchParams.set('next',safeAccountNext(target.searchParams.get('next'),'/creator'))
          await authRequest('sign-up/email',{email:input.email,password:input.password,
            name:String(input.options?.data?.display_name || 'New member').slice(0,80),callbackURL:login.toString()})
          return {data:{user:null,session:null},error:null}
        } catch (error) { return {data:{user:null,session:null},error:error instanceof AuthError?error:authError()} }
      },
      async signOut() {
        try { await authRequest('sign-out',{}); notify('SIGNED_OUT',null); return {error:null} }
        catch (error) { return {error:error instanceof AuthError?error:authError()} }
      },
      signInWithOAuth(input: {provider:string;options?:{redirectTo?:string}}) { return social(input.provider,input.options?.redirectTo,false) },
      linkIdentity(input: {provider:string;options?:{redirectTo?:string}}) { return social(input.provider,input.options?.redirectTo,true) },
      onAuthStateChange(callback: Listener) {
        listeners.add(callback)
        void getUser().then(result=>{if(listeners.has(callback))callback('INITIAL_SESSION',result.data.user?{user:result.data.user}:null)})
        return {data:{subscription:{unsubscribe(){listeners.delete(callback)}}}}
      },
    },
  }
}
