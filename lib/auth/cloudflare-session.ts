import 'server-only'
import type { User } from '@supabase/supabase-js'
import { configuredCloudflareAuth, type AuthEnvironment } from './cloudflare-handler'

// Compatibility projection for the existing account/commerce consumers. The
// cookie is verified by Better Auth and the session is read from D1 on every
// request. Caller-provided IDs, JWT metadata and profile claims never authorize
// a session or manufacture a verified provider identity.
export async function readCloudflareUser(headers: Headers, env: AuthEnvironment, responseHeaders?: Headers): Promise<User | null> {
  const auth = configuredCloudflareAuth(env)
  const result = await auth.api.getSession({ headers, query: { disableCookieCache: true }, returnHeaders: true })
  for (const cookie of result.headers.getSetCookie()) responseHeaders?.append('Set-Cookie',cookie)
  const session = result.response
  if (!session) return null
  const user = session.user
  const [accountRows, profileRows] = await env.APP_DB!.batch<Record<string,unknown>>([
    env.APP_DB!.prepare("SELECT id,accountId,providerId FROM auth_accounts WHERE userId=? AND providerId='github'").bind(user.id),
    env.APP_DB!.prepare('SELECT github_user_id,github_username,github_verified_at,avatar_url FROM profiles WHERE id=?').bind(user.id),
  ])
  const provider = accountRows.results[0], profile = profileRows.results[0]
  const github = provider && profile?.github_verified_at && profile.github_username
    && /^\d+$/.test(String(provider.accountId)) && String(profile.github_user_id) === String(provider.accountId)
    ? { id: String(provider.id), identity_id: String(provider.id), user_id: user.id, provider: 'github',
      identity_data: { sub: String(provider.accountId), provider_id: String(provider.accountId), user_name: String(profile.github_username), avatar_url: profile.avatar_url },
      created_at: new Date(user.createdAt).toISOString(), updated_at: new Date(user.updatedAt).toISOString() } : null
  return {
    id: user.id, aud: 'authenticated', role: 'authenticated', email: user.email,
    email_confirmed_at: user.emailVerified ? new Date(user.createdAt).toISOString() : undefined,
    created_at: new Date(user.createdAt).toISOString(), updated_at: new Date(user.updatedAt).toISOString(),
    is_anonymous: false, app_metadata: { provider: github ? 'github' : 'email' },
    user_metadata: { display_name: user.name, avatar_url: user.image || null }, identities: github ? [github] : [],
  }
}
