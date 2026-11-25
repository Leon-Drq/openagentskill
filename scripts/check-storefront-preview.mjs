import assert from 'node:assert/strict'
const base = process.env.BASE_URL || 'http://localhost:3011'
for (const path of ['/marketplace?lang=zh','/marketplace/workflows/studio-portfolio?lang=zh','/marketplace/library?lang=zh','/marketplace/checkout/studio-portfolio?lang=zh','/marketplace/publish?lang=zh']) {
  const r = await fetch(base+path, { signal: AbortSignal.timeout(30000) }), html = await r.text()
  assert.equal(r.status,200,path)
  assert.match(html, /<meta name="robots" content="noindex, nofollow"/)
  assert.match(html, /<h1[\s>]/, 'Public preview content should render on the server')
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
  assert.ok(schemas.every(schema => !JSON.stringify(schema).includes('/marketplace')), 'Sample products must not enter structured data')
  console.log(JSON.stringify({path,status:r.status,robots:'noindex, nofollow',ssrHeading:html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]}))
}
for (const path of ['/marketplace/workflows/not-a-workflow','/marketplace/checkout/research-brief']) {
  const r=await fetch(base+path)
  // Next's streamed notFound may send 200 with a noindex marker in dev.
  const html=await r.text()
  assert.ok(r.status === 404 || (html.includes('NEXT_HTTP_ERROR_FALLBACK;404') && html.includes('noindex')),path)
}
console.log('Preview HTTP checks passed: server content, noindex, no fake Offer markup and invalid route handling.')
