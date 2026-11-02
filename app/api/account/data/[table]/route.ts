import { cloudflareAccountData } from '@/lib/auth/cloudflare-account-api'
import type { AuthEnvironment } from '@/lib/auth/cloudflare-handler'

async function handle(request: Request,{params}: {params:Promise<{table:string}>}) {
  if (process.env.HOSTING_PROVIDER !== 'cloudflare') return Response.json({error:'unavailable'},{status:503,headers:{'Cache-Control':'private, no-store'}})
  const { getCloudflareContext } = await import('@opennextjs/cloudflare')
  return cloudflareAccountData(request,(await params).table,getCloudflareContext().env as AuthEnvironment)
}
export { handle as GET,handle as HEAD,handle as POST,handle as DELETE }
