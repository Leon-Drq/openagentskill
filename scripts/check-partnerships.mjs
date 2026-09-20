import assert from 'node:assert/strict'
import { getPartnershipCopy } from '../lib/i18n/partnership-copy.ts'

// Read-only: no emails, analytics submissions, payment requests or paid API calls.
const origin = process.argv[2] || 'http://localhost:3117'
for (const kind of ['contact', 'sponsor']) {
  for (const locale of ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) {
    const path = `/${kind}${locale === 'en' ? '' : `?lang=${locale}`}`
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) })
    assert.equal(response.status, 200, path)
    const html = await response.text()
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `${path}: one H1`)
    const copy = getPartnershipCopy(locale)
    assert.ok(html.includes(kind === 'contact' ? copy.contactTitle : copy.sponsorTitle), `${path}: localized title`)
    assert.ok(html.includes(`rel="canonical" href="https://www.openagentskill.com/${kind}"`), `${path}: canonical`)
    assert.ok(html.includes(`name="robots" content="${locale === 'en' ? 'index' : 'noindex'}, follow"`), `${path}: index policy`)
    assert.ok(html.includes('mailto:qudongqi2023@gmail.com'), `${path}: email`)
    const schema = html.match(/<script id="partnership-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
    assert.ok(schema, `${path}: schema exists`)
    assert.equal(JSON.parse(schema)[0].inLanguage, locale)
    assert.ok(!html.includes('NEXT_HTTP_ERROR_FALLBACK;500'))
    if (kind === 'contact') assert.ok(html.includes('href="https://x.com/openagentskill"'))
    if (kind === 'sponsor') assert.ok(html.includes(copy.independenceCopy))
    console.log(`PASS ${path}: localized SSR, HTTP 200, canonical, robots, JSON-LD and contact actions`)
  }
}
const sitemap = await fetch(new URL('/sitemaps/core.xml', origin)).then(response => response.text())
assert.equal([...sitemap.matchAll(/<loc>https:\/\/www.openagentskill.com\/sponsor<\/loc>/g)].length, 1)
console.log('Contact/sponsor live checks passed; sitemap includes one canonical sponsor URL.')
