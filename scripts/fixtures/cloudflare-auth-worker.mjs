import { cloudflareAuthHandler } from '../../lib/auth/cloudflare-handler.ts'
import { hashPassword } from 'better-auth/crypto'

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (env.AUTH_TEST_ONLY !== '1' || !['localhost','127.0.0.1'].includes(url.hostname)) {
      return new Response('Unavailable', {status:503})
    }
    if (url.pathname === '/test-seed' && request.method === 'POST') {
      const { legacyHash } = await request.json()
      // The fixture accepts only a synthetic verifier, and creates no external
      // sessions, sends no email and never loads any production credentials.
      if (!/^\$2[aby]\$10\$[./A-Za-z0-9]{53}$/.test(legacyHash)) return new Response(null,{status:400})
      const id = '30000000-0000-4000-8000-000000000001'
      const now = new Date().toISOString()
      await env.APP_DB.batch([
        env.APP_DB.prepare('INSERT INTO auth_users(id,name,email,emailVerified,createdAt,updatedAt) VALUES (?,?,?,1,?,?)')
          .bind(id,'Synthetic native test','native@example.invalid',now,now),
        env.APP_DB.prepare('INSERT INTO auth_accounts(id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES (?,?,?, ?,?,?,?)')
          .bind('40000000-0000-4000-8000-000000000001',id,'credential',id,legacyHash,now,now),
      ])
      return Response.json({seeded:true})
    }
    if (url.pathname === '/test-revoke' && request.method === 'POST') {
      const freshHash = await hashPassword('native-synthetic-password')
      await env.APP_DB.prepare('UPDATE auth_accounts SET password=? WHERE id=?')
        .bind(freshHash,'40000000-0000-4000-8000-000000000001').all()
      return Response.json({revoked:true})
    }
    url.protocol = 'https:'
    url.host = 'www.openagentskill.com'
    url.port = ''
    return cloudflareAuthHandler(new Request(url, request), env)
  },
}
export default worker
