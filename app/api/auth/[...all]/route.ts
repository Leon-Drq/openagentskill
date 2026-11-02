import { cloudflareAuthHandler, type AuthEnvironment } from '@/lib/auth/cloudflare-handler'

async function handle(request: Request) {
  if (process.env.HOSTING_PROVIDER !== 'cloudflare') {
    return cloudflareAuthHandler(request, {})
  }
  const { getCloudflareContext } = await import('@opennextjs/cloudflare')
  return cloudflareAuthHandler(request, getCloudflareContext().env as AuthEnvironment)
}

export const GET = handle
export const POST = handle
