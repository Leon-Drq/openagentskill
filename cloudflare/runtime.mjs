// Imported by the custom Worker and by offline regression tests.
export function migrationResponse(request, env) {
  const url = new URL(request.url)
  if (url.hostname === 'openagentskill.com') {
    url.hostname = 'www.openagentskill.com'
    url.protocol = 'https:'
    return Response.redirect(url.toString(), 308)
  }
  if (env.MIGRATION_READ_ONLY !== '1') return null
  // Apply isolation before Next's locale rewrites can reach account handlers.
  const path = url.pathname.replace(/^\/(?:en|zh|ja|ko|es|de|fr|id)(?=\/|$)/, '') || '/'
  if (path === '/robots.txt') {
    return new Response('User-agent: *\nDisallow: /\n', {
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'private, no-store' },
    })
  }
  if (!['GET', 'HEAD'].includes(request.method)
    || /^\/(?:api|auth|profile|creator)(?:\/|$)/.test(path)) {
    return Response.json({ error: 'migration_preview_read_only' }, {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '600', 'X-Robots-Tag': 'noindex, nofollow' },
    })
  }
  return null
}

export function previewHeaders(response, env) {
  if (env.MIGRATION_READ_ONLY !== '1') return response
  const result = new Response(response.body, response)
  result.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return result
}

// Schedules use the existing UTC definitions. A separate activation step enables
// them only after Vercel scheduling has stopped, to retain a single writer.
export async function dispatchScheduled(event, env, schedules) {
  if (env.CRON_ENABLED !== '1' || env.MIGRATION_READ_ONLY === '1') return
  const jobs = schedules.filter(job => job.schedule === event.cron)
  if (!jobs.length) throw new Error('Unknown cron schedule')
  if (!env.CRON_SECRET || !env.WORKER_SELF_REFERENCE) {
    throw new Error('Cron credentials or service binding missing')
  }
  for (const job of jobs) {
    if (!/^\/api\/[a-z0-9/-]+$/.test(job.path)) throw new Error('Invalid cron path')
    // Service binding keeps credentials inside the account. Never follow a
    // redirect carrying Authorization to another destination.
    const response = await env.WORKER_SELF_REFERENCE.fetch(
      new Request(`https://www.openagentskill.com${job.path}`, {
        headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
        redirect: 'manual',
        signal: AbortSignal.timeout(300_000),
      }),
    )
    await response.body?.cancel()
    if (!response.ok) throw new Error(`Cron ${job.path} returned HTTP ${response.status}`)
  }
}
