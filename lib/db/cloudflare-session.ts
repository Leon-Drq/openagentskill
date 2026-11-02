import 'server-only'
import { headers } from 'next/headers'
import { createClient, AuthSessionMissingError } from '@supabase/supabase-js'
import { readCloudflareUser } from '@/lib/auth/cloudflare-session'
import type { AuthEnvironment } from '@/lib/auth/cloudflare-handler'
import { type ReadDatabase } from './cloudflare-read'
import { createD1UserFetch } from './cloudflare-user-write'

export async function createCloudflareSessionClient() {
  const { getCloudflareContext } = await import('@opennextjs/cloudflare')
  const env = getCloudflareContext().env as AuthEnvironment & { APP_DB?: ReadDatabase }
  if (!env.APP_DB) throw new Error('D1 application binding unavailable')
  const user = await readCloudflareUser(new Headers(await headers()), env)
  const client = createClient('https://d1.internal','local-query-builder',{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},db:{retry:false},
    global:{fetch:createD1UserFetch(env.APP_DB,user?.id || null)},
  })
  client.auth.getUser = async () => user ? { data:{user}, error:null }
    : { data:{user:null}, error:new AuthSessionMissingError() }
  return client
}
