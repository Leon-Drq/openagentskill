import 'server-only'
import { type ReadDatabase } from './cloudflare-read'
import { createD1PublicFetch } from './cloudflare-public-write'

export async function cloudflarePublicFetch(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) {
  const { getCloudflareContext } = await import('@opennextjs/cloudflare')
  const { APP_DB } = getCloudflareContext().env as { APP_DB?: ReadDatabase }
  if (!APP_DB) throw new Error('D1 application binding unavailable')
  return createD1PublicFetch(APP_DB)(input, init)
}
