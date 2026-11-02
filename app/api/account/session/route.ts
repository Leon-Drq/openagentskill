import { cloudflareAccountSession } from '@/lib/auth/cloudflare-account-api'
import type { AuthEnvironment } from '@/lib/auth/cloudflare-handler'

export async function GET(request: Request) {
  if (process.env.HOSTING_PROVIDER !== 'cloudflare') return Response.json({error:'unavailable'},{status:503,headers:{'Cache-Control':'private, no-store'}})
  const { getCloudflareContext } = await import('@opennextjs/cloudflare')
  return cloudflareAccountSession(request,getCloudflareContext().env as AuthEnvironment)
}
