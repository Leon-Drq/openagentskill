import 'server-only'

import { createCloudflareAuth, type AuthDatabase } from './cloudflare'
import {createCloudflareAuthMailer,type AuthEmailBinding} from './cloudflare-mail'

export interface AuthEnvironment {
  HOSTING_PROVIDER?: string
  MIGRATION_READ_ONLY?: string
  CLOUDFLARE_AUTH_ENABLED?: string
  AUTH_ORIGIN?: string
  BETTER_AUTH_SECRET?: string
  APP_DB?: AuthDatabase
  GITHUB_OAUTH_CLIENT_ID?: string
  GITHUB_OAUTH_CLIENT_SECRET?: string
  AUTH_EMAIL_ENABLED?: string
  AUTH_REGISTRATION_ENABLED?: string
  AUTH_EMAIL?: AuthEmailBinding
}

const instances = new WeakMap<object, ReturnType<typeof createCloudflareAuth>>()
const unavailable = () => Response.json({ error: 'Authentication is temporarily unavailable.' }, {
  status: 503, headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '600' },
})

export function configuredCloudflareAuth(env: AuthEnvironment) {
  if (env.HOSTING_PROVIDER !== 'cloudflare' || env.MIGRATION_READ_ONLY === '1'
    || env.CLOUDFLARE_AUTH_ENABLED !== '1' || !env.APP_DB || !env.AUTH_ORIGIN || !env.BETTER_AUTH_SECRET) {
    throw new Error('Cloudflare authentication is unavailable')
  }
  let auth = instances.get(env)
  if (!auth) {
    auth = createCloudflareAuth({
      database: env.APP_DB, origin: env.AUTH_ORIGIN, secret: env.BETTER_AUTH_SECRET,
      github: env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET
        ? { clientId: env.GITHUB_OAUTH_CLIENT_ID, clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET } : undefined,
      sendMail:env.AUTH_EMAIL_ENABLED==='1'&&env.AUTH_EMAIL?createCloudflareAuthMailer(env.AUTH_EMAIL,env.AUTH_ORIGIN):undefined,
      registrationEnabled:env.AUTH_REGISTRATION_ENABLED==='1',
    })
    instances.set(env, auth)
  }
  return auth
}

export async function cloudflareAuthHandler(request: Request, env: AuthEnvironment) {
  if (env.HOSTING_PROVIDER !== 'cloudflare' || env.MIGRATION_READ_ONLY === '1'
    || env.CLOUDFLARE_AUTH_ENABLED !== '1' || !env.APP_DB || !env.AUTH_ORIGIN || !env.BETTER_AUTH_SECRET) {
    return unavailable()
  }
  // A fixed configured origin controls callbacks/cookies; never trust Host or
  // x-forwarded-host to choose an OAuth redirect or email destination origin.
  if (new URL(request.url).origin !== env.AUTH_ORIGIN) return unavailable()
  try {
    // Registration has its own activation gate and requires a mail binding.
    const auth = configuredCloudflareAuth(env)
    const response = await auth.handler(request)
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  } catch {
    return unavailable()
  }
}
