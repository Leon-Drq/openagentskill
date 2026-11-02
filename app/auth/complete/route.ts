import { safeAccountNext } from '@/lib/account-workspace'
import { readCloudflareUser } from '@/lib/auth/cloudflare-session'
import { syncCloudflareGitHubProfile } from '@/lib/auth/cloudflare-github-profile'
import type { AuthEnvironment } from '@/lib/auth/cloudflare-handler'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const next = safeAccountNext(url.searchParams.get('next'),'/creator')
  const destination = new URL(next,url.origin)
  const privateHeaders = {'Cache-Control':'private, no-store',Vary:'Cookie'}
  try {
    if (process.env.HOSTING_PROVIDER!=='cloudflare') return Response.json({error:'unavailable'},{status:503,headers:privateHeaders})
    const {getCloudflareContext}=await import('@opennextjs/cloudflare')
    const env = getCloudflareContext().env as AuthEnvironment & {GITHUB_TOKEN?:string}
    if (url.origin!==env.AUTH_ORIGIN) throw new Error('Invalid origin')
    const user = await readCloudflareUser(request.headers,env)
    if (!user) {
      destination.pathname='/auth/login';destination.search='';destination.searchParams.set('next',next)
    } else {
      const linked = await syncCloudflareGitHubProfile(env.APP_DB!,user.id,env.GITHUB_TOKEN)
      if (linked) destination.searchParams.set('connected','github')
    }
  } catch { destination.searchParams.set('error','identity-update-failed') }
  return new Response(null,{status:303,headers:{...privateHeaders,Location:destination.toString()}})
}
