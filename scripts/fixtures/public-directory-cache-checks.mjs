import assert from 'node:assert/strict'
import { directoryCacheRequest, publicDirectoryResponse, DIRECTORY_READY_MARKER, DIRECTORY_EDGE_TTL } from '../../cloudflare/public-directory-cache.mjs'

export async function checkPublicDirectoryCache({ db, cache, setTag }) {
  const buildId = 'test-' + crypto.randomUUID()
  const env = { PUBLIC_DIRECTORY_EDGE_CACHE: '1', NEXT_TAG_CACHE_D1: db }
  const deferred = []
  const ctx = { waitUntil: promise => deferred.push(promise) }
  const flush = async () => { await Promise.all(deferred.splice(0)) }
  const request = (path = '/skills?q=ppt', init) => new Request('https://www.openagentskill.com' + path, init)
  for (const path of ['/skills?category=design-creative', '/zh/skills?category=design-creative']) {
    const candidate = directoryCacheRequest(request(path, { headers: { host: 'untrusted.test', 'x-forwarded-host': 'untrusted.test', 'x-custom-context': 'private' } }))
    assert.equal(candidate.headers.get('host'), candidate.url.host, 'OpenNext must recognize the category rewrite as internal')
    assert.equal(candidate.headers.get('x-forwarded-host'), null)
    assert.equal(candidate.headers.get('x-custom-context'), null)
    let invoked = false
    const result = await publicDirectoryResponse(request(path), env, ctx, buildId, async input => {
      invoked = true
      assert.equal(input.headers.get('host'), new URL(input.url).host, 'The normalized render request must retain the URL authority')
      return new Response(`<html>${DIRECTORY_READY_MARKER}</html>`, { headers: { 'Content-Type': 'text/html' } })
    }, cache)
    await result.text(); await flush()
    assert.ok(invoked)
    assert.equal(result.status, 200)
  }
  let renders = 0, mode = 'ready', duringRender
  const origin = async input => {
    renders++
    const serial = renders, url = new URL(input.url)
    if (duringRender) await duringRender()
    const body = `<html><head><link rel="canonical" href="https://www.openagentskill.com/skills"/><meta name="robots" content="noindex, follow"/></head><body>${mode === 'ready' ? DIRECTORY_READY_MARKER : ''}<p>${url.pathname}:${url.search}:${serial}</p></body></html>`
    return new Response(body, { status: mode === 'error' ? 503 : mode === 'redirect' ? 307 : 200,
      headers: { 'Content-Type': mode === 'rsc' ? 'text/x-component' : 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store', Vary: mode === 'vary' ? 'X-Personal-Context' : 'RSC, Next-Router-State-Tree, Accept-Encoding',
        ...(mode === 'cookie' ? { 'Set-Cookie': `session=unique-${serial}; HttpOnly` } : {}) } })
  }
  const call = async (req, override = {}) => {
    const res = await publicDirectoryResponse(req, { ...env, ...override }, ctx, buildId, origin, cache)
    const body = await res.text(); await flush(); return { res, body }
  }
  const cold = await call(request())
  assert.equal(cold.res.headers.get('x-oas-directory-cache'), 'MISS')
  const warm = await call(request())
  assert.equal(warm.res.headers.get('x-oas-directory-cache'), 'HIT')
  assert.equal(warm.body, cold.body); assert.equal(renders, 1)
  assert.match(warm.res.headers.get('cache-control'), /private, no-store/)
  assert.match(warm.body, /rel="canonical"/); assert.match(warm.body, /noindex, follow/)
  const head = await call(request('/skills?q=ppt', { method: 'HEAD' }))
  assert.equal(head.body, ''); assert.equal(renders, 1)
  assert.equal(head.res.headers.get('x-oas-directory-cache'), 'HIT')
  for (const [path, init] of [
    ['/skills?q=ppt', { headers: { cookie: 'auth=fixture' } }],
    ['/skills?q=ppt', { headers: { cookie: '__prerender_bypass=fixture' } }],
    ['/skills?q=ppt', { headers: { authorization: 'Bearer fixture' } }],
    ['/skills?q=ppt', { headers: { RSC: '1' } }],
    ['/skills?q=ppt&_rsc=fixture', {}],
    ['/skills?q=ppt', { headers: { 'Next-Router-State-Tree': 'fixture' } }],
    ['/skills?q=ppt', { headers: { 'Next-Router-Prefetch': '1' } }],
    ['/skills?q=ppt', { headers: { 'Next-Action': 'fixture' } }],
    ['/skills?q=ppt', { headers: { 'x-prerender-revalidate': 'fixture' } }],
    ['/skills?q=ppt', { headers: { 'if-none-match': 'fixture' } }],
    ['/skills?q=ppt', { headers: { range: 'bytes=0-10' } }],
    ['/skills?q=ppt', { headers: { 'cache-control': 'no-cache' } }],
    ['/skills?q=ppt', { method: 'POST', body: 'fixture' }],
    ['/skills?q=ppt', { method: 'OPTIONS' }],
    ['/skills?q=ppt&q=private', {}], ['/skills?q=ppt&unknown=x', {}],
    ['/skills?q=ppt&lang=zh', {}], ['/skills?page=50000', {}],
    ['/skills?q=' + 'x'.repeat(181), {}], ['/api/payments/library?q=ppt', {}],
    ['/api/account/session?q=ppt', {}], ['/skills/private?q=ppt', {}],
  ]) {
    const req = request(path, init)
    assert.equal(directoryCacheRequest(req), null, path)
    const before = renders; await call(req); assert.equal(renders, before + 1, path)
  }
  for (const override of [{ STAGING_PRIVATE: '1' }, { MIGRATION_READ_ONLY: '1' }, { SUPABASE_DATA_PAUSED: '1' }, { PUBLIC_DIRECTORY_EDGE_CACHE: '0' }, { NEXT_TAG_CACHE_D1: null }]) {
    const before = renders; await call(request(), override); assert.equal(renders, before + 1)
  }
  for (const path of ['/skills?q=pdf', '/zh/skills?q=ppt', '/ja/skills?q=ppt', '/skills?q=ppt&category=writing']) {
    const a = await call(request(path)); const b = await call(request(path))
    assert.notEqual(a.body, cold.body); assert.equal(a.body, b.body)
    assert.equal(b.res.headers.get('x-oas-directory-cache'), 'HIT')
  }
  const ordered = await call(request('/skills?category=development&q=agent'))
  assert.equal((await call(request('/skills?q=agent&category=development'))).body, ordered.body)
  const language = await call(request('/skills?q=ppt', { headers: { 'accept-language': 'ja' } }))
  assert.notEqual(language.body, cold.body)
  const bot = await call(request('/skills?q=ppt', { headers: { 'user-agent': 'Googlebot' } }))
  assert.notEqual(bot.body, cold.body)

  // Both hard expiration and SWR invalidation change the authoritative key.
  for (const value of [{ revalidatedAt: 10, stale: 10, expire: 10 }, { revalidatedAt: 20, stale: 20, expire: null }]) {
    const before = renders
    await setTag(`${buildId}/public-skill-directory`, value)
    const next = await call(request()); assert.equal(renders, before + 1)
    assert.notEqual(next.body, warm.body)
    assert.equal((await call(request())).body, next.body)
  }
  await setTag(`${buildId}/_N_T_/skills`, { revalidatedAt: 30, stale: 30, expire: 30 })
  assert.equal((await call(request())).res.headers.get('x-oas-directory-cache'), 'MISS')
  const broken = { prepare() { throw new Error('offline') } }
  const beforeFailure = renders
  await call(request(), { NEXT_TAG_CACHE_D1: broken }); assert.equal(renders, beforeFailure + 1)
  const beforeBuild = renders
  await (await publicDirectoryResponse(request(), env, ctx, buildId + '-new', origin, cache)).text(); await flush()
  assert.equal(renders, beforeBuild + 1, 'Deploy must never reuse old HTML/chunk IDs')

  for (const invalid of ['degraded', 'error', 'redirect', 'rsc', 'cookie', 'vary']) {
    mode = invalid; const before = renders
    await call(request('/skills?q=' + invalid)); await call(request('/skills?q=' + invalid))
    assert.equal(renders, before + 2, invalid + ' must not enter shared cache')
  }
  mode = 'ready'
  duringRender = async () => { await setTag(`${buildId}/public-skill-directory`, { revalidatedAt: renders * 100, stale: renders * 100, expire: renders * 100 }) }
  const changing = renders
  await call(request('/skills?q=mid-render')); await call(request('/skills?q=mid-render'))
  assert.equal(renders, changing + 2, 'Invalidation during render must prevent storage')
  duringRender = undefined
  await call(request('/skills?q=expiry'))
  const realNow = Date.now, beforeExpiry = renders
  try {
    const future = Date.now() + DIRECTORY_EDGE_TTL * 1000 + 1
    Date.now = () => future
    await call(request('/skills?q=expiry')); assert.equal(renders, beforeExpiry + 1)
  } finally { Date.now = realNow }
  // Cookies and failures must never be shared by concurrent miss coalescing.
  for (const state of ['ready', 'cookie']) {
    mode = state; let release
    duringRender = () => new Promise(resolve => { release = resolve })
    const first = call(request('/skills?q=concurrent-' + state))
    while (!release) await new Promise(resolve => setTimeout(resolve, 1))
    const second = call(request('/skills?q=concurrent-' + state))
    await new Promise(resolve => setTimeout(resolve, 20))
    duringRender = undefined; release()
    const [a, b] = await Promise.all([first, second])
    if (state === 'ready') assert.equal(a.body, b.body)
    else assert.notEqual(a.res.headers.get('set-cookie'), b.res.headers.get('set-cookie'))
  }
  return { fourHourExpiry: true, invalidation: true, anonymousHtmlOnly: true, privateAndFlightBypass: true, failureIsolation: true, concurrentSafety: true }
}
