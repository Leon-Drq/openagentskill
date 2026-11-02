import 'server-only'
import type { AuthDatabase } from './cloudflare'

export async function syncCloudflareGitHubProfile(database: AuthDatabase,userId: string,token?: string,fetcher: typeof fetch = fetch) {
  const accounts = await database.prepare("SELECT accountId FROM auth_accounts WHERE userId=? AND providerId='github'").bind(userId).all<{accountId:string}>()
  const subject = accounts.results[0]?.accountId
  if (!subject || !/^\d+$/.test(subject) || !Number.isSafeInteger(Number(subject))) return false
  // Use the provider's stable ID, never a caller's username or user_metadata.
  const response = await fetcher(`https://api.github.com/user/${subject}`,{
    headers:{Accept:'application/vnd.github+json','User-Agent':'OpenAgentSkill-Account/1.0','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:`Bearer ${token}`}:{})},
    redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),
  })
  if (!response.ok || Number(response.headers.get('content-length') || 0)>100_000) throw new Error('Provider identity unavailable')
  const text = await response.text()
  if (text.length>100_000) throw new Error('Provider identity response exceeded budget')
  const profile = JSON.parse(text)
  if (String(profile.id)!==subject || profile.type!=='User' || typeof profile.login!=='string'
    || !/^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$/i.test(profile.login)) throw new Error('Provider identity mismatch')
  let avatar: string | null = null
  if (typeof profile.avatar_url==='string') {
    const url = new URL(profile.avatar_url)
    if (url.protocol==='https:' && url.hostname==='avatars.githubusercontent.com' && !url.username && !url.password) avatar=url.href
  }
  const now = new Date().toISOString().replace('Z','000Z')
  const result = await database.prepare(`INSERT INTO profiles(id,github_user_id,github_username,github_verified_at,avatar_url,updated_at)
    SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM auth_accounts WHERE userId=? AND providerId='github' AND accountId=?)
    ON CONFLICT(id) DO UPDATE SET github_user_id=excluded.github_user_id,github_username=excluded.github_username,
      github_verified_at=excluded.github_verified_at,avatar_url=coalesce(excluded.avatar_url,profiles.avatar_url),updated_at=excluded.updated_at`)
    .bind(userId,Number(subject),profile.login.toLowerCase(),now,avatar,now,userId,subject).all()
  return result.meta.changes===1
}
